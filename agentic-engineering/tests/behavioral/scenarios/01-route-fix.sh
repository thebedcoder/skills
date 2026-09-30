#!/usr/bin/env bash
# "fix this failing test" in a scaffolded project routes to /fix, and the
# diagnosis is executed: tests run, output shown, one hypothesis tested (P3-b).
# The router in the SessionStart hook and the skill description both point there;
# what matters is that the run enters the /fix chain rather than editing ad hoc.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_OUT/project"
fixture_base "$P" lite
# Break add(): the existing test now fails.
sed -i.bak 's/return a + b;/return a - b;/' "$P/src/math.js" && rm -f "$P/src/math.js.bak"
fixture_commit "$P" "feat: tweak add"
fixture_branch "$P" fix/add

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" \
  "npm test is red — the test in test/math.test.js is failing. Fix this failing test." 1.5 \
  "Stop at the first human checkpoint."

ae_check "run completed" test "$(cat "$AE_OUT/transcript.jsonl.rc")" = 0
ae_check "routed to /fix (Skill agentic-engineering:fix or read commands/fix.md)" \
  ae_transcript routed-to "$AE_OUT/transcript.jsonl" fix
# P3-b: diagnosis is executed, not read off the code.
ae_check "reproduced by running the tests before the diagnosis gate" bash -c "
  python3 '$AE_PLUGIN_ROOT/scripts/transcript-digest.py' '$AE_OUT/transcript.jsonl' | sed -n '/^TEST RUNS (/,/^[A-Z]/p' | grep -q '^  L'"
ae_check "diagnosis shows the reproduction output and a tested hypothesis" bash -c "
  t=\$(python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/transcript.jsonl');
  echo \"\$t\" | grep -qi 'Reproduced' && echo \"\$t\" | grep -qi 'Hypothesis'"
ae_done
