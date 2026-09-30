#!/usr/bin/env bash
# Helpers for behavioral scenarios: credential detection and one headless run.
# Sourced by tests/behavioral/scenarios/*.sh via tests/run-tests.sh.

AE_PLUGIN_ROOT="${AE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
AE_TEST_MODEL="${AE_TEST_MODEL:-sonnet}"
AE_TEST_TIMEOUT="${AE_TEST_TIMEOUT:-900}"

# Tools a scenario may use without a permission prompt. Headless runs cannot
# answer prompts, and --permission-mode bypassPermissions is refused as root, so
# the list is explicit. AskUserQuestion is deliberately absent: -p has no human.
AE_ALLOWED_TOOLS="Bash Read Write Edit MultiEdit Glob Grep Agent Task Skill TodoWrite TaskCreate TaskUpdate TaskList"

# Appended to every run. Explicit instructions win over the SessionStart router,
# which is exactly the precedence the hook promises headless drivers.
AE_HARNESS_NOTE="Automated test harness, headless run. No human is present and AskUserQuestion is unavailable: when a checkpoint would ask the human, print the question with its options as plain text and end your turn. Never push, never open a PR, never touch files outside the current directory."

# Why a behavioral run cannot happen here, or empty when it can.
ae_skip_reason() {
  command -v claude >/dev/null 2>&1 || { echo "claude CLI not on PATH"; return; }
  command -v git >/dev/null 2>&1 || { echo "git not on PATH"; return; }
  command -v node >/dev/null 2>&1 || { echo "node not on PATH (fixtures test with node --test)"; return; }
  [ -n "${ANTHROPIC_API_KEY:-}" ] && return
  [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] && return
  if timeout 20 claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then
    return
  fi
  echo "no API key (ANTHROPIC_API_KEY / CLAUDE_CODE_OAUTH_TOKEN) and claude is not logged in"
}

ae_uuid() {
  python3 -c 'import uuid; print(uuid.uuid4())'
}

# Guard: a fixture inside a git work tree that has its own CLAUDE.md files above
# it would load them. run-tests.sh puts fixtures in a temp dir; refuse otherwise.
ae_assert_isolated() {
  local d; d="$(cd "$1" && pwd -P)"
  while [ "$d" != "/" ]; do
    d="$(dirname "$d")"
    if [ -f "$d/CLAUDE.md" ]; then echo "fixture $1 sits under $d/CLAUDE.md — would leak into the session" >&2; return 1; fi
  done
}

# ae_run_claude DIR OUT_JSONL PROMPT [BUDGET_USD] [EXTRA_APPEND] [-- extra claude flags...]
# Runs one headless session in DIR with the working-tree plugin loaded, prompt on
# stdin (--allowedTools is variadic and would swallow a trailing prompt argument).
# Writes stream-json to OUT_JSONL, stderr to OUT_JSONL.err, session id to OUT_JSONL.sid.
ae_run_claude() {
  local dir="$1" out="$2" prompt="$3" budget="${4:-2}" append="${5:-}"
  shift 5 2>/dev/null || shift $#
  [ "${1:-}" = "--" ] && shift
  ae_assert_isolated "$dir" || { echo 99 > "$out.rc"; : > "$out"; return 0; }
  local sid
  sid="$(ae_uuid)"
  echo "$sid" > "$out.sid"
  (
    cd "$dir" || exit 1
    # Parent-session variables leak into a nested claude and make it write into
    # the parent's transcript; the project dir must be the fixture, not the caller.
    printf '%s' "$prompt" | env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_PROJECT_DIR \
      -u CLAUDE_CODE_ENTRYPOINT \
      timeout "$AE_TEST_TIMEOUT" claude -p \
        --model "$AE_TEST_MODEL" \
        --session-id "$sid" \
        --plugin-dir "$AE_PLUGIN_ROOT" \
        --output-format stream-json --verbose --include-hook-events \
        --permission-mode acceptEdits \
        --max-budget-usd "$budget" \
        --append-system-prompt "$AE_HARNESS_NOTE${append:+ $append}" \
        "$@" \
        --allowedTools $AE_ALLOWED_TOOLS
  ) > "$out" 2> "$out.err"
  local rc=$?
  echo "$rc" > "$out.rc"
  return 0
}

# ae_resume_claude DIR OUT_JSONL SESSION_ID PROMPT [BUDGET_USD]
ae_resume_claude() {
  local dir="$1" out="$2" sid="$3" prompt="$4" budget="${5:-1}"
  (
    cd "$dir" || exit 1
    printf '%s' "$prompt" | env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID -u CLAUDE_PROJECT_DIR \
      -u CLAUDE_CODE_ENTRYPOINT \
      timeout "$AE_TEST_TIMEOUT" claude -p \
        --model "$AE_TEST_MODEL" \
        --resume "$sid" \
        --plugin-dir "$AE_PLUGIN_ROOT" \
        --output-format stream-json --verbose --include-hook-events \
        --permission-mode acceptEdits \
        --max-budget-usd "$budget" \
        --append-system-prompt "$AE_HARNESS_NOTE" \
        --allowedTools $AE_ALLOWED_TOOLS
  ) > "$out" 2> "$out.err"
  echo "$?" > "$out.rc"
  return 0
}

# --- assertions ---------------------------------------------------------------
AE_FAILS=0
ae_pass() { echo "  [PASS] $1"; }
ae_fail() { echo "  [FAIL] $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/         /'; AE_FAILS=$((AE_FAILS + 1)); }

# ae_check "description" command...   — passes when the command exits 0
ae_check() {
  local desc="$1"; shift
  local out
  if out="$("$@" 2>&1)"; then
    ae_pass "$desc"
    [ -n "${AE_VERBOSE:-}" ] && printf '%s\n' "$out" | sed 's/^/         /'
  else
    ae_fail "$desc" "$(printf '%s\n' "$out" | head -20)"
  fi
  return 0
}

ae_transcript() { python3 "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$@"; }

ae_done() {
  if [ "$AE_FAILS" -eq 0 ]; then echo "  RESULT: PASSED"; exit 0; fi
  echo "  RESULT: FAILED ($AE_FAILS)"; exit 1
}
