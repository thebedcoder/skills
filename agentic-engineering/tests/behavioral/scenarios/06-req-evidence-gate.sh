#!/usr/bin/env bash
# P2-b: REQ treats a story checked in the diff without a fresh evidence row as a
# Blocker, and clears it once a real run on the current code is recorded.
# Runs ae-req directly (--agent) with the inputs /review would hand it — cheap,
# and it isolates the agent's rule from the parent's orchestration.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

EV="$AE_PLUGIN_ROOT/scripts/evidence.sh"
P="$AE_OUT/project"
fixture_base "$P" lite
fixture_branch "$P" feat/multiply
mkdir -p "$P/docs/features/main/reviews" "$P/.agentic/review"
fixture_feature_row "$P" main in-progress
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
JS
cat > "$P/docs/features/main/STORIES.md" <<'MD'
## Main — Stories

- [x] STORY-001: Multiply two numbers
  **As a** developer, **I want** a multiply(a, b) helper **so that** callers stop hand-rolling it
  **Priority:** P1
  **Acceptance Criteria:**
  - [x] AC-1: multiply(2, 3) returns 6
MD
write_progress() {
  cat > "$P/docs/features/main/PROGRESS.md" <<MD
# Main — Progress

## STORY-001: Multiply two numbers — 2026-09-30

### AC Coverage
| AC | Description | Tests | Level |
|----|-------------|-------|-------|
| AC-1 | multiply(2, 3) returns 6 | test/math.test.js:multiply returns the product | unit |

### Evidence
| Phase | Command | Result | Run at | Tree |
|-------|---------|--------|--------|------|
$1

### Files changed
- src/math.js
- test/math.test.js
MD
}
# A green row copied from a run on older code: the classic "passed earlier".
write_progress '| implement | `npm test` | exit 0 · pass 1 · fail 0 | 2026-09-29 16:00 | 0a1b2c3d4e5f |'
fixture_commit "$P" "feat(main): STORY-001 — multiply"

review_inputs() {
  ( cd "$P" && git diff main...HEAD > .agentic/review/STORY-001.diff
    bash "$EV" check docs/features/main/PROGRESS.md STORY-001 --diff .agentic/review/STORY-001.diff \
      > .agentic/review/STORY-001.evidence; true )
}
PROMPT="Mode A. Review STORY-001 in docs/features/main/STORIES.md.
Inputs: docs/CONSTITUTION.md, docs/features/main/PROGRESS.md, changed files src/math.js and test/math.test.js,
diff .agentic/review/STORY-001.diff, evidence verdict .agentic/review/STORY-001.evidence.
Plugin root: $AE_PLUGIN_ROOT. Do NOT write, edit, or create any file in the repository."

review_inputs
ae_check "fixture: evidence check reports stale, ticked in this diff" \
  grep -q '^EVIDENCE: stale story=STORY-001 checked_in_diff=yes' "$P/.agentic/review/STORY-001.evidence"
AE_TEST_MODEL=haiku ae_run_claude "$P" "$AE_OUT/stale.jsonl" "$PROMPT" 1 "" -- --agent agentic-engineering:ae-req
ae_check "stale evidence on a story ticked in the diff → REQ reports an EVIDENCE blocker" bash -c "
  python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/stale.jsonl' | grep -E 'EVIDENCE' | grep -qiE '❌|BLOCKER'"

# Now the honest path: run the suite on this code and record the row it prints.
row="$(cd "$P" && bash "$EV" run --phase implement -- npm test 2>/dev/null | sed -n 's/^EVIDENCE-ROW: //p')"
ae_check "fixture: real run is green" bash -c "printf '%s' '$row' | grep -q 'exit 0'"
write_progress "$row"
fixture_commit "$P" "docs(main): STORY-001 — evidence"
review_inputs
ae_check "fixture: evidence check now fresh" grep -q '^EVIDENCE: fresh' "$P/.agentic/review/STORY-001.evidence"
AE_TEST_MODEL=haiku ae_run_claude "$P" "$AE_OUT/fresh.jsonl" "$PROMPT" 1 "" -- --agent agentic-engineering:ae-req
ae_check "fresh evidence → REQ reports EVIDENCE ✅, no evidence blocker" bash -c "
  t=\$(python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/fresh.jsonl');
  echo \"\$t\" | grep -E 'EVIDENCE' | grep -q '✅' && ! echo \"\$t\" | grep -E 'EVIDENCE' | grep -qiE '❌|BLOCKER'"
ae_check "REQ wrote nothing to the repo" bash -c "cd '$P' && [ -z \"\$(git status --porcelain)\" ]"
ae_done
