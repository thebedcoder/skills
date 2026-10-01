#!/usr/bin/env bash
# /archive deletes working docs, so it runs in two phases.
#   A. /archive notes proposes: SUMMARY.md, the extract (a decision PROGRESS.md
#      holds but DECISIONS.md lacks, an "Open at completion" obligation) and the
#      deletion plan. Nothing deleted, DECISIONS.md and BACKLOG.md untouched.
#   B. /archive --apply writes the decision and obligation, deletes the originals,
#      keeps SUMMARY.md and data-model.md, marks the feature archived, one commit.
#      The unshipped feature is never touched.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
fixture_base "$P" full
F="$P/docs/features/notes"
mkdir -p "$F/reviews" "$P/docs/features/export"
cat > "$P/docs/INDEX.md" <<'MD'
---
mode: full
---

# Docs Index

## Features

| Feature | Status | Folder |
|---------|--------|--------|
| notes | complete ✅ 2/2 | docs/features/notes/ |
| export | planning 📋 | docs/features/export/ |
MD
cat > "$F/PRD.md" <<'MD'
# Notes — PRD
- **FR-1:** User can create a note.
- **FR-2:** User can list notes, newest first.
MD
cat > "$F/STORIES.md" <<'MD'
# Notes — Stories
- [x] STORY-001: Create a note
  **Implements:** FR-1
- [x] STORY-002: List notes newest first
  **Implements:** FR-2
MD
cat > "$F/PROGRESS.md" <<'MD'
# Notes — Progress

## STORY-001: Create a note — 2026-09-20
Notes are stored in one JSON file, `data/notes.json`, instead of SQLite: no native
dependency, and every later feature reads notes through that file. Changing the
storage format means migrating every reader.

### Files changed
- src/notes.js

## STORY-002: List notes newest first — 2026-09-22

### Open at completion
- Listing more than 10,000 notes was never measured; the performance check was
  overridden at ship time and still needs a real number.

### Files changed
- src/notes.js
MD
printf '# Notes — data model\n\nnote: { id: number, title: string, createdAt: number }\n' > "$F/data-model.md"
printf '# STORY-001 review\n\nClean.\n' > "$F/reviews/STORY-001-review.md"
cat > "$P/docs/DECISIONS.md" <<'MD'
# Decisions

## DEC-001 — ES modules only, no CommonJS
date: 2026-09-01 · story: — · status: active

**Chose:** ESM. **Because:** Node 20+ only. **Rules out:** require().
MD
printf '# Export — Stories\n- [ ] STORY-010: Export notes as CSV\n' > "$P/docs/features/export/STORIES.md"
fixture_commit "$P" "docs: notes shipped, export planned"
DEC_BEFORE="$(cat "$P/docs/DECISIONS.md")"; BL_BEFORE="$(cat "$P/docs/BACKLOG.md")"
export DEC_BEFORE BL_BEFORE

# --- A: propose ------------------------------------------------------------------
ae_run_claude "$P" "$AE_OUT/propose.jsonl" "/agentic-engineering:archive notes" 3
ae_check "A: run completed" test "$(cat "$AE_OUT/propose.jsonl.rc")" = 0
ae_check "A: nothing deleted before approval" bash -c "
  test -f '$F/PRD.md' && test -f '$F/STORIES.md' && test -f '$F/PROGRESS.md' && test -f '$F/reviews/STORY-001-review.md'"
ae_check "A: SUMMARY.md proposed" test -s "$F/SUMMARY.md"
ae_check "A: extract carries the JSON-storage decision and the 10k-notes obligation" bash -c "
  grep -qi 'json' '$P/.agentic/archive-extract.md' && grep -qiE '10,?000' '$P/.agentic/archive-extract.md'"
ae_check "A: DECISIONS.md and BACKLOG.md not written in phase 1" bash -c "
  [ \"\$(cat '$P/docs/DECISIONS.md')\" = \"\$DEC_BEFORE\" ] && [ \"\$(cat '$P/docs/BACKLOG.md')\" = \"\$BL_BEFORE\" ]"

# --- B: apply --------------------------------------------------------------------
head_a="$(git -C "$P" rev-parse HEAD)"
ae_run_claude "$P" "$AE_OUT/apply.jsonl" "/agentic-engineering:archive --apply" 3
ae_check "B: run completed" test "$(cat "$AE_OUT/apply.jsonl.rc")" = 0
ae_check "B: decision appended to DECISIONS.md, existing entry kept" bash -c "
  grep -qi 'json' '$P/docs/DECISIONS.md' && grep -q '^## DEC-001' '$P/docs/DECISIONS.md' && grep -q '^## DEC-002' '$P/docs/DECISIONS.md'"
ae_check "B: obligation appended to BACKLOG.md" bash -c "grep -qiE '10,?000' '$P/docs/BACKLOG.md'"
ae_check "B: originals deleted; SUMMARY.md and data-model.md kept" bash -c "
  ! test -e '$F/PRD.md' && ! test -e '$F/STORIES.md' && ! test -e '$F/PROGRESS.md' && ! test -e '$F/reviews' &&
  test -s '$F/SUMMARY.md' && test -f '$F/data-model.md'"
ae_check "B: INDEX marks notes archived" bash -c "grep -E '^\| notes ' '$P/docs/INDEX.md' | grep -qi archived"
ae_check "B: one archive commit for the feature" bash -c "
  git -C '$P' log --format=%s '$head_a'..HEAD | grep -c 'archive' | grep -qx 1"
ae_check "B: unshipped feature untouched" test -f "$P/docs/features/export/STORIES.md"
ae_check "B: staging files removed after apply" bash -c "
  ! test -e '$P/.agentic/archive-extract.md' && ! test -e '$P/.agentic/archive-plan.md'"
ae_done
