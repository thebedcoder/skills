#!/usr/bin/env bash
# P2-b: REQ treats a story checked in the diff without a fresh evidence row as a
# Blocker, and clears it once a real run on the current code is recorded.
# Runs ae-req directly (--agent) with the inputs /review would hand it — cheap,
# and it isolates the agent's rule from the parent's orchestration.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

EV="$AE_PLUGIN_ROOT/scripts/evidence.sh"
P="$AE_WORK/project"
fixture_base "$P" lite
fixture_branch "$P" feat/multiply
mkdir -p "$P/docs/features/main/reviews" "$P/.agentic/review"
fixture_feature_row "$P" main in-progress
# A real green run on the code BEFORE multiply existed: the classic "passed
# earlier". Recorded through the script, so the ledger knows it — the verdict
# must come out stale, not unverified.
old_row="$(cd "$P" && bash "$EV" run --phase implement -- npm test 2>/dev/null | sed -n 's/^EVIDENCE-ROW: //p')"
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
# The green row from that older run, copied forward.
write_progress "$old_row"
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
AE_TEST_MODEL=sonnet ae_run_claude "$P" "$AE_OUT/stale.jsonl" "$PROMPT" 1 "" -- --agent agentic-engineering:ae-req
# Verdict = the text right after each "EVIDENCE" mention, whatever the layout
# (one line, or a bold header with the verdict underneath).
cat > "$AE_OUT/verdict.py" <<'PY'
import re, subprocess, sys
text = subprocess.run([sys.executable, sys.argv[1], "text", sys.argv[2]], capture_output=True, text=True).stdout
wins = [text[m.start():m.start() + 220] for m in re.finditer(r"EVIDENCE", text, re.I)]
blocked = any(re.search(r"❌|\bBLOCKER\b(?!s)", w) and not re.search(r"\bno blockers?\b", w, re.I) or "❌" in w for w in wins)
fresh = any(re.search(r"✅|\bfresh\b", w, re.I) for w in wins)
print("windows:", *[" ".join(w.split())[:160] for w in wins[:4]], sep="\n  ")
want = sys.argv[3]
sys.exit(0 if (want == "blocked" and blocked) or (want == "fresh" and fresh and not blocked) else 1)
PY
ae_check "stale evidence on a story ticked in the diff → REQ reports an EVIDENCE blocker" \
  python3 "$AE_OUT/verdict.py" "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$AE_OUT/stale.jsonl" blocked

# Now the honest path: run the suite on this code and record the row it prints.
row="$(cd "$P" && bash "$EV" run --phase implement -- npm test 2>/dev/null | sed -n 's/^EVIDENCE-ROW: //p')"
ae_check "fixture: real run is green" bash -c "printf '%s' '$row' | grep -q 'exit 0'"
write_progress "$row"
fixture_commit "$P" "docs(main): STORY-001 — evidence"
review_inputs
ae_check "fixture: evidence check now fresh" grep -q '^EVIDENCE: fresh' "$P/.agentic/review/STORY-001.evidence"
AE_TEST_MODEL=sonnet ae_run_claude "$P" "$AE_OUT/fresh.jsonl" "$PROMPT" 1 "" -- --agent agentic-engineering:ae-req
ae_check "fresh evidence → REQ reports EVIDENCE ✅, no evidence blocker" \
  python3 "$AE_OUT/verdict.py" "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$AE_OUT/fresh.jsonl" fresh
ae_check "REQ wrote nothing to the repo" bash -c "cd '$P' && [ -z \"\$(git status --porcelain)\" ]"
ae_done
