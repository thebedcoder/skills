## `/status` — Progress Overview

**Agent:** PROD

### Step 1 — Read focus state

Read `.agentic/focus.md` if it exists. Parse:
- CURRENT: `title`, `feature`, `since`, `set_by`, `note`
- NEXT: ordered numbered list

Stale check: if CURRENT.`since` ≥ 7 days ago, flag with ⚠️.

### Step 2 — Read project state

Read `./docs/INDEX.md`, `./docs/BACKLOG.md`, then scan all `./docs/features/*/STORIES.md` + `PROGRESS.md`.

### Step 3 — Render

```
━━━ PROJECT STATUS ━━━

FOCUS 🎯 [CURRENT.title]  ([feature], since [HH:MM], via [set_by])[⚠️ stale (Nd old) if ≥ 7d]
NEXT   1. [item 1]
       2. [item 2]
       ...

Features: X total

[Feature Name] — in-progress
  Completed: X / Y stories
  Tests: M/N AC mapped across K shipped stories (P% · G gaps)
  DONE ✅   STORY-001: [title]
  UP NEXT 🔜 STORY-002: [title] ← recommended next
  BLOCKED ⚠️ STORY-003: [reason]

[Feature Name] — complete ✅
  All X stories shipped

[Feature Name] — planning 📋
  Stories not yet created — run /feature [name] to start

BACKLOG 📋 — X items
  NOTE-001: [title] — bug / S / high
  NOTE-002: [title] — idea / M / medium
  (run /ship to pick one up and implement it)

ARCH NOTE: [any cross-feature technical concerns?]
```

Rendering rules:
- CURRENT empty (or file absent) → `FOCUS 🎯 (none — run /focus <text> to set)`
- NEXT empty → omit the entire NEXT block
- Stale → append `⚠️ stale (Nd old) — still working on this?`
- CURRENT.`set_by` may contain ` (auto)` or ` (auto-promoted)` suffix from auto mode — render as-is
- **Tests rollup:** Iterate each feature's shipped stories. For each story with `### AC Coverage` in PROGRESS.md, parse the table. M = count of rows where the Tests cell is non-empty. N = count of AC rows. K = count of stories with a matrix. P = `M / N * 100` rounded to integer. G = count of AC rows with empty Tests cell. Pre-matrix stories (no `### AC Coverage` heading) are excluded from M, N, K, G. Omit the entire "Tests:" line if no shipped story has a matrix yet (avoids `0/0`).

---
