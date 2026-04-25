from __future__ import annotations

import subprocess
from pathlib import Path

from .config import Config, load as load_config
from .index import list_records, read_records, write_record
from .blocks.edge_mine import validate_citations


def _head_exists(repo: Path, path: str) -> bool:
    return (repo / path).exists()


def repair_repo(config: Config, repo_name: str) -> dict:
    repo_cfg = config.repo(repo_name)
    repo_path = repo_cfg.path
    records = read_records(repo_path, repo_name)
    bullets_dropped = 0
    files_marked_deleted = 0
    stale_tagged = 0

    pr_numbers_seen: set[int] = set()
    for r in records.values():
        pr_numbers_seen.update(r.prs)

    for ticket_id, rec in records.items():
        edges, dropped_e = validate_citations(rec.edge_cases_handled, repo_path, pr_numbers_seen)
        gaps, dropped_g = validate_citations(rec.known_gaps, repo_path, pr_numbers_seen)
        bullets_dropped += dropped_e + dropped_g

        for f in rec.files:
            if f.change != "deleted" and not _head_exists(repo_path, f.path):
                f.change = "deleted"
                files_marked_deleted += 1

        new_gaps = []
        for g in gaps:
            if "TODO" in g.source and ":" in g.source:
                path = g.source.split(":")[0]
                if not _head_exists(repo_path, path):
                    g.text = f"[stale] {g.text}"
                    stale_tagged += 1
            new_gaps.append(g)

        rec.edge_cases_handled = edges
        rec.known_gaps = new_gaps
        write_record(repo_path, rec)

    return {
        "repo": repo_name,
        "tickets": len(records),
        "bullets_dropped": bullets_dropped,
        "files_marked_deleted": files_marked_deleted,
        "stale_gaps_tagged": stale_tagged,
    }


def main():
    config = load_config()
    for r in config.repos:
        print(repair_repo(config, r.name))


if __name__ == "__main__":
    main()
