#!/usr/bin/env bash
# X5: a [P] group builds in parallel in ONE session — one isolated ae-impl per
# story, dispatched in one message, each pinned to the feature branch. The fixture
# has an origin whose main lacks STORY-001 (shipped on the feature branch only), and
# both [P] stories build on STORY-001's multiply(): a worktree left on Claude Code's
# default base (origin's main) cannot pass. Merged back with both PROGRESS entries,
# one green run on the merged result, worktrees removed, no code in the main thread.
#
# Cost control: the harness answers the start question and stops after §P5.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
fixture_base "$P" lite
# An origin whose default branch is main: Claude Code's "fresh" worktree base.
git clone -q --bare "$P" "$AE_WORK/origin.git"
( cd "$P" && git remote add origin "$AE_WORK/origin.git" && git fetch -q origin && git remote set-head origin main )
fixture_branch "$P" feat/arith
mkdir -p "$P/docs/features/arith/reviews"
fixture_feature_row "$P" arith in-progress
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
cat > "$P/docs/features/arith/STORIES.md" <<'MD'
## Arith — Stories

- [x] STORY-001: Multiply two numbers
  **Priority:** P1
  **Acceptance Criteria:**
  - [x] AC-1: multiply(2, 3) returns 6 (src/math.js)

- [ ] STORY-002: Double a number [P]
  **As a** developer, **I want** double(n) **so that** scaling reads clearly
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: src/double.js exports double(n), returning multiply(n, 2) imported from src/math.js; double(4) returns 8
  **Notes:** tests in test/double.test.js; builds on STORY-001's multiply
  **Parallel:** yes — no dependency on STORY-003

- [ ] STORY-003: Square a number [P]
  **As a** developer, **I want** square(n) **so that** area code reads clearly
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: src/square.js exports square(n), returning multiply(n, n) imported from src/math.js; square(5) returns 25
  **Notes:** tests in test/square.test.js; builds on STORY-001's multiply
  **Parallel:** yes — no dependency on STORY-002
MD
printf '# Arith — Progress\n' > "$P/docs/features/arith/PROGRESS.md"
fixture_commit "$P" "feat(arith): STORY-001 — multiply; plan STORY-002, STORY-003"
BASE_SHA="$(git -C "$P" rev-parse HEAD)"

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" "/agentic-engineering:ship-all" 6 \
  "Harness: the human already answered the start question — Ship everything; for the [P] group STORY-002 and STORY-003: In parallel, here. For cost, take that group through shared/parallel-build.md §P1 to §P5 (plan, parallel build, verify, merge, merged evidence, tick) and then stop: skip §P6 and every later /ship phase."

T="$AE_OUT/transcript.jsonl"
ae_check "run completed" test "$(cat "$T.rc")" = 0
ae_check "two isolated ae-impl in ONE message, each pinned to the feature commit" \
  python3 - "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$T" "$BASE_SHA" <<'PY'
import json, re, subprocess, sys
lib, path, sha = sys.argv[1:4]
out = subprocess.run([sys.executable, lib, "tools", path, "Agent"], capture_output=True, text=True).stdout
calls = []
for line in out.splitlines():
    m = re.match(r"L(\d+) Agent (.*)$", line)
    if m:
        inp = json.loads(m.group(2))
        if inp.get("subagent_type") == "agentic-engineering:ae-impl":
            calls.append((int(m.group(1)), inp))
groups = json.loads(subprocess.run([sys.executable, lib, "dispatches", path], capture_output=True, text=True).stdout)
together = [g for g in groups if g["agents"].count("agentic-engineering:ae-impl") >= 2]
pinned = [c for c in calls if c[1].get("isolation") == "worktree"
          and re.search(r"pin:\s*" + sha[:7], str(c[1].get("prompt", "")))]
print(f"ae-impl calls: {len(calls)} · in one message: {bool(together)} · isolated+pinned to {sha[:7]}: {len(pinned)}")
sys.exit(0 if together and len(pinned) >= 2 else 1)
PY
ae_check "both stories ticked on the feature branch" bash -c "
  grep -q -- '- \[x\] STORY-002' '$P/docs/features/arith/STORIES.md' && grep -q -- '- \[x\] STORY-003' '$P/docs/features/arith/STORIES.md'"
ae_check "both stories merged back, each built on STORY-001's multiply" bash -c "
  cd '$P' && [ \"\$(git rev-parse --abbrev-ref HEAD)\" = feat/arith ] && [ \$(git log --merges --format=%h $BASE_SHA..HEAD | wc -l) -ge 2 ] &&
  grep -q multiply src/double.js && grep -q multiply src/square.js"
ae_check "PROGRESS.md holds both entries and the merged-result run" bash -c "
  grep -q '^## STORY-002' '$P/docs/features/arith/PROGRESS.md' && grep -q '^## STORY-003' '$P/docs/features/arith/PROGRESS.md' &&
  grep -q '^| merge |' '$P/docs/features/arith/PROGRESS.md'"
ae_check "evidence fresh on the merged code" bash -c "
  cd '$P' && bash '$AE_PLUGIN_ROOT/scripts/evidence.sh' check docs/features/arith/PROGRESS.md STORY-003 | grep -q '^EVIDENCE: fresh'"
ae_check "merged worktrees removed" bash -c "[ \$(git -C '$P' worktree list | wc -l) -eq 1 ]"
ae_check "main thread wrote no file under src/ or test/" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$T' Write,Edit,MultiEdit | grep -E '\"file_path\": \"[^\"]*/(src|test)/'"
ae_check "/diagnose finds no unpinned or inline build" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/scripts/transcript-digest.py' --check '$T' | grep -E 'DEVIATION (base|build)'"
ae_done
