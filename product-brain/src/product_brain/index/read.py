from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import yaml

from ..models import EdgeCaseBullet, FileChange, Manifest, TicketRecord


_FRONT_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
_MANUAL_SENTINEL = "<!-- manual: do not overwrite below this line -->"


def _split_front_matter(text: str) -> tuple[dict, str]:
    m = _FRONT_RE.match(text)
    if not m:
        return {}, text
    front = yaml.safe_load(m.group(1)) or {}
    return front, m.group(2)


def _parse_dt(s) -> Optional[datetime]:
    if not s:
        return None
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(str(s).replace("Z", "+00:00"))


def _section(body: str, header: str) -> str:
    pat = re.compile(rf"^##\s+{re.escape(header)}\s*\n(.*?)(?=^##\s+|\Z)", re.MULTILINE | re.DOTALL)
    m = pat.search(body)
    return (m.group(1).strip() if m else "")


def _parse_bullets_with_source(section_text: str) -> list[EdgeCaseBullet]:
    out: list[EdgeCaseBullet] = []
    if not section_text:
        return out
    for block in re.split(r"\n(?=- )", section_text.strip()):
        if not block.startswith("- "):
            continue
        body = block[2:].strip()
        m = re.search(r"\n\s*source:\s*(.+)$", body)
        if not m:
            continue
        text = body[: m.start()].strip()
        source = m.group(1).strip()
        out.append(EdgeCaseBullet(text=text, source=source))
    return out


def _parse_files(raw_files) -> list[FileChange]:
    out: list[FileChange] = []
    for f in raw_files or []:
        if isinstance(f, dict):
            out.append(FileChange(
                path=f.get("path", ""),
                change=f.get("change", "modified"),
                loc_added=int(f.get("loc_added", 0) or 0),
                loc_removed=int(f.get("loc_removed", 0) or 0),
            ))
    return out


def _split_manual(body: str) -> tuple[str, str]:
    if _MANUAL_SENTINEL in body:
        before, after = body.split(_MANUAL_SENTINEL, 1)
        return before, _MANUAL_SENTINEL + after
    return body, ""


def read_record(path: Path, repo: str = "") -> TicketRecord:
    text = path.read_text()
    front, body = _split_front_matter(text)
    body_managed, manual_body = _split_manual(body)

    return TicketRecord(
        ticket=front.get("ticket", path.stem),
        title=front.get("title", ""),
        type=front.get("type", "unknown"),
        status=front.get("status", "in_progress"),
        first_commit=_parse_dt(front.get("first_commit")),
        last_commit=_parse_dt(front.get("last_commit")),
        shas=list(front.get("shas") or []),
        prs=list(front.get("prs") or []),
        authors=list(front.get("authors") or []),
        files=_parse_files(front.get("files")),
        symbols=list(front.get("symbols") or []),
        related_tickets=list(front.get("related_tickets") or []),
        reverted_by=list(front.get("reverted_by") or []),
        linked_bugs=list(front.get("linked_bugs") or []),
        loc_added=int(front.get("loc_added", 0) or 0),
        loc_removed=int(front.get("loc_removed", 0) or 0),
        duration_days=float(front.get("duration_days", 0.0) or 0.0),
        pr_open_to_merge_days=front.get("pr_open_to_merge_days"),
        manual_sections=list(front.get("manual_sections") or []),
        what_shipped=_section(body_managed, "What shipped"),
        key_decisions=[
            line.lstrip("- ").strip()
            for line in _section(body_managed, "Key decisions").splitlines()
            if line.strip().startswith("-")
        ],
        edge_cases_handled=_parse_bullets_with_source(_section(body_managed, "Edge cases handled")),
        known_gaps=_parse_bullets_with_source(_section(body_managed, "Known gaps")),
        manual_body=manual_body,
        repo=repo,
    )


def read_records(repo_path: Path, repo: str, ticket_ids: Optional[list[str]] = None) -> dict[str, TicketRecord]:
    base = repo_path / ".product-brain" / "tickets"
    if not base.exists():
        return {}
    out: dict[str, TicketRecord] = {}
    if ticket_ids is not None:
        for tid in ticket_ids:
            p = base / f"{tid}.md"
            if p.exists():
                out[tid] = read_record(p, repo=repo)
    else:
        for p in sorted(base.glob("*.md")):
            rec = read_record(p, repo=repo)
            out[rec.ticket] = rec
    return out


def list_records(repo_path: Path) -> list[str]:
    base = repo_path / ".product-brain" / "tickets"
    if not base.exists():
        return []
    return sorted(p.stem for p in base.glob("*.md"))


def read_manifest(repo_path: Path) -> Optional[Manifest]:
    p = repo_path / ".product-brain" / "manifest.md"
    if not p.exists():
        return None
    text = p.read_text()
    front, body = _split_front_matter(text)
    return Manifest(
        repo=front.get("repo", repo_path.name),
        ticket_regex=front.get("ticket_regex", r"AHA-\d+"),
        workflow=front.get("workflow", "squash"),
        languages=list(front.get("languages") or []),
        entry_points=list(front.get("entry_points") or []),
        owners_file=front.get("owners_file", "CODEOWNERS"),
        ignore_paths=list(front.get("ignore_paths") or []),
        mega_file_threshold=float(front.get("mega_file_threshold", 0.95) or 0.95),
        last_indexed_sha=front.get("last_indexed_sha", "") or "",
        index_cutoff_date=front.get("index_cutoff_date", "") or "",
        body=body.strip(),
    )


def write_manifest(repo_path: Path, manifest: Manifest) -> None:
    p = repo_path / ".product-brain" / "manifest.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    front = {
        "repo": manifest.repo,
        "ticket_regex": manifest.ticket_regex,
        "workflow": manifest.workflow,
        "languages": manifest.languages,
        "entry_points": manifest.entry_points,
        "owners_file": manifest.owners_file,
        "ignore_paths": manifest.ignore_paths,
        "mega_file_threshold": manifest.mega_file_threshold,
        "last_indexed_sha": manifest.last_indexed_sha,
        "index_cutoff_date": manifest.index_cutoff_date,
    }
    front_yaml = yaml.safe_dump(front, sort_keys=False).strip()
    p.write_text(f"---\n{front_yaml}\n---\n\n{manifest.body}\n")
