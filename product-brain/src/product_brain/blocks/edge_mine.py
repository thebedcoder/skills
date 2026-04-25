from __future__ import annotations

import json
import re
import subprocess
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from ..models import Commit, EdgeCaseBullet, PullRequest, TicketRecord


_VERB_PATTERNS = re.compile(
    r"\b(fix(?:es|ed)?|handle[sd]?|guard|edge case|race|deadlock|leak|null|nil|undefined|panic|crash|retry|fallback|timeout|race condition)\b",
    re.IGNORECASE,
)
_TODO_RE = re.compile(r"(?://|#|/\*)\s*TODO[\s\(:]")
_TEST_DEF = re.compile(r"^\s*(?:def|fn|func|it|test)[\s(]+(test_[a-zA-Z0-9_]+|[a-zA-Z0-9_]*Test[a-zA-Z0-9_]*)")


@dataclass
class Signals:
    pr_review_comments: list[dict]
    added_test_names: list[dict]
    commit_verb_lines: list[dict]
    added_code_comments: list[dict]
    pm_description: str
    linked_bug_tickets: list[str]


def gather_signals(
    repo_path: Path,
    commits: list[Commit],
    prs: list[PullRequest],
    pm_description: str,
    linked_bugs: Optional[list[str]] = None,
) -> Signals:
    pr_comments = []
    for pr in prs:
        for c in pr.review_comments:
            pr_comments.append({
                "author": c.author, "body": c.body, "file": c.file, "line": c.line, "pr": pr.number,
            })

    test_names: list[dict] = []
    for c in commits:
        for f in c.files:
            if f.change != "added":
                continue
            if not _looks_like_test(f.path):
                continue
            for line in _read_blob_at(repo_path, c.sha, f.path).splitlines():
                m = _TEST_DEF.match(line)
                if m:
                    test_names.append({"name": m.group(1), "file": f.path, "sha": c.sha})

    verb_lines = []
    for c in commits:
        text = c.subject + "\n" + (c.body or "")
        for line in text.splitlines():
            if _VERB_PATTERNS.search(line):
                verb_lines.append({"line": line.strip(), "sha": c.sha})

    code_comments = _scan_diff_comments(repo_path, commits)

    return Signals(
        pr_review_comments=pr_comments,
        added_test_names=test_names,
        commit_verb_lines=verb_lines,
        added_code_comments=code_comments,
        pm_description=pm_description or "",
        linked_bug_tickets=linked_bugs or [],
    )


def _looks_like_test(path: str) -> bool:
    p = path.lower()
    return ("test_" in p or "_test." in p or p.startswith("test/") or "/test/" in p
            or "/tests/" in p or ".test." in p or ".spec." in p)


def _read_blob_at(repo: Path, sha: str, path: str) -> str:
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), "show", f"{sha}:{path}"],
            capture_output=True, text=True, check=True, errors="replace",
        )
        return r.stdout
    except subprocess.CalledProcessError:
        return ""


def _scan_diff_comments(repo: Path, commits: list[Commit]) -> list[dict]:
    out = []
    for c in commits:
        try:
            r = subprocess.run(
                ["git", "-C", str(repo), "show", "--unified=0", "--no-color", c.sha],
                capture_output=True, text=True, check=True, errors="replace",
            )
        except subprocess.CalledProcessError:
            continue
        cur_file = None
        for line in r.stdout.splitlines():
            if line.startswith("+++"):
                cur_file = line[6:].strip() if line.startswith("+++ b/") else line[4:].strip()
            elif line.startswith("+") and not line.startswith("+++"):
                t = line[1:].lstrip()
                if t.startswith(("//", "#", "/*")) and "TODO" not in t.upper() and len(t) > 8:
                    out.append({"text": t[:240], "file": cur_file or "", "sha": c.sha})
                elif _TODO_RE.search(t):
                    out.append({"text": t[:240], "file": cur_file or "", "sha": c.sha, "kind": "todo"})
    return out


_EXTRACT_PROMPT = """You extract edge cases that were considered or handled in this ticket.

Use ONLY the SIGNALS below. For each edge case:
  - Quote or closely paraphrase from a signal.
  - Cite the source EXACTLY as one of: "pr#N review @user", "test_name", "commit <sha7>", or "<path>:<line> TODO".
  - If signals don't support N bullets, return fewer (or zero).
  - DO NOT extrapolate from the feature description.

Output STRICT JSON, no commentary:
{
  "what_shipped": "one paragraph from PR/commits, no invention",
  "key_decisions": ["..."],
  "edge_cases_handled": [{"text": "...", "source": "..."}],
  "known_gaps": [{"text": "...", "source": "..."}]
}

SIGNALS:
%(signals)s
"""


