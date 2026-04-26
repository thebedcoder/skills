from __future__ import annotations

import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx

from ..models import Commit, PRComment, PullRequest


_PR_PAREN_RE = re.compile(r"\(#(\d+)\)")


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _git_remote_repo(repo_path: Path) -> Optional[tuple[str, str]]:
    try:
        r = subprocess.run(["git", "-C", str(repo_path), "remote", "get-url", "origin"],
                           capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError:
        return None
    url = r.stdout.strip()
    m = re.search(r"[:/]([^/:]+)/([^/]+?)(?:\.git)?$", url)
    if not m:
        return None
    return m.group(1), m.group(2)


def _pr_numbers_from_commits(commits: list[Commit], ticket_id: str) -> list[int]:
    nums = set()
    for c in commits:
        for m in _PR_PAREN_RE.finditer(c.subject + "\n" + (c.body or "")):
            nums.add(int(m.group(1)))
    return sorted(nums)


def enrich(
    repo_path: Path,
    ticket_id: str,
    commits: list[Commit],
    github_token: Optional[str],
    enabled: bool = True,
) -> list[PullRequest]:
    if not enabled or not github_token:
        return []
    remote = _git_remote_repo(repo_path)
    if not remote:
        return []
    owner, repo = remote
    pr_numbers = _pr_numbers_from_commits(commits, ticket_id)

    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
    }

    out: list[PullRequest] = []
    with httpx.Client(headers=headers, timeout=30) as client:
        if not pr_numbers:
            r = client.get(
                f"https://api.github.com/search/issues",
                params={"q": f"repo:{owner}/{repo} is:pr is:merged {ticket_id}"},
            )
            if r.status_code == 200:
                pr_numbers = sorted({i["number"] for i in r.json().get("items", [])})

        for num in pr_numbers:
            pr_resp = client.get(f"https://api.github.com/repos/{owner}/{repo}/pulls/{num}")
            if pr_resp.status_code != 200:
                continue
            data = pr_resp.json()
            comments_resp = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/pulls/{num}/comments",
                params={"per_page": 100},
            )
            review_comments: list[PRComment] = []
            if comments_resp.status_code == 200:
                for c in comments_resp.json():
                    review_comments.append(PRComment(
                        author=c.get("user", {}).get("login", ""),
                        body=c.get("body", ""),
                        file=c.get("path"),
                        line=c.get("line"),
                        sha=c.get("commit_id"),
                    ))
            out.append(PullRequest(
                number=num,
                title=data.get("title", ""),
                body=data.get("body", "") or "",
                labels=[lbl.get("name", "") for lbl in data.get("labels", [])],
                opened_at=_parse_dt(data.get("created_at")),
                merged_at=_parse_dt(data.get("merged_at")),
                review_comments=review_comments,
            ))
    return out
