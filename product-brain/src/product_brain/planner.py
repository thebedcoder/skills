"""Composes building blocks for a single command.

Used by both the bot worker and the CLI. Slash commands inside Claude Code
read the markdown command bodies and may compose differently — this module
is the canonical Python orchestration.
"""

from __future__ import annotations

from collections import Counter
from typing import Optional

from .adapters import get as get_adapter, get_test as get_test_adapter
from .blocks.edge_mine import dedup_edge_cases
from .blocks.estimate import estimate_effort
from .blocks.hotspot import cluster_hotspots
from .blocks.render import render_groom
from .config import Config
from .index import read_records
from .models import EdgeCaseBullet, TicketRecord


def _scope_by_repo(records_by_repo: dict[str, dict[str, TicketRecord]]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for repo, recs in records_by_repo.items():
        if not recs:
            continue
        dirs: Counter = Counter()
        for r in recs.values():
            for f in r.files:
                top = f.path.split("/", 1)[0]
                dirs[top] += 1
        out[repo] = [d for d, _ in dirs.most_common(5)]
    return out


def _suggested_reviewers(records: list[TicketRecord]) -> list[dict]:
    counts: Counter = Counter()
    for r in records:
        for a in r.authors:
            counts[a] += len(r.shas)
    return [
        {"handle": h, "area": "auth", "commits": n}
        for h, n in counts.most_common(3)
    ]


def _drafts_from_scope(scope_by_repo: dict[str, list[str]], ticket_title: str) -> list[dict]:
    out = []
    for repo, areas in scope_by_repo.items():
        if not areas:
            continue
        out.append({"repo": repo, "summary": f"{ticket_title} — areas: {', '.join(areas[:3])}"})
    return out


def run_command(config: Config, command: str, ticket_id: str, args: str = "") -> tuple[str, str, str, float]:
    """Returns (rendered_body, summary, model, cost).

    Cost is approximate and not currently enforced; track via audit.
    """
    adapter = get_adapter(config.pm_adapter, config)
    ticket = adapter.fetch_ticket(ticket_id)

    siblings = adapter.list_siblings(ticket_id, limit=30)
    related_ids = [t.id for t in siblings] + [ticket_id]

    records_by_repo: dict[str, dict[str, TicketRecord]] = {}
    for repo_cfg in config.repos:
        records_by_repo[repo_cfg.name] = read_records(config.brain_root, repo_cfg.name, related_ids)

    flat: list[TicketRecord] = []
    for recs in records_by_repo.values():
        flat.extend(recs.values())

    target_files: set[str] = set()
    target_record = None
    for recs in records_by_repo.values():
        if ticket_id in recs:
            target_record = recs[ticket_id]
            target_files |= {f.path for f in recs[ticket_id].files}

    candidates = [r for r in flat if r.ticket != ticket_id]

    estimate = estimate_effort(
        target=ticket,
        candidates=candidates,
        cfg=config.estimate,
        target_files=target_files,
    )

    edge_groups = dedup_edge_cases(flat)

    qa_records: list[TicketRecord] = []
    for r in flat:
        if r.qa_edges:
            clone = TicketRecord(ticket=r.ticket, repo=r.repo)
            clone.edge_cases_handled = r.qa_edges
            qa_records.append(clone)
    qa_groups = dedup_edge_cases(qa_records) if qa_records else []

    aggregated_stability: list[str] = []
    for r in flat:
        for s in r.stability_signals:
            aggregated_stability.append(f"{r.ticket}: {s}")
    aggregated_stability = aggregated_stability[:8]

    aggregated_gaps: list[dict] = []
    for r in flat:
        for g in r.coverage_gaps:
            aggregated_gaps.append({
                "edge": g.edge,
                "edge_source": f"{g.edge_source} (from {r.ticket})",
                "rationale": g.rationale,
            })
    aggregated_gaps = aggregated_gaps[:8]

    risks: list[dict] = []
    for r in flat:
        if r.duration_days and r.duration_days > 14:
            risks.append({"area": ", ".join(p.path for p in r.files[:2]), "evidence": f"{r.ticket} took {r.duration_days:.0f}d"})
    risks = risks[:5]

    scope = _scope_by_repo(records_by_repo)
    reviewers = _suggested_reviewers(flat)
    drafts = _drafts_from_scope(scope, ticket.title)

    if command == "edges":
        sections = []
        if edge_groups:
            sections.append("## Edge cases\n\n" + "\n".join(
                f"- {g['text']}     [{g['frequency']}: {', '.join(g['tickets'])}]"
                for g in edge_groups
            ))
        else:
            sections.append("## Edge cases\n_(no validated bullets)_")
        if qa_groups:
            sections.append("## QA-verified edges\n\n" + "\n".join(
                f"- {g['text']}     [{g['frequency']}: {', '.join(g['tickets'])}]"
                for g in qa_groups
            ))
        if aggregated_stability:
            sections.append("## Stability signals\n\n" + "\n".join(f"- {s}" for s in aggregated_stability))
        if aggregated_gaps:
            sections.append("## Coverage gaps\n\n" + "\n".join(
                f"- {g['edge']}\n  source: {g['edge_source']}" for g in aggregated_gaps
            ))
        body = "\n\n".join(sections)
    elif command == "estimate":
        if estimate.references:
            body = (
                f"## Estimate: {estimate.low}–{estimate.high} {estimate.unit} "
                f"({estimate.confidence} confidence)\n\nReferences:\n"
                + "\n".join(
                    f"- {r.ticket} ({r.title}): {r.days:.1f}d, {r.loc} LOC, {r.files} files     similarity {r.similarity}"
                    for r in estimate.references
                )
            )
        else:
            body = "## Estimate: unavailable (no comparable references)"
    elif command == "related":
        body = "## Related tickets\n\n" + "\n".join(
            f"- {r.ticket} ({r.title}): {r.loc_added + r.loc_removed} LOC, {r.duration_days:.1f}d"
            for r in candidates[:10]
        )
    else:
        body = render_groom(
            ticket_id=ticket_id, title=ticket.title,
            scope_by_repo=scope, estimate=estimate,
            edge_groups=edge_groups, risks=risks,
            reviewers=reviewers, drafts=drafts,
            mode="groom",
            qa_edge_groups=qa_groups,
            stability_signals=aggregated_stability,
            coverage_gaps=aggregated_gaps,
        )

    summary = (
        f"{command} on {ticket_id}: {len(candidates)} refs, "
        f"{len(edge_groups)} edge groups, {len(qa_groups)} QA groups, "
        f"{len(aggregated_stability)} stability flags, {len(aggregated_gaps)} gaps, "
        f"est={estimate.low}-{estimate.high}{estimate.unit}"
    )
    model = config.llm.model_synthesize
    cost = 0.0
    return body, summary, model, cost
