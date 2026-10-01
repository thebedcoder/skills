#!/usr/bin/env bash
# tests/pressure.sh planning, without running a session: which scenarios it would
# hold to "fails on the base, passes here", and its refusals.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PR="$HERE/../pressure.sh"
FAILS=0; PASSES=0
pass() { PASSES=$((PASSES + 1)); echo "  [PASS] $1"; }
fail() { FAILS=$((FAILS + 1)); echo "  [FAIL] $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/         /'; }
echo "--- pressure test planning"
out="$(bash "$PR" --dry-run HEAD 13-ship-subagent-build 2>&1)"
printf '%s' "$out" | grep -q '^PLAN 13-ship-subagent-build: run here (must pass) · run --against HEAD (must fail)' \
  && pass "a named scenario must pass here and fail against the base" || fail "named scenario plan" "$out"
out="$(bash "$PR" --dry-run HEAD 2>&1)"; rc=$?
[ $rc -eq 0 ] && printf '%s' "$out" | grep -q 'nothing to prove' && pass "no scenario changed since the base → nothing to prove, exit 0" || fail "nothing changed" "rc=$rc $out"
bash "$PR" --dry-run no-such-ref-xyz >/dev/null 2>&1; rc=$?
[ $rc -eq 2 ] && pass "unknown base ref → exit 2" || fail "unknown base ref" "rc=$rc"
bash "$PR" >/dev/null 2>&1; rc=$?
[ $rc -eq 2 ] && pass "no base ref → usage, exit 2" || fail "usage" "rc=$rc"
echo "  pressure test planning: $PASSES passed, $FAILS failed — $([ $FAILS -eq 0 ] && echo PASSED || echo "FAILED ($FAILS)")"
[ "$FAILS" -eq 0 ]
