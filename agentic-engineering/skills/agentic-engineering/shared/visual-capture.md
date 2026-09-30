# Visual capture dispatch

Read only when `./.claude/visual-capture.md` exists (written by `/init` from `${CLAUDE_PLUGIN_ROOT}/capture-tools/`). Runs as the tail of `/ship` Phase 3 — after the frontend commit, before the Phase 4 review that consumes what it produced.

## Dispatch

1. Read `./.claude/visual-capture.md`. If absent → emit reminder (manual-capture fallback) and proceed to Phase 4 review.
2. Parse `mechanism:` field. Dispatch:
   - `test-runner` / `script` → run the declared `## Capture command` via Bash, capture exit code
   - `mcp` → use the declared MCP tools per AC, capture per-AC, write to artifacts dir directly
   - `manual` → emit reminder, proceed
   - `external-link` → emit reminder to record + paste URLs, proceed
3. On dispatch success (`test-runner` / `script`):
   - Scan declared `output_dir:` for new files
   - For each file, match against AC Coverage matrix Tests cells when possible
   - Move/copy into `docs/features/<feature-name>/artifacts/STORY-XXX/<file>`
   - Append rows to PROGRESS.md Visual Artifacts table; tag Notes cell with `(auto, backfill scenario)` or `(auto, no test-match, backfill AC)`
4. On dispatch failure (non-zero exit, missing files): emit warning, do NOT block ship chain. Operator captures manually for this story.
5. Proceed to Phase 4 review (the 6-agent batch).

**Capture runs in Phase 3, not Phase 4.** It is the tail of the frontend pass; Phase 4 is the review that consumes what it produced. Docs elsewhere that say "Phase 4 dispatches capture" mean this step.

## Auto-appended rows

**`(auto)` row marker:** When `/ship` Phase 3 dispatches a capture tool, rows it auto-appends to the Visual Artifacts table use a Notes prefix:

- `(auto, backfill scenario)` — capture matched an AC via test name; operator updates the Notes column with viewport / browser / scenario context
- `(auto, no test-match, backfill AC)` — capture didn't match any AC matrix Tests cell; operator corrects the AC column AND backfills scenario

Operator removes the `(auto, ...)` prefix from Notes once the row is reviewed and accurate. `ae-ux` doesn't validate Notes content — the marker is human-facing only.
