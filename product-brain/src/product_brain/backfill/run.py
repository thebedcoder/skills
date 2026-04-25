from __future__ import annotations

import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..adapters import get as get_adapter
from ..config import Config
from ..index import read_records, read_manifest, write_record, write_manifest
from ..models import Commit, FileChange, Manifest, TicketRecord, EdgeCaseBullet
from .git_log import diff_stat, group_by_ticket, parse_git_log
from .pr_enrichment import enrich
from .summarize import llm_call_factory
from ..blocks.edge_mine import mine_per_ticket


def _head_sha(repo: Path) -> str:
    r = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"],
                       capture_output=True, text=True, check=True)
    return r.stdout.strip()


def _aggregate_files(commits: list[Commit], repo_path: Path) -> list[FileChange]:
    by_path: dict[str, FileChange] = {}
    for c in commits:
        stats = diff_stat(repo_path, c.sha)
        for f in c.files:
            existing = by_path.get(f.path)
            added, removed = stats.get(f.path, (0, 0))
            if existing:
                existing.loc_added += added
                existing.loc_removed += removed
                if f.change == "added" and existing.change != "added":
                    existing.change = "modified"
                elif f.change == "deleted":
                    existing.change = "deleted"
            else:
                by_path[f.path] = FileChange(
                    path=f.path, change=f.change,
                    loc_added=added, loc_removed=removed,
                )
    return sorted(by_path.values(), key=lambda f: f.path)


def _compute_related(
    target: str,
    target_files: set[str],
    all_records: dict[str, set[str]],
    min_overlap: int = 2,
    top_k: int = 8,
) -> list[str]:
    scored = []
    for tid, files in all_records.items():
        if tid == target:
            continue
        overlap = len(target_files & files)
        if overlap >= min_overlap:
            scored.append((overlap, tid))
    scored.sort(reverse=True)
    return [tid for _, tid in scored[:top_k]]


def backfill_repo(
    config: Config,
    repo_name: str,
    since: Optional[str] = None,
    force: bool = False,
    skip_llm: bool = False,
) -> dict:
    repo_cfg = config.repo(repo_name)
    repo_path: Path = repo_cfg.path
    manifest = read_manifest(repo_path) or Manifest(repo=repo_name)
    ticket_regex = manifest.ticket_regex or config.ticket_regex
    workflow = manifest.workflow or config.backfill.workflow

    if since is None and not force and manifest.last_indexed_sha:
        since = manifest.last_indexed_sha

    commits = parse_git_log(repo_path, ticket_regex, workflow=workflow, since=since)
    by_ticket = group_by_ticket(commits)

    adapter = get_adapter(config.pm_adapter, config)
    llm_call = None if skip_llm else llm_call_factory(config, model=config.llm.model_summarize)

    existing = read_records(repo_path, repo_name)
    all_files: dict[str, set[str]] = {tid: {f.path for f in rec.files} for tid, rec in existing.items()}

    written = 0
    created = 0
    bullets_dropped = 0

    for ticket_id, ticket_commits in by_ticket.items():
        files = _aggregate_files(ticket_commits, repo_path)
        last_sha = ticket_commits[-1].sha
        prev = existing.get(ticket_id)
        if not force and prev and prev.shas and prev.shas[-1] == last_sha:
            continue

        prs = enrich(
            repo_path, ticket_id, ticket_commits,
            config.github_token(),
            enabled=config.backfill.pr_enrichment,
        )

        ticket_meta = None
        try:
            ticket_meta = adapter.fetch_ticket(ticket_id)
        except Exception:
            pass

        first_dt = ticket_commits[0].date
        last_dt = ticket_commits[-1].date
        duration = (last_dt - first_dt).total_seconds() / 86400.0

        pr_open_to_merge: Optional[float] = None
        if prs and prs[0].opened_at and prs[0].merged_at:
            pr_open_to_merge = (prs[0].merged_at - prs[0].opened_at).total_seconds() / 86400.0

        record = TicketRecord(
            ticket=ticket_id,
            title=(ticket_meta.title if ticket_meta else ""),
            type=(ticket_meta.type if ticket_meta else "unknown"),
            status="shipped" if prs and any(p.merged_at for p in prs) else "in_progress",
            first_commit=first_dt,
            last_commit=last_dt,
            shas=[c.sha for c in ticket_commits],
            prs=[p.number for p in prs],
            authors=sorted({c.author for c in ticket_commits}),
            files=files,
            symbols=[],
            related_tickets=[],
            loc_added=sum(f.loc_added for f in files),
            loc_removed=sum(f.loc_removed for f in files),
            duration_days=round(duration, 2),
            pr_open_to_merge_days=round(pr_open_to_merge, 2) if pr_open_to_merge is not None else None,
            manual_sections=["Edge cases (manual)"],
            manual_body=(prev.manual_body if prev else ""),
            repo=repo_name,
        )

        if not skip_llm:
            mined, dropped = mine_per_ticket(
                repo_path, ticket_commits, prs,
                pm_description=(ticket_meta.description if ticket_meta else ""),
                llm_call=llm_call,
                linked_bugs=[],
            )
            record.what_shipped = mined["what_shipped"]
            record.key_decisions = mined["key_decisions"]
            record.edge_cases_handled = mined["edge_cases_handled"]
            record.known_gaps = mined["known_gaps"]
            bullets_dropped += dropped

        all_files[ticket_id] = {f.path for f in files}
        write_record(repo_path, record)
        if prev:
            written += 1
        else:
            created += 1

    for ticket_id, files_set in list(all_files.items()):
        rec_path = repo_path / ".product-brain" / "tickets" / f"{ticket_id}.md"
        if not rec_path.exists():
            continue
        rec = read_records(repo_path, repo_name, [ticket_id])[ticket_id]
        related = _compute_related(ticket_id, files_set, all_files)
        if related != rec.related_tickets:
            rec.related_tickets = related
            write_record(repo_path, rec)

    manifest.last_indexed_sha = _head_sha(repo_path)
    write_manifest(repo_path, manifest)

    return {
        "repo": repo_name,
        "written": written,
        "created": created,
        "bullets_dropped": bullets_dropped,
        "head": manifest.last_indexed_sha,
    }
