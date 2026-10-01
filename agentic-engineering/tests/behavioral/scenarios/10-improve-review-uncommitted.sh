#!/usr/bin/env bash
# /improve reviews its change BEFORE it commits (the commit is Phase 4). On a
# fresh branch with no commits of its own, /review's branch diff has no base and
# aborts — so /improve captures the uncommitted change with review-diff.sh. The
# three always-run reviewers get that diff, dispatched in one message.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
fixture_base "$P" lite
fixture_branch "$P" improve/multiply      # no commits beyond main: the case that aborted

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" \
  "/agentic-engineering:improve add multiply(a, b) to src/math.js, next to add, with a test --auto" 4

T="$AE_OUT/transcript.jsonl"
ae_check "run completed" test "$(cat "$T.rc")" = 0
ae_check "uncommitted change captured: non-empty diff naming multiply" bash -c "
  f=\$(ls '$P'/.agentic/review/improve-*.diff 2>/dev/null | head -1); [ -n \"\$f\" ] && grep -q '^+.*multiply' \"\$f\""
ae_check "ae-red, ae-test and ae-lean dispatched in one message" \
  ae_transcript batch "$T" ae-red,ae-test,ae-lean
ae_check "no aborted review (no base) in the run" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$T' | grep -q 'REVIEW ABORTED'"
ae_check "change committed after review, on the branch" bash -c "
  [ -n \"\$(git -C '$P' log --oneline main..improve/multiply)\" ] && git -C '$P' show improve/multiply:src/math.js | grep -q multiply"
ae_done
