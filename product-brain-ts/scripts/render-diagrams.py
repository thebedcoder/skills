#!/usr/bin/env python3
"""Render workflow diagrams as PNGs using matplotlib.

Produces:
  assets/lifecycle.png            three-phase data flow
  assets/architecture.png         component view
  assets/pm-workflow.png          PM journey through Aha
  assets/engineer-workflow.png    engineer journey through CC/Copilot
  assets/bot-flow.png             technical webhook → queue → worker

Run:  python3 scripts/render-diagrams.py [--out <dir>]

Re-runs are idempotent. Output also copied to demo/diagrams/ for the demo deck.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

import matplotlib.patches as mp
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch


COLORS = {
    "bg":          "#FFFFFF",
    "phase1":      "#E3F2FD",
    "phase1_edge": "#1976D2",
    "phase2":      "#FFF3E0",
    "phase2_edge": "#EF6C00",
    "phase3":      "#E8F5E9",
    "phase3_edge": "#2E7D32",
    "box":         "#FAFAFA",
    "box_edge":    "#616161",
    "accent":      "#FFEBEE",
    "accent_edge": "#C62828",
    "text":        "#212121",
    "muted":       "#616161",
    "arrow":       "#424242",
}


def _box(ax, x, y, w, h, text, fc, ec, fontsize=10, fontweight="normal"):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.04",
        linewidth=1.6, edgecolor=ec, facecolor=fc,
    )
    ax.add_patch(box)
    ax.text(x + w / 2, y + h / 2, text,
            ha="center", va="center",
            fontsize=fontsize, fontweight=fontweight,
            color=COLORS["text"], wrap=True)


def _phase(ax, x, y, w, h, title, fc, ec):
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle="round,pad=0.06",
        linewidth=2, edgecolor=ec, facecolor=fc,
    )
    ax.add_patch(box)
    ax.text(x + 0.18, y + h - 0.28, title,
            ha="left", va="top",
            fontsize=12, fontweight="bold", color=ec)


def _arrow(ax, x1, y1, x2, y2, label="", style="-|>", lw=1.6, color=None):
    a = FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle=style, mutation_scale=18,
        linewidth=lw, color=color or COLORS["arrow"],
    )
    ax.add_patch(a)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx + 0.15, my, label,
                ha="left", va="center",
                fontsize=8, color=COLORS["muted"], style="italic")


def _setup(figsize=(10, 8)):
    fig, ax = plt.subplots(figsize=figsize, dpi=150)
    ax.set_facecolor(COLORS["bg"])
    fig.patch.set_facecolor(COLORS["bg"])
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    return fig, ax


def render_lifecycle(out: Path):
    fig, ax = _setup((11, 12))
    ax.set_xlim(0, 10); ax.set_ylim(0, 12)
    ax.text(5, 11.6, "Product Brain — three-phase lifecycle",
            ha="center", fontsize=14, fontweight="bold")

    _phase(ax, 0.3, 8.0, 9.4, 3.0, "1. DEVELOPMENT  (continuous, source repos)",
           COLORS["phase1"], COLORS["phase1_edge"])
    _box(ax, 0.7, 9.6, 3.0, 0.8, "engineer commits\n'AHA-1234: add 2FA'",
         COLORS["box"], COLORS["box_edge"])
    _box(ax, 4.0, 9.6, 2.5, 0.8, "PR review +\nmerge to main",
         COLORS["box"], COLORS["box_edge"])
    _box(ax, 6.8, 9.6, 2.7, 0.8, "post-merge hook /\nGH Action",
         COLORS["box"], COLORS["box_edge"])
    _arrow(ax, 3.7, 10.0, 4.0, 10.0)
    _arrow(ax, 6.5, 10.0, 6.8, 10.0)
    _box(ax, 2.0, 8.3, 6.0, 0.8,
         "POST {repo, head_sha} → bot /webhook/source-merge",
         COLORS["accent"], COLORS["accent_edge"], fontsize=9)
    _arrow(ax, 8.1, 9.6, 6.5, 9.1, style="-|>")

    _arrow(ax, 5.0, 8.0, 5.0, 7.4, lw=2.4)

    _phase(ax, 0.3, 4.4, 9.4, 3.0, "2. CENTRAL BRAIN REPO  (one per company)",
           COLORS["phase2"], COLORS["phase2_edge"])
    _box(ax, 0.7, 5.6, 8.6, 1.5,
         "company-product-brain/\n"
         "├── config.yaml\n"
         "├── repos/{flutter,react,backend}/\n"
         "│       ├── manifest.md\n"
         "│       └── tickets/AHA-NNNN.md  (front-matter + cited prose)",
         COLORS["box"], COLORS["box_edge"], fontsize=9)
    _box(ax, 0.7, 4.7, 8.6, 0.6,
         "Source repos NEVER modified.  Bot serializes brain-repo writes.",
         COLORS["accent"], COLORS["accent_edge"], fontsize=9, fontweight="bold")

    _arrow(ax, 5.0, 4.4, 5.0, 3.8, lw=2.4)

    _phase(ax, 0.3, 0.4, 9.4, 3.0, "3. PLANNING  (per query)",
           COLORS["phase3"], COLORS["phase3_edge"])
    _box(ax, 0.7, 2.4, 4.2, 0.8,
         "PM types '/brain groom'\nin Aha comment",
         COLORS["box"], COLORS["box_edge"])
    _box(ax, 5.2, 2.4, 4.2, 0.8,
         "Engineer types '/pb-groom AHA-1234'\nin Claude Code / Copilot Chat / CLI",
         COLORS["box"], COLORS["box_edge"], fontsize=9)
    _arrow(ax, 2.8, 2.4, 4.7, 1.7)
    _arrow(ax, 7.3, 2.4, 5.3, 1.7)
    _box(ax, 3.5, 1.0, 3.0, 0.8,
         "same building blocks\n+ same output contract",
         COLORS["accent"], COLORS["accent_edge"], fontsize=9, fontweight="bold")
    _arrow(ax, 5.0, 1.0, 5.0, 0.6)
    ax.text(5.0, 0.5,
            "scope · estimate(refs) · edges · stability · coverage gaps · drafts",
            ha="center", fontsize=9, color=COLORS["text"], style="italic")

    fig.tight_layout()
    fig.savefig(out / "lifecycle.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def render_architecture(out: Path):
    fig, ax = _setup((12, 8))
    ax.set_xlim(0, 12); ax.set_ylim(0, 8)
    ax.text(6, 7.6, "Product Brain — components",
            ha="center", fontsize=14, fontweight="bold")

    _box(ax, 0.5, 5.5, 2.3, 1.2, "Aha\n(or Linear/Jira)",
         COLORS["phase1"], COLORS["phase1_edge"], fontweight="bold")
    _box(ax, 0.5, 3.8, 2.3, 1.2, "TestRail\n(optional)",
         COLORS["phase1"], COLORS["phase1_edge"])
    _box(ax, 0.5, 2.1, 2.3, 1.2, "GitHub\n(PR data)",
         COLORS["phase1"], COLORS["phase1_edge"])
    _box(ax, 0.5, 0.4, 2.3, 1.2, "LLM provider\nAnthropic | OpenAI |\nAzure | local (Ollama)",
         COLORS["phase1"], COLORS["phase1_edge"], fontsize=9)

    _box(ax, 4.2, 0.5, 4.5, 6.3,
         "product-brain core\n\n"
         "adapters:  PM, Test\n"
         "llm:       provider abstraction\n"
         "index:     read / write records\n"
         "blocks:    hotspot · estimate ·\n"
         "           edge_mine · coverage_gap ·\n"
         "           render\n"
         "backfill:  git → records pipeline\n"
         "planner:   composes blocks per command",
         COLORS["phase2"], COLORS["phase2_edge"], fontsize=10)

    _box(ax, 9.3, 5.0, 2.4, 1.5,
         "Brain repo\nrepos/<name>/\n  manifest.md\n  tickets/*.md",
         COLORS["phase3"], COLORS["phase3_edge"], fontsize=9, fontweight="bold")

    _box(ax, 9.3, 3.0, 2.4, 1.5,
         "Aha bot\nwebhook + queue\n+ worker\n(edits comments)",
         COLORS["phase3"], COLORS["phase3_edge"], fontsize=9, fontweight="bold")

    _box(ax, 9.3, 1.0, 2.4, 1.5,
         "CLI + Skill\nproduct-brain run …\n/pb-groom (CC)\n+ Copilot/Codex",
         COLORS["phase3"], COLORS["phase3_edge"], fontsize=9, fontweight="bold")

    for y in (6.1, 4.4, 2.7, 1.0):
        _arrow(ax, 2.8, y, 4.2, y)

    _arrow(ax, 8.7, 5.5, 9.3, 5.7)
    _arrow(ax, 8.7, 3.5, 9.3, 3.6)
    _arrow(ax, 8.7, 1.5, 9.3, 1.6)

    fig.tight_layout()
    fig.savefig(out / "architecture.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def render_pm_workflow(out: Path):
    fig, ax = _setup((13, 9))
    ax.set_xlim(0, 13); ax.set_ylim(0, 9)
    ax.text(6.5, 8.6, "PM workflow — grooming a feature in Aha",
            ha="center", fontsize=14, fontweight="bold")

    steps = [
        (0.3, 7.0, "1. PM creates AHA-1500\nin Aha + adds label\n'brain:on'"),
        (3.4, 7.0, "2. /brain related\n(cheap, ~5s)\n→ similar shipped tickets"),
        (6.5, 7.0, "3. Reads top refs\n(AHA-1100, AHA-1300)\nin the table"),
        (9.6, 7.0, "4. Updates description\nwith stakeholder constraints"),

        (0.3, 4.5, "5. /brain groom\n(~30s, ~$0.20)\n→ full plan"),
        (3.4, 4.5, "6. Reads:\n• scope per repo\n• estimate w/ refs\n• edges + QA edges\n• stability + gaps"),
        (6.5, 4.5, "7. /brain refresh\nafter changes\n(edits in place)"),
        (9.6, 4.5, "8. /brain explain\nfor estimate detail"),

        (0.3, 2.0, "9. /brain draft-tickets\n→ bot creates 5 drafts\nstatus 'Bot-draft'"),
        (3.4, 2.0, "10. PM reviews\neach draft in Aha\n(edit / accept / reject)"),
        (6.5, 2.0, "11. PM assigns owners,\npromotes to active"),
        (9.6, 2.0, "12. Engineers pick up\nwith full context"),
    ]
    for x, y, text in steps:
        _box(ax, x, y - 0.7, 2.8, 1.4, text,
             COLORS["phase3"], COLORS["phase3_edge"], fontsize=9)

    for x in (3.1, 6.2, 9.3):
        _arrow(ax, x, 7.0, x + 0.3, 7.0)
        _arrow(ax, x, 4.5, x + 0.3, 4.5)
        _arrow(ax, x, 2.0, x + 0.3, 2.0)
    _arrow(ax, 1.7, 6.3, 1.7, 5.2, label="iterate")
    _arrow(ax, 1.7, 3.8, 1.7, 2.7, label="commit")

    ax.text(6.5, 0.4,
            "PM never installs anything · no terminal · no IDE · only Aha",
            ha="center", fontsize=10, fontweight="bold",
            color=COLORS["accent_edge"])

    fig.tight_layout()
    fig.savefig(out / "pm-workflow.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def render_engineer_workflow(out: Path):
    fig, ax = _setup((13, 7))
    ax.set_xlim(0, 13); ax.set_ylim(0, 7)
    ax.text(6.5, 6.6, "Engineer workflow — picking up and shipping a ticket",
            ha="center", fontsize=14, fontweight="bold")

    steps_top = [
        (0.3, 4.7, "1. Assigned\nAHA-1234", 1.9),
        (2.5, 4.7, "2. /pb-related AHA-1234\nor product-brain run\n  related AHA-1234", 2.6),
        (5.4, 4.7, "3. Reads top refs +\ngotchas before\nopening code", 2.5),
        (8.2, 4.7, "4. /pb-groom AHA-1234\n--deep  for richer\nsubagent verification", 2.6),
        (11.1, 4.7, "5. Implements", 1.5),
    ]
    for x, y, text, w in steps_top:
        _box(ax, x, y - 0.6, w, 1.2, text,
             COLORS["phase1"], COLORS["phase1_edge"], fontsize=9)

    steps_bot = [
        (0.3, 2.0, "6. Opens PR;\nincludes ticket ID\nin commits", 2.4),
        (3.0, 2.0, "7. Review: edges from\nstep 3 are handled", 2.4),
        (5.7, 2.0, "8. Merge to main", 2.0),
        (8.0, 2.0, "9. Hook fires →\nbot updates record\nin brain repo", 2.6),
        (10.9, 2.0, "10. Done", 1.7),
    ]
    for x, y, text, w in steps_bot:
        _box(ax, x, y - 0.6, w, 1.2, text,
             COLORS["phase1"], COLORS["phase1_edge"], fontsize=9)

    for prev_x, prev_w, next_x in [
        (0.3, 1.9, 2.5), (2.5, 2.6, 5.4), (5.4, 2.5, 8.2), (8.2, 2.6, 11.1),
    ]:
        _arrow(ax, prev_x + prev_w, 4.7, next_x, 4.7)
    for prev_x, prev_w, next_x in [
        (0.3, 2.4, 3.0), (3.0, 2.4, 5.7), (5.7, 2.0, 8.0), (8.0, 2.6, 10.9),
    ]:
        _arrow(ax, prev_x + prev_w, 2.0, next_x, 2.0)

    _arrow(ax, 11.8, 4.1, 1.0, 2.6, style="-|>", lw=1.0)

    ax.text(6.5, 0.4,
            "Engineer's IDE is unaffected — Claude Code, Copilot Chat, Codex, terminal all work",
            ha="center", fontsize=10, fontweight="bold",
            color=COLORS["phase1_edge"])

    fig.tight_layout()
    fig.savefig(out / "engineer-workflow.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def render_bot_flow(out: Path):
    fig, ax = _setup((11, 7))
    ax.set_xlim(0, 11); ax.set_ylim(0, 7)
    ax.text(5.5, 6.6, "Bot — request flow",
            ha="center", fontsize=14, fontweight="bold")

    _box(ax, 0.3, 4.6, 2.0, 1.0, "Aha\nticket comment:\n/brain groom",
         COLORS["phase1"], COLORS["phase1_edge"], fontsize=9, fontweight="bold")
    _box(ax, 2.8, 4.6, 2.0, 1.0, "Webhook\n/webhook/aha\n(verify HMAC)",
         COLORS["phase2"], COLORS["phase2_edge"], fontsize=9)
    _box(ax, 5.3, 4.6, 1.6, 1.0, "Queue\n(SQLite)\nclaim_next",
         COLORS["phase2"], COLORS["phase2_edge"], fontsize=9)
    _box(ax, 7.4, 4.6, 1.8, 1.0, "Worker",
         COLORS["phase2"], COLORS["phase2_edge"], fontsize=10, fontweight="bold")
    _box(ax, 9.7, 4.6, 1.0, 1.0, "Lock\n(per-ticket)",
         COLORS["accent"], COLORS["accent_edge"], fontsize=8)

    for x1, x2 in [(2.3, 2.8), (4.8, 5.3), (6.9, 7.4), (9.2, 9.7)]:
        _arrow(ax, x1, 5.1, x2, 5.1)

    _box(ax, 1.0, 2.0, 8.0, 1.8,
         "Worker steps:\n"
         "  1. fetch ticket + siblings + label matches  (PM adapter)\n"
         "  2. read records across repos/  (in brain repo)\n"
         "  3. blocks: hotspot → estimate → edge_mine.dedup → coverage_gap\n"
         "  4. render groom output (markdown)\n"
         "  5. find/edit existing bot comment OR post new (Aha API)",
         COLORS["box"], COLORS["box_edge"], fontsize=10)

    _arrow(ax, 8.3, 4.6, 5.5, 3.8, style="-|>", lw=1.4)

    _box(ax, 0.5, 0.3, 4.5, 1.2,
         "Append to audit log\n(timestamp · cmd · ticket · cost · run_id)",
         COLORS["phase3"], COLORS["phase3_edge"], fontsize=9)
    _box(ax, 6.0, 0.3, 4.5, 1.2,
         "Spam guards:\n• edit-in-place (one bot comment / cmd / ticket)\n"
         "• content-hash dedupe   • cooldown   • opt-in label",
         COLORS["accent"], COLORS["accent_edge"], fontsize=9, fontweight="bold")
    _arrow(ax, 3.5, 2.0, 2.5, 1.5)
    _arrow(ax, 7.0, 2.0, 8.0, 1.5)

    fig.tight_layout()
    fig.savefig(out / "bot-flow.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="assets",
                        help="output directory; defaults to assets/")
    args = parser.parse_args()

    here = Path(__file__).resolve().parent.parent
    out = (here / args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)

    print(f"rendering to {out}")
    render_lifecycle(out)
    render_architecture(out)
    render_pm_workflow(out)
    render_engineer_workflow(out)
    render_bot_flow(out)
    print("done.")

    demo = (here / "demo" / "diagrams").resolve()
    demo.mkdir(parents=True, exist_ok=True)
    for png in out.glob("*.png"):
        shutil.copy2(png, demo / png.name)
    print(f"copied to {demo}")


if __name__ == "__main__":
    main()
