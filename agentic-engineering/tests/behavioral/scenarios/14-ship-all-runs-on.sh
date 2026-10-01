#!/usr/bin/env bash
# "Planning asks, execution runs": once the start question is answered, /ship-all
# ships story after story with no stop between them — no per-story approval, no
# compact gate — and each story gets its own fresh plan and build subagents.
#
# Cost control: two one-function stories; the harness answers the start question
# (as a planning command's Build gate would) and limits each story to Phase 1.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
fixture_base "$P" lite
mkdir -p "$P/docs/features/main/reviews"
fixture_feature_row "$P" main in-progress
cat > "$P/docs/features/main/STORIES.md" <<'MD'
## Main — Stories

- [ ] STORY-001: Subtract two numbers
  **As a** developer, **I want** subtract(a, b) in src/math.js **so that** callers stop hand-rolling it
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: subtract(5, 3) returns 2
  **Notes:** same shape as add() in src/math.js
  **Parallel:** no — STORY-002 follows it

- [ ] STORY-002: Negate a number
  **As a** developer, **I want** negate(a) in src/math.js **so that** sign flips read clearly
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: negate(4) returns -4
  **Notes:** same shape as add() in src/math.js; depends on STORY-001 only for file order
  **Parallel:** no — requires STORY-001 first
MD
printf '# Main — Progress\n' > "$P/docs/features/main/PROGRESS.md"
fixture_commit "$P" "chore(main): add STORY-001 and STORY-002"
fixture_branch "$P" feat/arith

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" "/agentic-engineering:ship-all" 6 \
  "Harness: the human already answered the start question — Ship everything, here, sequentially — exactly as a planning command's Build gate hands over. For cost, run only Phase 1 (plan, build, verify, record, commit) of each story's /ship; skip Phases 2 to 7. Stop after the last story."

T="$AE_OUT/transcript.jsonl"
ae_check "run completed" test "$(cat "$T.rc")" = 0
ae_check "both stories ticked in one session" bash -c "
  grep -q -- '- \[x\] STORY-001' '$P/docs/features/main/STORIES.md' && grep -q -- '- \[x\] STORY-002' '$P/docs/features/main/STORIES.md'"
ae_check "a fresh ae-arch and ae-impl per story (≥2 each)" python3 - "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$T" <<'PY'
import json, subprocess, sys
g = json.loads(subprocess.run([sys.executable, sys.argv[1], "dispatches", sys.argv[2]], capture_output=True, text=True).stdout)
agents = [a for grp in g for a in grp["agents"]]
n_arch, n_impl = agents.count("agentic-engineering:ae-arch"), agents.count("agentic-engineering:ae-impl")
print(f"ae-arch ×{n_arch} · ae-impl ×{n_impl}")
sys.exit(0 if n_arch >= 2 and n_impl >= 2 else 1)
PY
ae_check "no compact gate and no per-story approval question" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' text '$T' | grep -iE 'run the compact|/compact Focus on|— proceed\?|Start implementation\?'"
ae_check "evidence fresh for the last story" bash -c "
  cd '$P' && bash '$AE_PLUGIN_ROOT/scripts/evidence.sh' check docs/features/main/PROGRESS.md STORY-002 | grep -q '^EVIDENCE: fresh'"
ae_done
