## `/status` — Progress Overview

**Agent:** PROD

### Step 1 — Read focus state

Read `.agentic/focus.md` if it exists. Parse:
- CURRENT: `title`, `feature`, `since`, `set_by`, `note`
- PLAN: checklist, ticked + pending
- NEXT: ordered numbered list

Stale check: if CURRENT.`since` ≥ 7 days ago, flag with ⚠️.

### Step 2 — Read project state

Read `./docs/INDEX.md` (including its `mode:` frontmatter), `./docs/BACKLOG.md`, then scan all `./docs/features/*/STORIES.md` + `PROGRESS.md`.

Mode gates what counts as a gap. In `lite`, absent `PRD.md`, `EPICS.md`, `docs/specs/`, `improvements.md`, and `app-docs/` are **expected** — never report them as missing. In `full` they're reportable gaps. No `mode:` key → treat as `full`. See `shared/project-mode.md`.

Feature marked `archived` in INDEX (or has `SUMMARY.md` + no `STORIES.md`) → read `SUMMARY.md` only. Never scan archived features for stories or progress.

### Step 2b — Worktrees

`bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree.sh where`:
- `MAIN` → `worktree.sh list` — the worktrees this workflow made, one `WORKTREE …` line each.
- `WORKTREE … main=<root>` → this session runs inside one; note its branch and main folder, skip the list (it runs from the main folder only).

Nothing to show → omit the block.

### Step 3 — Render

```
━━━ PROJECT STATUS ━━━  [lite]

FOCUS 🎯 [CURRENT.title]  ([feature], since [HH:MM], via [set_by])[⚠️ stale (Nd old) if ≥ 7d]
PLAN   ✅ [completed step]
       ⬜ [pending step]
NEXT   1. [item 1]
       2. [item 2]
       ...

Features: X total

[Feature Name] — in-progress
  Completed: X / Y stories
  MVP: A / B P1 stories shipped
  Tests: M/N AC mapped across K shipped stories (P% · G gaps)
  Pyramid: unit U · integration I · e2e E (balanced) [⚠️ if inverted at feature scope]
  DONE ✅   STORY-001: [title]
  UP NEXT 🔜 STORY-002: [title] ← recommended next
  BLOCKED ⚠️ STORY-003: [reason]

[Feature Name] — complete ✅
  All X stories shipped
  (run /archive [name] to compact docs)

[Feature Name] — archived 📦
  X stories shipped — see SUMMARY.md

[Feature Name] — planning 📋
  Stories not yet created — run /feature [name] to start

WORKTREES 🌿 — X  (finish from the main folder: /worktree)
  fix-login   fix/login             task   clean · 2 ahead of main · not merged
  story-003   feat/notes-story-003  story  dirty · work in progress
  [or, inside one: "You are in worktree fix/login — main folder /path/to/app"]

BACKLOG 📋 — X items
  NOTE-001: [title] — bug / S / high
  NOTE-002: [title] — idea / M / medium
  (run /ship to pick one up and implement it)

ARCH NOTE: [any cross-feature technical concerns?]

Next: [one runnable line — the UP NEXT story → /ship STORY-XXX · a finished worktree → /worktree · nothing open → /feature or /note]
```

Rendering rules:
- Header carries the mode tag: `[lite]` or `[full]`. Marker missing → `[full]`.
- CURRENT empty (or file absent) → `FOCUS 🎯 (none — run /focus <text> to set)`
- PLAN empty or absent → omit the entire PLAN block. Cap at 5 lines per SKILL.md — more than 5 steps → show the pending ones plus `+N done`.
- NEXT empty → omit the entire NEXT block
- WORKTREES: omit when `list` prints nothing. Order: unmerged with commits first (they wait on a decision), then dirty, then merged-but-not-removed.
- Stale → append `⚠️ stale (Nd old) — still working on this?`
- CURRENT.`set_by` may contain ` (auto)` or ` (auto-promoted)` suffix from auto mode — render as-is
- **Archived features:** excluded from Tests/Pyramid rollups — their `PROGRESS.md` is gone; frozen rollup lives in their `SUMMARY.md`. Story count for the archived line comes from `SUMMARY.md`.
- **MVP line:** `B` = unchecked-or-checked stories carrying `**Priority:** P1`, `A` = the checked subset. Omit when no story carries `Priority:` — the feature predates the field, and `0 / 0` reads as a failure. `A == B` with stories still open → append ` — MVP complete, remainder is P2/P3`.
- **UP NEXT respects priority.** Recommended next is the lowest-numbered priority level with an unchecked, unblocked story — never a P2 while a P1 is open. Tie inside a level → file order. Unprioritised feature → file order.
- **Tests rollup:** Iterate each feature's shipped stories. For each story with `### AC Coverage` in PROGRESS.md, parse the table. M = count of rows where the Tests cell is non-empty. N = count of AC rows. K = count of stories with a matrix. P = `M / N * 100` rounded to integer. G = count of AC rows with empty Tests cell. Pre-matrix stories (no `### AC Coverage` heading) are excluded from M, N, K, G. Omit the entire "Tests:" line if no shipped story has a matrix yet (avoids `0/0`).
- **Pyramid rollup:** Aggregate `unit_count`, `integration_count`, `e2e_count` across all shipped stories with a 4-column `### AC Coverage` matrix. Skip pre-pyramid (3-column) stories and non-canonical-level rows. Compute `total = unit + integration + e2e`. If `total == 0` (no 4-column stories yet, or all rows non-canonical) → omit the entire `Pyramid:` line. Otherwise render `Pyramid: unit U · integration I · e2e E (balanced)`. If `e2e_count / total > 0.5` OR `unit_count == 0` → append `(inverted — X% e2e, consider extracting unit tests) ⚠️` instead of `(balanced)`.

---
