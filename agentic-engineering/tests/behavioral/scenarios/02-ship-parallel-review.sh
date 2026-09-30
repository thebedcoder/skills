#!/usr/bin/env bash
# /ship Phase 2 dispatches all seven reviewers in ONE assistant message.
# Sequential dispatch is the failure commands/review.md calls out by name; it
# still produces a normal-looking report, so only the transcript can show it.
#
# Cost control: the story is already implemented and committed, PLAN line 1 is
# ticked, and the harness asks the run to resume at Phase 2 and stop after the
# review is consolidated.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_OUT/project"
fixture_base "$P" lite
fixture_branch "$P" feat/multiply
mkdir -p "$P/docs/features/main/reviews"
fixture_feature_row "$P" main in-progress
cat > "$P/docs/features/main/STORIES.md" <<'MD'
## Main — Stories

- [x] STORY-001: Multiply two numbers
  **As a** developer, **I want** a multiply(a, b) helper **so that** callers stop hand-rolling it
  **Priority:** P1
  **Acceptance Criteria:**
  - [x] AC-1: multiply(2, 3) returns 6
  - [x] AC-2: multiply with a zero operand returns 0
  **Parallel:** yes — no dependency on other stories
MD
cat >> "$P/src/math.js" <<'JS'

export function multiply(a, b) {
  return a * b;
}
JS
cat >> "$P/test/math.test.js" <<'JS'

import { multiply } from '../src/math.js';

test('multiply returns the product', () => {
  assert.equal(multiply(2, 3), 6);
});

test('multiply with zero returns 0', () => {
  assert.equal(multiply(0, 5), 0);
});
JS
cat > "$P/docs/features/main/PROGRESS.md" <<'MD'
# Main — Progress

## STORY-001: Multiply two numbers — 2026-09-30

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | multiply(2, 3) returns 6 | test/math.test.js:multiply returns the product | unit |
| AC-2 | multiply with a zero operand returns 0 | test/math.test.js:multiply with zero returns 0 | unit |

### Files changed
- src/math.js
- test/math.test.js
MD
fixture_commit "$P" "feat(main): STORY-001 — multiply two numbers"
fixture_focus "$P" "STORY-001 — Multiply two numbers" main "/ship" \
  "Implement STORY-001 backend + tests" -- "Backend review — 7-agent batch" "Frontend from design handoff" \
  "Frontend review — 6-agent + ae-ux fidelity" "End-user docs + changelogs" "PR description from git log" \
  "Cleanup — decisions + memory"

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" "/agentic-engineering:ship --auto" 5 \
  "Harness setup: STORY-001's Phase 1 is complete and committed (PLAN line 1 is ticked in .agentic/focus.md). Resume this /ship chain at Phase 2 — the backend review — for STORY-001, and stop after the Phase 2 review is consolidated and printed. Do not run Phase 3 or any later phase."

ae_check "run completed" test "$(cat "$AE_OUT/transcript.jsonl.rc")" = 0
ae_check "all seven reviewers dispatched in one assistant message" \
  ae_transcript batch "$AE_OUT/transcript.jsonl" ae-red,ae-req,ae-test,ae-doc,ae-sec,ae-edge,ae-lean
ae_done
