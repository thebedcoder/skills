#!/usr/bin/env bash
# /converge reports a CHECKED story whose code does not exist as a Blocker —
# the false-completion case it exists to catch — and does not report the
# delivered requirement.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_OUT/project"
fixture_base "$P" full
mkdir -p "$P/docs/features/notes/reviews"
fixture_feature_row "$P" notes in-progress
cat > "$P/docs/features/notes/PRD.md" <<'MD'
# Notes — PRD

**Status:** approved

## Problem
Users need to keep short text notes.

## Acceptance Criteria

- FR-1: A user can create a note with a text body; `createNote(body)` returns the new note with an id.
- FR-2: A user can delete a note by id; `deleteNote(id)` removes it and returns true, or false when no such note exists.
MD
cat > "$P/docs/features/notes/STORIES.md" <<'MD'
## Notes — Stories

- [x] STORY-001: Create a note
  **As a** user, **I want** to create a note **so that** I can keep text
  **Priority:** P1
  **Implements:** FR-1
  **Acceptance Criteria:**
  - [x] AC-1: createNote("hi") returns { id, body: "hi" }

- [x] STORY-002: Delete a note
  **As a** user, **I want** to delete a note **so that** I can remove what I no longer need
  **Priority:** P1
  **Implements:** FR-2
  **Acceptance Criteria:**
  - [x] AC-1: deleteNote(id) removes the note and returns true
  - [x] AC-2: deleteNote(unknownId) returns false
MD
cat > "$P/src/notes.js" <<'JS'
const notes = new Map();
let nextId = 1;

export function createNote(body) {
  const note = { id: nextId++, body };
  notes.set(note.id, note);
  return note;
}
JS
cat > "$P/test/notes.test.js" <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNote } from '../src/notes.js';

test('createNote returns the note with an id', () => {
  const n = createNote('hi');
  assert.equal(n.body, 'hi');
  assert.ok(n.id);
});
JS
cat > "$P/docs/features/notes/PROGRESS.md" <<'MD'
# Notes — Progress

## STORY-001: Create a note — 2026-09-20

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | createNote("hi") returns { id, body: "hi" } | test/notes.test.js:createNote returns the note with an id | unit |

### Files changed
- src/notes.js
- test/notes.test.js

## STORY-002: Delete a note — 2026-09-22

### Files changed
- src/notes.js
MD
fixture_commit "$P" "feat(notes): STORY-001, STORY-002"
fixture_branch "$P" feat/notes
before="$(cd "$P" && git rev-parse HEAD && git status --porcelain -- src test)"

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" "/agentic-engineering:converge notes" 2 \
  "Stop after printing the report; do not append stories."

T="$AE_OUT/transcript.jsonl"
ae_check "run completed" test "$(cat "$T.rc")" = 0
# The Blockers block is everything between 'Blockers' and the next section label.
cat > "$AE_OUT/blockers.py" <<'PY'
import re, subprocess, sys
text = subprocess.run([sys.executable, sys.argv[1], "text", sys.argv[2]], capture_output=True, text=True).stdout
m = re.search(r"Blockers?:?(.*?)(?:\n\s*(?:\*\*)?(?:Should-fix|Won't-fix|Converged|Pending)\b|\Z)", text, re.S | re.I)
block = m.group(1) if m else ""
print(block.strip()[:800] or "(no Blockers section)")
want, unwanted = sys.argv[3], sys.argv[4]
ok = want in block and not re.search(rf"{unwanted}\b.*(missing|partial|contradict)", block, re.I)
sys.exit(0 if ok else 1)
PY
ae_check "FR-2 (checked STORY-002, no deleteNote) reported as a Blocker; FR-1 not a gap" \
  python3 "$AE_OUT/blockers.py" "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$T" "FR-2" "FR-1"
ae_check "converge touched no code" bash -c "
  after=\"\$(cd '$P' && git rev-parse HEAD && git status --porcelain -- src test)\"; [ \"\$after\" = '$before' ]"
ae_done
