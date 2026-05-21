---
name: loom-link
description: Hosted recordings via external service; paste URL into the Visual Artifacts table
platforms: [any]
mechanism: external-link
detection: []
output_dir: n/a
---

# Loom / hosted recording link

Capture via Loom, Notion video, YouTube unlisted, Vimeo, or any hosted recording service. Reference the URL directly in PROGRESS.md — no file lives in the repo.

## One-time setup

Account on the chosen hosted service. Loom is the most common (free tier available, browser extension or desktop app).

## Operator workflow

1. Record the UI flow via the hosted service.
2. Set sharing to organization-wide or unlisted (no public).
3. Copy the share URL.
4. Add a row to PROGRESS.md's `### Visual Artifacts` table with the URL in the `File` cell:

   ```markdown
   | AC-2 | loom-link | https://www.loom.com/share/abc123 | Signup flow end-to-end |
   ```

## Where captures land

External hosting (no file in repo). `ae-ux` recognizes `http://` / `https://` prefixes and skips file-existence validation for URL rows.

## /ship Phase 4 integration

When `.claude/visual-capture.md` declares `mechanism: external-link`, `/ship` Phase 4 emits a reminder to record + paste URL — no dispatch, no automation.
