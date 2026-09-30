#!/usr/bin/env bash
# P1-a: a fresh session in a scaffolded project names the active focus task
# unprompted, and so does the first turn after /compact.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
fixture_base "$P" lite
fixture_focus "$P" "STORY-007 — Export notes as CSV" main "/ship" \
  "Implement STORY-007 backend + tests" -- "Backend review — 7-agent batch" "Frontend from design handoff"

T="$AE_OUT/transcript.jsonl"
ae_run_claude "$P" "$T" "hi" 0.5
ae_check "fresh session: SessionStart:startup hook ran" \
  bash -c "python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' hook-events '$T' | grep -q 'hook_response SessionStart:startup'"
ae_check "fresh session: first reply names STORY-007 unprompted" \
  bash -c "python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$T' | grep -q 'STORY-007'"

SID="$(cat "$T.sid")"
ae_resume_claude "$P" "$AE_OUT/compact.jsonl" "$SID" "/compact" 0.5
ae_check "/compact re-fired the hook (SessionStart:compact)" \
  bash -c "python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' hook-events '$AE_OUT/compact.jsonl' | grep -q 'SessionStart:compact'"
ae_resume_claude "$P" "$AE_OUT/after-compact.jsonl" "$SID" "hi again" 0.5
ae_check "after /compact: reply names STORY-007" \
  bash -c "python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/after-compact.jsonl' | grep -q 'STORY-007'"

# Router only outside a scaffolded project: no task, no memory-doc read list.
Q="$AE_WORK/plain"
mkdir -p "$Q" && ( cd "$Q" && git init -q )
ae_run_claude "$Q" "$AE_OUT/plain.jsonl" "hi" 0.5
ae_check "plain repo: hook injected the router marked 'not set up'" \
  bash -c "grep -q 'workflow not set up in this project' '$AE_OUT/plain.jsonl'"
ae_check "plain repo: reply does not invent a task" \
  bash -c "! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$AE_OUT/plain.jsonl' | grep -q 'STORY-'"
ae_done
