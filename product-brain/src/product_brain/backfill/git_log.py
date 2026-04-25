from __future__ import annotations

import re
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..models import Commit, FileChange


_RECORD_SEP = "\x1e\x1e\x1e"
_FIELD_SEP = "\x1f"


def _git_log_cmd(repo: Path, workflow: str, since: Optional[str] = None) -> list[str]:
    cmd = ["git", "-C", str(repo), "log", "--all"]
    if workflow == "merge" or workflow == "rebase":
        cmd.append("--no-merges")
    cmd += [
        f"--pretty=format:{_RECORD_SEP}%H{_FIELD_SEP}%an{_FIELD_SEP}%ae{_FIELD_SEP}%aI{_FIELD_SEP}%P{_FIELD_SEP}%s{_FIELD_SEP}%b",
        "--name-status",
        "--find-renames=50%",
    ]
    if since:
        cmd.append(f"{since}..HEAD")
    return cmd


def parse_git_log(repo: Path, ticket_regex: str, workflow: str = "squash", since: Optional[str] = None) -> list[Commit]:
    res = subprocess.run(_git_log_cmd(repo, workflow, since), capture_output=True, text=True, errors="replace")
    if res.returncode != 0:
        raise RuntimeError(f"git log failed: {res.stderr}")
    pat = re.compile(ticket_regex)

    commits: list[Commit] = []
    chunks = res.stdout.split(_RECORD_SEP)
    for chunk in chunks:
        chunk = chunk.strip("\n")
        if not chunk:
            continue
        first_line, _, rest = chunk.partition("\n")
        fields = first_line.split(_FIELD_SEP)
        if len(fields) < 7:
            continue
        sha, author, email, date_iso, parents_str, subject, body = fields[:7]
        date = datetime.fromisoformat(date_iso)
        parents = parents_str.split() if parents_str else []
        files: list[FileChange] = []
        for line in rest.strip("\n").splitlines():
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            code = parts[0]
            if code == "A":
                files.append(FileChange(path=parts[1], change="added"))
            elif code == "M":
                files.append(FileChange(path=parts[1], change="modified"))
            elif code == "D":
                files.append(FileChange(path=parts[1], change="deleted"))
            elif code.startswith("R") and len(parts) >= 3:
                files.append(FileChange(path=parts[2], change="renamed"))
        text = subject + "\n" + (body or "")
        tickets = sorted(set(pat.findall(text)))
        commits.append(Commit(
            sha=sha, author=author, author_email=email, date=date,
            subject=subject, body=body, parents=parents, files=files, tickets=tickets,
        ))
    return commits


def group_by_ticket(commits: list[Commit]) -> dict[str, list[Commit]]:
    out: dict[str, list[Commit]] = defaultdict(list)
    for c in commits:
        for t in c.tickets:
            out[t].append(c)
    for t in out:
        out[t].sort(key=lambda c: c.date)
    return out


def diff_stat(repo: Path, sha: str) -> dict[str, tuple[int, int]]:
    """Return {path: (added, removed)} for one commit. Used to fill loc fields."""
    res = subprocess.run(
        ["git", "-C", str(repo), "show", "--numstat", "--pretty=", sha],
        capture_output=True, text=True, errors="replace",
    )
    out: dict[str, tuple[int, int]] = {}
    for line in res.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) >= 3:
            try:
                added = int(parts[0]) if parts[0].isdigit() else 0
                removed = int(parts[1]) if parts[1].isdigit() else 0
                out[parts[2]] = (added, removed)
            except ValueError:
                continue
    return out
