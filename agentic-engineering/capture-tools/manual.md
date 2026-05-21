---
name: manual
description: Operator captures screenshots/recordings by hand; no automation
platforms: [any]
mechanism: manual
detection: []
output_dir: n/a
---

# Manual capture

Always-available fallback. Operator captures by any means — OS screenshot tools, browser devtools, mobile screen recording, etc. — and drops files into the project's story-scoped artifacts directory.

## One-time setup

None.

## Operator workflow

1. Implement the UI behavior for the story.
2. For each AC, capture the relevant UI state(s) by hand:
   - macOS: `Cmd+Shift+4` (region screenshot) or `Cmd+Shift+5` (recording)
   - Windows: `Win+Shift+S` or Game Bar `Win+G`
   - Linux: `gnome-screenshot`, `scrot`, `flameshot`
   - Mobile: device screenshot/recording shortcuts (varies by platform)
   - Browser DevTools: device-mode screenshots, full-page captures
3. Drop files into `docs/features/<feature-name>/artifacts/STORY-XXX/`.
4. Add one row to PROGRESS.md's `### Visual Artifacts` table per file:

   ```markdown
   | AC-1 | screenshot | artifacts/STORY-005/ac-1-happy.png | Desktop Chrome, 1440x900 |
   ```

## Where captures land

Wherever the operator chooses inside `docs/features/<feature-name>/artifacts/STORY-XXX/`. Filenames aren't validated against a pattern — the matrix's `File` column is the source of truth.

## /ship Phase 4 integration

When `.claude/visual-capture.md` declares `mechanism: manual`, `/ship` Phase 4 emits a reminder only — no dispatch, no automation. Operator has already captured (or captures now, before continuing).