def extract_with_llm(signals: Signals, llm_call) -> dict:
    payload = {
        "pr_review_comments": signals.pr_review_comments[:50],
        "added_test_names": signals.added_test_names[:50],
        "commit_verb_lines": signals.commit_verb_lines[:50],
        "added_code_comments": signals.added_code_comments[:50],
        "pm_description": signals.pm_description[:2000],
        "linked_bug_tickets": signals.linked_bug_tickets,
    }
    prompt = _EXTRACT_PROMPT % {"signals": json.dumps(payload, indent=2)}
    raw = llm_call(prompt)
    try:
        return json.loads(_first_json_object(raw))
    except (ValueError, json.JSONDecodeError):
        return {"what_shipped": "", "key_decisions": [], "edge_cases_handled": [], "known_gaps": []}


def _first_json_object(s: str) -> str:
    start = s.find("{")
    if start == -1:
        return "{}"
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return s[start:]


def validate_citations(
    bullets: list[EdgeCaseBullet],
    repo_path: Path,
    pr_numbers_seen: set[int],
) -> tuple[list[EdgeCaseBullet], int]:
    kept: list[EdgeCaseBullet] = []
    dropped = 0
    for b in bullets:
        if _validate_one(b.source, repo_path, pr_numbers_seen):
            kept.append(b)
        else:
            dropped += 1
    return kept, dropped


def _validate_one(source: str, repo: Path, pr_numbers: set[int]) -> bool:
    s = source.strip()
    m = re.match(r"pr#(\d+)", s)
    if m:
        return int(m.group(1)) in pr_numbers
    m = re.match(r"commit ([0-9a-f]{7,40})", s)
    if m:
        try:
            subprocess.run(["git", "-C", str(repo), "cat-file", "-e", m.group(1)],
                           check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False
    if s.startswith("test_") or "::" in s:
        name = s.split("::")[-1]
        try:
            r = subprocess.run(
                ["git", "-C", str(repo), "grep", "-l", name],
                capture_output=True, text=True, check=False,
            )
            return bool(r.stdout.strip())
        except FileNotFoundError:
            return False
    m = re.match(r"(.+?):(\d+)\s+TODO", s)
    if m:
        path = repo / m.group(1)
        return path.exists()
    return False


def mine_per_ticket(
    repo_path: Path,
    commits: list[Commit],
    prs: list[PullRequest],
    pm_description: str,
    llm_call,
    linked_bugs: Optional[list[str]] = None,
) -> tuple[dict, int]:
    signals = gather_signals(repo_path, commits, prs, pm_description, linked_bugs)
    extracted = extract_with_llm(signals, llm_call)

    pr_numbers = {pr.number for pr in prs}
    raw_edges = [EdgeCaseBullet(text=e["text"], source=e["source"])
                 for e in extracted.get("edge_cases_handled", []) if e.get("source")]
    raw_gaps = [EdgeCaseBullet(text=e["text"], source=e["source"])
                for e in extracted.get("known_gaps", []) if e.get("source")]
    edges, dropped_e = validate_citations(raw_edges, repo_path, pr_numbers)
    gaps, dropped_g = validate_citations(raw_gaps, repo_path, pr_numbers)

    return {
        "what_shipped": extracted.get("what_shipped", ""),
        "key_decisions": extracted.get("key_decisions", []),
        "edge_cases_handled": edges,
        "known_gaps": gaps,
    }, (dropped_e + dropped_g)


def dedup_edge_cases(records: list[TicketRecord], llm_call=None) -> list[dict]:
    """Cluster bullets across related records.

    Without LLM: groups by token-set Jaccard similarity.
    With LLM: optional pass to produce themed labels.
    """
    bullets: list[tuple[EdgeCaseBullet, str]] = []
    for r in records:
        for b in r.edge_cases_handled:
            bullets.append((b, r.ticket))

    groups: list[list[tuple[EdgeCaseBullet, str]]] = []
    for entry in bullets:
        b, _ = entry
        toks = _normalize_tokens(b.text)
        placed = False
        for grp in groups:
            ref_toks = _normalize_tokens(grp[0][0].text)
            if _token_jaccard(toks, ref_toks) >= 0.45:
                grp.append(entry)
                placed = True
                break
        if not placed:
            groups.append([entry])

    out = []
    for grp in groups:
        tickets = sorted({tid for _, tid in grp})
        rep = grp[0][0]
        out.append({
            "text": rep.text,
            "frequency": f"{len(tickets)}/{len(records)} records",
            "tickets": tickets,
            "sources": [b.source for b, _ in grp],
        })
    out.sort(key=lambda d: -len(d["tickets"]))
    return out


def _normalize_tokens(s: str) -> set[str]:
    return {t.lower() for t in re.findall(r"[a-zA-Z]{4,}", s)}


def _token_jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    return len(a & b) / max(len(a | b), 1)
