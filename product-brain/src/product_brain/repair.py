from __future__ import annotations

import subprocess
from pathlib import Path

from .adapters import get_test as get_test_adapter
from .blocks.coverage_gap import detect_gaps
from .blocks.edge_mine import stability_signals, validate_citations
from .config import Config, load as load_config
from .index import list_records, read_records, write_record


def _head_exists(repo: Path, path: str) -> bool:
    return (repo / path).exists()


def repair_repo(config: Config, repo_name: str) -> dict:
    repo_cfg = config.repo(repo_name)
    repo_path = repo_cfg.path
    records = read_records(repo_path, repo_name)
    test_adapter = get_test_adapter(config.test_adapter, config)
    bullets_dropped = 0
    files_marked_deleted = 0
    stale_tagged = 0
    stability_refreshed = 0

    pr_numbers_seen: set[int] = set()
    case_ids_seen: set[str] = set()
    for r in records.values():
        pr_numbers_seen.update(r.prs)
        case_ids_seen.update(c.id for c in r.test_cases)

    for ticket_id, rec in records.items():
        edges, dropped_e = validate_citations(rec.edge_cases_handled, repo_path, pr_numbers_seen, case_ids_seen)
        gaps, dropped_g = validate_citations(rec.known_gaps, repo_path, pr_numbers_seen, case_ids_seen)
        qa, dropped_q = validate_citations(rec.qa_edges, repo_path, pr_numbers_seen, case_ids_seen)
        bullets_dropped += dropped_e + dropped_g + dropped_q

        if test_adapter is not None and rec.test_cases:
            try:
                fresh_runs = []
                for c in rec.test_cases:
                    runs = test_adapter.fetch_run_history(c.id)
                    fresh_runs.extend(runs)
                    fails = sum(1 for r in runs if r.status in ("failed", "blocked"))
                    c.recent_failures = fails
                rec.stability_signals = stability_signals(rec.test_cases, fresh_runs)
                stability_refreshed += 1
                if rec.edge_cases_handled:
                    rec.coverage_gaps = detect_gaps(rec.edge_cases_handled, rec.test_cases, llm_call=None)
            except Exception:
                pass

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
        rec.qa_edges = qa
        write_record(repo_path, rec)

    return {
        "repo": repo_name,
        "tickets": len(records),
        "bullets_dropped": bullets_dropped,
        "files_marked_deleted": files_marked_deleted,
        "stale_gaps_tagged": stale_tagged,
        "stability_refreshed": stability_refreshed,
    }


def main():
    config = load_config()
    for r in config.repos:
        print(repair_repo(config, r.name))


if __name__ == "__main__":
    main()
