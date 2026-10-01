#!/usr/bin/env bash
# 3.0 execution model: /ship plans in ae-arch (session model) and builds in
# ae-impl (explicit tier) — each in a fresh context — and the main session writes
# no source or test file. No plan-approval stop between plan and build. The red
# run and the green run both land in the evidence ledger, so `check` reads fresh
# and red=present; the orchestrator, not the implementer, ticks the story. The plan
# as agreed is committed to plans/STORY-001-plan.md before the code — the brief is
# gitignored, so without the record nothing of the plan or its approvals survives.
#
# Cost control: the harness stops the chain after Phase 1 is committed.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_WORK/project"
fixture_base "$P" lite
mkdir -p "$P/docs/features/main/reviews"
fixture_feature_row "$P" main in-progress
cat > "$P/docs/features/main/STORIES.md" <<'MD'
## Main — Stories

- [ ] STORY-001: Multiply two numbers
  **As a** developer, **I want** a multiply(a, b) helper in src/math.js **so that** callers stop hand-rolling it
  **Priority:** P1
  **Acceptance Criteria:**
  - [ ] AC-1: multiply(2, 3) returns 6
  - [ ] AC-2: multiply with a zero operand returns 0
  **Notes:** same shape as add() in src/math.js; tests next to add's in test/math.test.js
  **Parallel:** yes — no dependency on other stories
MD
printf '# Main — Progress\n' > "$P/docs/features/main/PROGRESS.md"
fixture_commit "$P" "chore(main): add STORY-001"
fixture_branch "$P" feat/multiply

ae_run_claude "$P" "$AE_OUT/transcript.jsonl" "/agentic-engineering:ship" 4 \
  "Harness limit: run Phase 1 (plan, build, verify, record, commit) for STORY-001, then stop. Do not run Phase 2 or any later phase."

T="$AE_OUT/transcript.jsonl"
ae_check "run completed" test "$(cat "$T.rc")" = 0
ae_check "ae-arch planned the story" ae_transcript dispatched "$T" ae-arch
ae_check "ae-impl built it, with an explicit model tier" ae_transcript dispatched "$T" ae-impl '*'
ae_check "plan dispatched before build" python3 - "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$T" <<'PY'
import json, subprocess, sys
g = json.loads(subprocess.run([sys.executable, sys.argv[1], "dispatches", sys.argv[2]], capture_output=True, text=True).stdout)
first = {}
for grp in g:
    for a, ln in zip(grp["agents"], grp["lines"]):
        first.setdefault(a, ln)
a, i = first.get("agentic-engineering:ae-arch"), first.get("agentic-engineering:ae-impl")
print(f"ae-arch L{a} · ae-impl L{i}")
sys.exit(0 if a and i and a < i else 1)
PY
ae_check "main thread wrote no file under src/ or test/" bash -c "
  ! python3 '$AE_PLUGIN_ROOT/tests/lib/transcript.py' tools '$T' Write,Edit,MultiEdit | grep -E '\"file_path\": \"[^\"]*/(src|test)/'"
ae_check "brief written for the implementer" test -s "$P/.agentic/briefs/STORY-001.md"
ae_check "STORY-001 ticked" grep -q -- '- \[x\] STORY-001' "$P/docs/features/main/STORIES.md"
ae_check "evidence fresh, ledger-verified, red run recorded" bash -c "
  cd '$P' && bash '$AE_PLUGIN_ROOT/scripts/evidence.sh' check docs/features/main/PROGRESS.md STORY-001 | grep -q '^EVIDENCE: fresh .*red=present'"
ae_check "PROGRESS.md records the implementer tier" grep -qE '^Implementer: (haiku|sonnet)' "$P/docs/features/main/PROGRESS.md"
ae_check "plan record committed, with its header and the plan" bash -c "
  cd '$P' && git ls-files --error-unmatch docs/features/main/plans/STORY-001-plan.md >/dev/null &&
  git show HEAD:docs/features/main/plans/STORY-001-plan.md | grep -q '^## Plan' &&
  git show HEAD:docs/features/main/plans/STORY-001-plan.md | grep -qE '^gate: ' &&
  git show HEAD:docs/features/main/plans/STORY-001-plan.md | grep -qE '^approved: '"
ae_check "plan record committed before the code" bash -c "
  cd '$P' && plan=\$(git log --reverse --format=%H -- docs/features/main/plans/STORY-001-plan.md | head -1) &&
  code=\$(git log --reverse --format=%H --grep=STORY-001 -- src test | head -1) &&
  test -n \"\$plan\" && test -n \"\$code\" && test \"\$plan\" != \"\$code\" &&
  git merge-base --is-ancestor \"\$plan\" \"\$code\""
ae_check "feat commit landed — no plan-approval stop" bash -c "cd '$P' && git log --format=%s | grep -qE '^(feat|test)\\([^)]*\\): STORY-001'"
ae_done
