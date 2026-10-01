#!/usr/bin/env bash
# /fix on main and git worktrees.
#   A. agentic.worktree unset (= ask): the branch guard offers New worktree and
#      stops; nothing is created, the session does not move.
#   B. agentic.worktree=always + --auto: no branch question. The run creates a task
#      worktree, moves in with EnterWorktree, fixes and commits there; the main
#      folder's files and HEAD are untouched, the task's focus moved out of main,
#      and the worktree is kept (merge/PR/discard never happen under --auto).
#      Phase 3 dispatches a real agentic-engineering:ae-red on the captured
#      uncommitted diff — never a RED block written inline. An ignored .env in the
#      main folder is copied into the worktree without stopping the run (the
#      hard-override carve-out) and is never committed.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

broken_fixture() {
  fixture_base "$1" lite
  sed -i.bak 's/return a + b;/return a - b;/' "$1/src/math.js" && rm -f "$1/src/math.js.bak"
  fixture_commit "$1" "feat: tweak add"
}
BUG="npm test is red: add() in src/math.js subtracts instead of adding."

# --- A: ask -----------------------------------------------------------------------
A="$AE_WORK/ask"
broken_fixture "$A"
head_a="$(git -C "$A" rev-parse HEAD)"
ae_run_claude "$A" "$AE_OUT/ask.jsonl" "/agentic-engineering:fix $BUG" 1 \
  "Stop at the first human checkpoint."

ae_check "A: run completed" test "$(cat "$AE_OUT/ask.jsonl.rc")" = 0
ae_check "A: branch question offers a new worktree" bash -c "
  ae_t() { python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' \"\$@\"; }
  ae_t text '$AE_OUT/ask.jsonl' | grep -qi 'new worktree'"
ae_check "A: nothing created, session did not move" bash -c "
  ! test -e '$A/.claude/worktrees' &&
  ! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$AE_OUT/ask.jsonl' EnterWorktree >/dev/null &&
  [ \"\$(git -C '$A' worktree list | wc -l)\" -eq 1 ] && [ \"\$(git -C '$A' rev-parse HEAD)\" = '$head_a' ]"

# --- B: always + --auto --------------------------------------------------------------
B="$AE_WORK/always"
broken_fixture "$B"
git -C "$B" config agentic.worktree always
printf '.env\n' >> "$B/.gitignore" && fixture_commit "$B" "chore: ignore .env"
printf 'API_TOKEN=local-only\n' > "$B/.env"
head_b="$(git -C "$B" rev-parse HEAD)"
ae_run_claude "$B" "$AE_OUT/always.jsonl" "/agentic-engineering:fix $BUG --auto" 4

ae_check "B: run completed" test "$(cat "$AE_OUT/always.jsonl.rc")" = 0
ae_check "B: session moved in with EnterWorktree, into .claude/worktrees/" bash -c "
  python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$AE_OUT/always.jsonl' EnterWorktree | grep -q '.claude/worktrees/'"
WT="$(git -C "$B" worktree list --porcelain | sed -n 's/^worktree //p' | grep '/.claude/worktrees/' | head -1)"
BR="$(git -C "$WT" rev-parse --abbrev-ref HEAD 2>/dev/null)"
ae_check "B: a task worktree exists, made by worktree.sh" bash -c "
  [ -n '$WT' ] && [ \"\$(git -C '$B' config 'branch.$BR.agenticKind')\" = task ]"
ae_check "B: the fix is committed on the worktree branch" bash -c "
  [ -n \"\$(git -C '$B' log --oneline main..'$BR')\" ] && git -C '$B' show '$BR:src/math.js' | grep -q 'a + b'"
ae_check "B: main folder untouched — HEAD, files, no stray changes" bash -c "
  [ \"\$(git -C '$B' rev-parse main)\" = '$head_b' ] && grep -q 'a - b' '$B/src/math.js' &&
  [ -z \"\$(git -C '$B' status --porcelain)\" ]"
ae_check "B: the task's focus left the main folder" bash -c "
  ! grep -qs '^title: fixing' '$B/.agentic/focus.md'"
ae_check "B: RED review dispatched as agentic-engineering:ae-red, in fix-review mode" bash -c "
  python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$AE_OUT/always.jsonl' Agent,Task |
    grep 'agentic-engineering:ae-red' | grep -q 'Mode: fix review'"
ae_check "B: the reviewed diff was the uncommitted fix, inside the worktree" bash -c "
  f=\$(ls '$WT'/.agentic/review/fix-*.diff 2>/dev/null | head -1); [ -n \"\$f\" ] && grep -q '^+.*a + b' \"\$f\""
ae_check "B: /diagnose reports no review deviation for this run" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/scripts/transcript-digest.py' '$AE_OUT/always.jsonl' --check | grep -q 'DEVIATION review'"
ae_check "B: ignored .env copied into the worktree, unchanged in main, never committed" bash -c "
  grep -q local-only '$WT/.env' && grep -q local-only '$B/.env' &&
  ! git -C '$B' log --name-only --format= main..'$BR' | grep -qx .env"
ae_check "B: no hard-pause on the .env copy" bash -c "
  ! cat '$B/.agentic/auto-log.md' '$WT/.agentic/auto-log.md' 2>/dev/null | grep -i 'HARD-PAUSE' | grep -qi env"
ae_check "B: worktree kept under --auto, decision logged" bash -c "
  test -d '$WT' && cat '$B/.agentic/auto-log.md' '$WT/.agentic/auto-log.md' 2>/dev/null | grep -qi 'DECISION.*worktree.*kept'"
ae_done
