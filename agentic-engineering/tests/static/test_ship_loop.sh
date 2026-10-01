#!/usr/bin/env bash
# scripts/ship-loop.sh with a fake `claude` on PATH: one headless session per story,
# stopping on DONE, MAX, a hard pause and a run that shipped nothing — each with the
# right exit code — and never sending a parent session's variables to the child.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LOOP="$HERE/../../scripts/ship-loop.sh"
FAILS=0
PASSES=0
pass() { PASSES=$((PASSES + 1)); echo "  [PASS] $1"; }
fail() { FAILS=$((FAILS + 1)); echo "  [FAIL] $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/         /'; }
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.invalid GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.invalid

echo "--- ship loop"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin"
# Fake claude: the Nth call does what line N of $FAKE_SCRIPT says — tick (ship the next
# open story), pause (hard-pause, nothing ticked), stall (ask a question), fail (exit 1).
cat > "$T/bin/claude" <<'EOF'
#!/usr/bin/env bash
n=$(( $(cat "$FAKE_DIR/count" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$FAKE_DIR/count"
cat > "$FAKE_DIR/stdin.$n"
env > "$FAKE_DIR/env.$n"
printf '%s\n' "$@" > "$FAKE_DIR/args.$n"
mode="$(sed -n "${n}p" "$FAKE_SCRIPT")"
[ "$mode" = fail ] && { echo "boom" >&2; exit 1; }
sid=$(awk 'p { print; exit } $0 == "--session-id" { p = 1 }' "$FAKE_DIR/args.$n")
echo "{\"type\":\"system\",\"subtype\":\"init\",\"session_id\":\"${sid:-sess-$n}\"}"
case "$mode" in
  tick)
    f=$(grep -l '^- \[ \] STORY-' docs/features/*/STORIES.md | head -1)
    sed -i '0,/^- \[ \] STORY-/s//- [x] STORY-/' "$f"
    echo '{"type":"result","subtype":"success","total_cost_usd":0.4166000001,"result":"STORY shipped"}' ;;
  pause)
    mkdir -p .agentic; echo "HARD-PAUSE: migration creates a table [auto]" >> .agentic/auto-log.md
    echo '{"type":"result","subtype":"success","total_cost_usd":0.1,"result":"HARD-PAUSE: migration — approve?"}' ;;
  stall)
    echo '{"type":"result","subtype":"success","total_cost_usd":0.1,"result":"Which approach? A or B"}' ;;
esac
EOF
chmod +x "$T/bin/claude"
export PATH="$T/bin:$PATH" FAKE_DIR="$T/fake" FAKE_SCRIPT="$T/script"

# repo <name> <stories…> — a scaffolded project on a feature branch with open stories.
repo() {
  local d="$T/$1"; shift
  mkdir -p "$d/docs/features/main"; cd "$d" || exit 1
  git init -q -b main; printf '.agentic/\n' > .gitignore; printf -- '---\nmode: lite\n---\n' > docs/INDEX.md
  { echo "## Main — Stories"; for s in "$@"; do printf '\n- [ ] %s: something\n' "$s"; done; } > docs/features/main/STORIES.md
  git add -A && git commit -q -m init && git checkout -q -b feat/main
  rm -rf "$FAKE_DIR"; mkdir -p "$FAKE_DIR"
}
script() { printf '%s\n' "$@" > "$FAKE_SCRIPT"; }

repo r1 STORY-001 STORY-002; script tick tick
out="$(bash "$LOOP" 2>&1)"; rc=$?
[ $rc -eq 0 ] && pass "two ticks → exit 0" || fail "two ticks → exit 0" "rc=$rc $out"
printf '%s' "$out" | grep -q '^DONE: no unchecked story left · 2 shipped' && pass "ends DONE with the count" || fail "ends DONE with the count" "$out"
[ "$(cat "$FAKE_DIR/count")" = 2 ] && pass "one session per story" || fail "one session per story" "$(cat "$FAKE_DIR/count")"
grep -qx '/agentic-engineering:ship --auto' "$FAKE_DIR/stdin.1" && pass "each session gets /agentic-engineering:ship --auto on stdin" || fail "prompt on stdin" "$(cat "$FAKE_DIR/stdin.1")"
grep -qx -- '--output-format' "$FAKE_DIR/args.1" && grep -qx -- 'acceptEdits' "$FAKE_DIR/args.1" && grep -qx -- '--allowedTools' "$FAKE_DIR/args.1" \
  && pass "headless flags: stream-json, acceptEdits, explicit tools" || fail "headless flags" "$(cat "$FAKE_DIR/args.1")"
sid1=$(awk 'p { print; exit } $0 == "--session-id" { p = 1 }' "$FAKE_DIR/args.1")
sid2=$(awk 'p { print; exit } $0 == "--session-id" { p = 1 }' "$FAKE_DIR/args.2")
printf '%s' "$sid1" | grep -qE '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' && [ "$sid1" != "$sid2" ] \
  && pass "each run gets its own fresh --session-id" || fail "fresh --session-id per run" "1=$sid1 2=$sid2"
grep -q "SHIPPED STORY-001 · \\\$0.42 · .* · session $sid1" .agentic/ship-loop.log && pass "log line names story, cost to the cent, and session" || fail "log line" "$(cat .agentic/ship-loop.log)"
test -s .agentic/ship-loop/1.jsonl && pass "transcript kept per run" || fail "transcript kept per run"

PARENT=(CLAUDECODE=1 CLAUDE_CODE_SESSION_ID=parent CLAUDE_CODE_REMOTE_SESSION_ID=parent SESSION_INGRESS_URL=http://x
        CLAUDE_SESSION_INGRESS_TOKEN_FILE=/x CLAUDE_CODE_CHILD_SESSION=1 KEEP_ME=1)
repo r2 STORY-001 STORY-002 STORY-003; script tick pause
out="$(env "${PARENT[@]}" bash "$LOOP" 2>&1)"; rc=$?
[ $rc -eq 3 ] && pass "hard pause → exit 3" || fail "hard pause → exit 3" "rc=$rc $out"
sid2=$(awk 'p { print; exit } $0 == "--session-id" { p = 1 }' "$FAKE_DIR/args.2")
printf '%s' "$out" | grep -q "PAUSED: run 2 .*claude --resume $sid2" && pass "PAUSED names the session to resume" || fail "PAUSED names the session" "$out"
[ "$(grep -c '^- \[x\]' docs/features/main/STORIES.md)" = 1 ] && pass "nothing shipped past the pause" || fail "nothing shipped past the pause"
! grep -qE '^(CLAUDECODE|CLAUDE_CODE_SESSION_ID|CLAUDE_CODE_REMOTE_SESSION_ID|SESSION_INGRESS_URL|CLAUDE_SESSION_INGRESS_TOKEN_FILE|CLAUDE_CODE_CHILD_SESSION)=' "$FAKE_DIR/env.1" \
  && pass "parent and cloud session variables never reach the child" || fail "session variables leaked" "$(grep -E 'CLAUDE|INGRESS' "$FAKE_DIR/env.1")"
grep -q '^KEEP_ME=1' "$FAKE_DIR/env.1" && pass "other variables (auth, config) pass through" || fail "other variables dropped"

repo r3 STORY-001; script stall
out="$(bash "$LOOP" 2>&1)"; rc=$?
[ $rc -eq 4 ] && printf '%s' "$out" | grep -q 'STALLED: run 1 shipped nothing' && pass "a run that ships nothing → STALLED, exit 4" || fail "stall" "rc=$rc $out"

repo r4 STORY-001; script fail
out="$(bash "$LOOP" 2>&1)"; rc=$?
[ $rc -eq 1 ] && printf '%s' "$out" | grep -q '^FAILED' && pass "claude failing before a session → exit 1" || fail "claude failing" "rc=$rc $out"

repo r5 STORY-001 STORY-002 STORY-003; script tick tick tick
out="$(bash "$LOOP" --max 1 2>&1)"; rc=$?
[ $rc -eq 0 ] && printf '%s' "$out" | grep -q '^MAX: 1 shipped' && [ "$(cat "$FAKE_DIR/count")" = 1 ] && pass "--max 1 stops after one story" || fail "--max" "rc=$rc $out"

repo r6 STORY-001; script tick
out="$(bash "$LOOP" --dry-run 2>&1)"; rc=$?
[ $rc -eq 0 ] && [ ! -f "$FAKE_DIR/count" ] && printf '%s' "$out" | grep -q 'STORY-001' && pass "--dry-run lists stories and runs nothing" || fail "--dry-run" "rc=$rc $out"

repo r7 STORY-001; script tick; git checkout -q main
out="$(bash "$LOOP" 2>&1)"; rc=$?
[ $rc -eq 2 ] && [ ! -f "$FAKE_DIR/count" ] && pass "refuses to run on main" || fail "refuses main" "rc=$rc $out"

repo r8 STORY-001; script tick; printf '' > .gitignore; git commit -qam "no ignore"
bash "$LOOP" >/dev/null 2>&1
! git status --porcelain --untracked-files=all | grep -q '\.agentic/' && pass "loop state stays out of git even without a .gitignore line" || fail "loop state dirty" "$(git status --porcelain)"

echo "  ship loop: $PASSES passed, $FAILS failed — $([ $FAILS -eq 0 ] && echo PASSED || echo "FAILED ($FAILS)")"
[ "$FAILS" -eq 0 ]
