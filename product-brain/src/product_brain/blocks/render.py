from __future__ import annotations

from typing import Optional


def render_groom(
    ticket_id: str,
    title: str,
    scope_by_repo: dict[str, list[str]],
    estimate,
    edge_groups: list[dict],
    risks: list[dict],
    reviewers: list[dict],
    drafts: list[dict],
    mode: str = "groom",
    change_note: Optional[str] = None,
    qa_edge_groups: Optional[list[dict]] = None,
    stability_signals: Optional[list[str]] = None,
    coverage_gaps: Optional[list[dict]] = None,
) -> str:
    lines: list[str] = []
    lines.append(f"# {ticket_id} — {title}")
    if mode == "plan":
        lines.append("\n**Pre-ticket plan** — scope is predicted, refine after creating the ticket.")
    if change_note:
        lines.append(f"\n_{change_note}_")

    lines.append("\n## Scope by repo\n")
    for repo, areas in scope_by_repo.items():
        lines.append(f"**{repo}**")
        if areas:
            for a in areas:
                lines.append(f"- {a}")
        else:
            lines.append("- _(no scope predicted)_")
        lines.append("")

    if estimate.references:
        lines.append(f"## Estimate: {estimate.low}–{estimate.high} {estimate.unit}  ({estimate.confidence} confidence)\n")
        lines.append("References:")
        for r in estimate.references:
            lines.append(f"- {r.ticket} ({r.title}): {r.days:.1f}d, {r.loc} LOC, {r.files} files     similarity {r.similarity}")
        lines.append("")
    else:
        lines.append("## Estimate: unavailable (no comparable references)\n")

    if edge_groups:
        lines.append(f"## Edge cases (from {sum(len(g['tickets']) for g in edge_groups)} citations across related tickets)\n")
        for g in edge_groups:
            lines.append(f"- {g['text']}     [{g['frequency']}: {', '.join(g['tickets'])}]")
        lines.append("")
    else:
        lines.append("## Edge cases\n_(no validated bullets)_\n")

    if qa_edge_groups:
        lines.append("## QA-verified edges (from related tickets' test suites)\n")
        for g in qa_edge_groups:
            lines.append(f"- {g['text']}     [{g['frequency']}: {', '.join(g['tickets'])}]")
        lines.append("")

    if stability_signals:
        lines.append("## Stability signals (from test run history)\n")
        for s in stability_signals:
            lines.append(f"- {s}")
        lines.append("")

    if coverage_gaps:
        lines.append("## Coverage gaps (handled in code, not in QA suite)\n")
        for g in coverage_gaps:
            lines.append(f"- {g['edge']}")
            lines.append(f"  source: {g['edge_source']}")
            if g.get("rationale"):
                lines.append(f"  rationale: {g['rationale']}")
        lines.append("")

    if risks:
        lines.append("## Risks\n")
        for r in risks:
            lines.append(f"- {r['area']}: {r['evidence']}")
        lines.append("")

    if reviewers:
        lines.append("## Suggested reviewers\n")
        for r in reviewers:
            lines.append(f"- {r['handle']} ({r['area']}, {r['commits']} commits in scope)")
        lines.append("")

    if drafts:
        lines.append("## Draft sub-tickets\n")
        for d in drafts:
            lines.append(f"- [ ] {d['repo']}: {d['summary']}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"
