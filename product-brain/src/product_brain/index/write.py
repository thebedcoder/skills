from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from pathlib import Path

import yaml

from ..models import TicketRecord


_MANUAL_SENTINEL = "<!-- manual: do not overwrite below this line -->"


def _to_iso(dt) -> str:
    if dt is None:
        return ""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def _front_matter_dict(record: TicketRecord) -> dict:
    return {
        "ticket": record.ticket,
        "title": record.title,
        "type": record.type,
        "status": record.status,
        "first_commit": _to_iso(record.first_commit),
        "last_commit": _to_iso(record.last_commit),
        "shas": record.shas,
        "prs": record.prs,
        "authors": record.authors,
        "files": [
            {"path": f.path, "change": f.change, "loc_added": f.loc_added, "loc_removed": f.loc_removed}
            for f in record.files
        ],
        "symbols": record.symbols,
        "related_tickets": record.related_tickets,
        "reverted_by": record.reverted_by,
        "linked_bugs": record.linked_bugs,
        "loc_added": record.loc_added,
        "loc_removed": record.loc_removed,
        "duration_days": round(record.duration_days, 2),
        "pr_open_to_merge_days": (round(record.pr_open_to_merge_days, 2) if record.pr_open_to_merge_days is not None else None),
        "manual_sections": record.manual_sections,
        "test_cases": [
            {
                "id": c.id,
                "title": c.title,
                "automation": c.automation,
                "type": c.type,
                "suite": c.suite,
                "linked_tickets": c.linked_tickets,
                "last_status": c.last_status,
                "last_run": _to_iso(c.last_run),
                "recent_failures": c.recent_failures,
                "url": c.url,
            }
            for c in record.test_cases
        ],
        "coverage_gaps": [
            {"edge": g.edge, "edge_source": g.edge_source, "rationale": g.rationale}
            for g in record.coverage_gaps
        ],
    }


def _render_bullets(bullets) -> str:
    out = []
    for b in bullets:
        out.append(f"- {b.text}\n  source: {b.source}")
    return "\n".join(out) if out else "_(none)_"


def render(record: TicketRecord) -> str:
    front = _front_matter_dict(record)
    front_yaml = yaml.safe_dump(front, sort_keys=False).strip()

    decisions = "\n".join(f"- {d}" for d in record.key_decisions) or "_(none)_"
    edges = _render_bullets(record.edge_cases_handled)
    gaps = _render_bullets(record.known_gaps)
    qa_edges = _render_bullets(record.qa_edges)
    stability = "\n".join(f"- {s}" for s in record.stability_signals) or "_(none)_"
    coverage = "\n".join(
        f"- {g.edge}\n  source: {g.edge_source}\n  rationale: {g.rationale}"
        for g in record.coverage_gaps
    ) or "_(none)_"
    manual = record.manual_body or f"\n{_MANUAL_SENTINEL}\n## Edge cases (manual)\n\n<!-- Engineers may add hand-written edge cases here. Not LLM-managed. -->\n"

    return f"""---
{front_yaml}
---

## What shipped

{record.what_shipped or "_(no signals)_"}

## Key decisions

{decisions}

## Edge cases handled

{edges}

## Known gaps

{gaps}

## QA-verified edges

{qa_edges}

## Stability signals

{stability}

## Coverage gaps

{coverage}

{manual.strip()}
"""


def write_record(repo_path: Path, record: TicketRecord) -> Path:
    base = repo_path / ".product-brain" / "tickets"
    base.mkdir(parents=True, exist_ok=True)
    p = base / f"{record.ticket}.md"
    p.write_text(render(record))
    return p
