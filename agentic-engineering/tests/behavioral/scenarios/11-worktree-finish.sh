#!/usr/bin/env bash
# /worktree lists the workflow's worktrees and finishes them only on a human answer.
#   A. Two task worktrees: fix-add (one commit, clean) and wip-notes (uncommitted
#      file). /worktree lists both, asks merge/PR/keep/discard for fix-add only,
#      and changes nothing before the answer.
#   B. Answer "merge": fix-add lands on main, tests run on the merged result, its
#      folder and branch are removed. wip-notes is reported and left untouched.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
WT="$AE_PLUGIN_ROOT/scripts/worktree.sh"
fixture_base "$P" lite
# worktree.sh merge commits; give the fixture repo an identity of its own.
git -C "$P" config user.name fixture && git -C "$P" config user.email fixture@example.invalid
( cd "$P" && bash "$WT" create fix-add fix/add --kind task >/dev/null &&
  bash "$WT" create wip-notes wip/notes --kind task >/dev/null )
( cd "$P/.claude/worktrees/fix-add" &&
  printf '\nexport function multiply(a, b) {\n  return a * b;\n}\n' >> src/math.js &&
  cat >> test/math.test.js <<'EOF'

import { multiply } from '../src/math.js';
test('multiply multiplies', () => {
  assert.equal(multiply(3, 4), 12);
});
EOF
  git add -A && git commit -q -m "feat(math): add multiply" )
printf 'draft\n' > "$P/.claude/worktrees/wip-notes/notes.txt"
head_before="$(git -C "$P" rev-parse main)"

# --- A: list + gate, nothing changes ---------------------------------------------
ae_run_claude "$P" "$AE_OUT/list.jsonl" "/agentic-engineering:worktree" 1.5
ae_check "A: run completed" test "$(cat "$AE_OUT/list.jsonl.rc")" = 0
ae_check "A: lists both worktrees" bash -c "
  t=\$(python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/list.jsonl');
  echo \"\$t\" | grep -q 'fix/add' && echo \"\$t\" | grep -q 'wip'"
ae_check "A: asks what to do with fix-add, offering a merge" bash -c "
  python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/list.jsonl' | grep -qi 'merge'"
ae_check "A: nothing merged, removed or deleted before the answer" bash -c "
  [ \"\$(git -C '$P' rev-parse main)\" = '$head_before' ] &&
  test -d '$P/.claude/worktrees/fix-add' && test -f '$P/.claude/worktrees/wip-notes/notes.txt' &&
  git -C '$P' show-ref --verify --quiet refs/heads/fix/add"

# --- B: answer merge ----------------------------------------------------------------
ae_resume_claude "$P" "$AE_OUT/merge.jsonl" "$(cat "$AE_OUT/list.jsonl.sid")" \
  "Merge fix/add into main. Leave wip-notes alone." 2
ae_check "B: run completed" test "$(cat "$AE_OUT/merge.jsonl.rc")" = 0
ae_check "B: fix/add merged into main" bash -c "git -C '$P' show main:src/math.js | grep -q multiply"
ae_check "B: tests ran on the merged result" bash -c "
  python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$AE_OUT/merge.jsonl' Bash | grep -qE 'npm test|node --test'"
ae_check "B: fix-add folder and branch removed" bash -c "
  ! test -d '$P/.claude/worktrees/fix-add' && ! git -C '$P' show-ref --verify --quiet refs/heads/fix/add"
ae_check "B: wip-notes untouched — folder, branch and its uncommitted file" bash -c "
  test -f '$P/.claude/worktrees/wip-notes/notes.txt' && git -C '$P' show-ref --verify --quiet refs/heads/wip/notes"
ae_check "B: nothing removed by hand (worktree.sh remove, never rm -rf or --force)" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$AE_OUT/merge.jsonl' Bash | grep -qE 'rm -rf[^|]*worktrees|worktree remove[^|]*--force'"
ae_done
