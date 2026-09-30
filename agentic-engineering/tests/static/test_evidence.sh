#!/usr/bin/env bash
# scripts/evidence.sh: the tree id tracks code and only code, and `check` gives
# REQ the right verdict — fresh, stale, failing, missing — plus whether the diff
# under review is the one that ticks the story.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
EV="$HERE/../../scripts/evidence.sh"
FAILS=0
PASSES=0
pass() { PASSES=$((PASSES + 1)); echo "  [PASS] $1"; }
fail() { FAILS=$((FAILS + 1)); echo "  [FAIL] $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/         /'; }
check() { local d="$1"; shift; if out="$("$@" 2>&1)"; then pass "$d"; else fail "$d" "$out"; fi; }
g() { git -c user.name=t -c user.email=t@example.invalid "$@"; }

echo "--- evidence gate"
T="$(mktemp -d)"
trap 'rm -rf "$T" "$T.story1.diff"' EXIT
cd "$T" || exit 1
g init -q -b main
mkdir -p src docs/features/main app-docs
printf 'build/\n.agentic/\n' > .gitignore
echo 'export const a = 1;' > src/a.js
printf '# Main — Progress\n' > docs/features/main/PROGRESS.md
g add -A && g commit -q -m init

# --- tree id semantics --------------------------------------------------------
t0="$(bash "$EV" tree)"
echo 'export const b = 2;' > src/b.js                  # uncommitted code
t1="$(bash "$EV" tree)"
[ "$t0" != "$t1" ] && pass "untracked code file changes the tree id" || fail "untracked code file changes the tree id"
g add -A && g commit -q -m "feat: b"
t2="$(bash "$EV" tree)"
[ "$t1" = "$t2" ] && pass "same code before and after commit → same tree id" || fail "same code before and after commit → same tree id" "$t1 vs $t2"
echo "note" >> docs/features/main/PROGRESS.md; echo x > app-docs/x.md; mkdir -p .agentic; echo y > .agentic/focus.md
[ "$(bash "$EV" tree)" = "$t2" ] && pass "docs/, app-docs/, .agentic/ edits never change it" || fail "docs/, app-docs/, .agentic/ edits never change it"
mkdir -p build; echo junk > build/out.js
[ "$(bash "$EV" tree)" = "$t2" ] && pass "gitignored build output never changes it" || fail "gitignored build output never changes it"
g checkout -q -- docs/features/main/PROGRESS.md; rm -rf app-docs/x.md
check "real index untouched by a tree-id run" bash -c "[ -z \"\$(git diff --cached --name-only)\" ]"

# --- run ------------------------------------------------------------------------
row="$(bash "$EV" run --phase implement -- sh -c 'echo "# pass 3"; echo "# fail 0"' | grep '^EVIDENCE-ROW:')"
if printf '%s\n' "$row" | grep -qE "^EVIDENCE-ROW: \| implement \| .* \| exit 0 · pass 3 · fail 0 \| [0-9-]+ [0-9:]+ \| ${t2:0:12} \|\$"; then
  pass "run prints one EVIDENCE-ROW with phase, exit 0, runner summary, tree"
else
  fail "run prints one EVIDENCE-ROW with phase, exit 0, runner summary, tree" "$row"
fi
bash "$EV" run --phase implement -- sh -c 'echo "1 failed"; exit 3' >/dev/null; rc=$?
[ $rc -eq 3 ] && pass "run exits with the test command's own code" || fail "run exits with the test command's own code" "rc=$rc"
check "run from a subdirectory still runs at the repo root" bash -c "
  cd src && bash '$EV' run --phase x -- sh -c 'test -f .gitignore && echo \"1 passed\"' | grep -q 'exit 0'"

# --- check ------------------------------------------------------------------------
P=docs/features/main/PROGRESS.md
entry() {  # entry <STORY> <rows...>
  printf '\n## %s: Something — 2026-09-30\n\n### AC Coverage\n| AC | Description | Tests | Level |\n|----|----|----|----|\n| AC-1 | x | t | unit |\n\n### Evidence\n| Phase | Command | Result | Run at | Tree |\n|-------|---------|--------|--------|------|\n' "$1"
  shift
  for r in "$@"; do printf '%s\n' "$r"; done
  printf '\n### Files changed\n- src/a.js\n'
}
fresh_row="${row#EVIDENCE-ROW: }"
stale_row="| implement | \`npm test\` | exit 0 · 3 passed | 2026-09-29 10:00 | 0123456789ab |"
red_row="$(bash "$EV" run --phase fix -- sh -c 'echo "1 failed"; exit 1' | grep '^EVIDENCE-ROW:')"; red_row="${red_row#EVIDENCE-ROW: }"
{ printf '# Main — Progress\n'
  entry STORY-001 "$fresh_row"
  entry STORY-002 "$fresh_row" "$stale_row"
  entry STORY-003 "$fresh_row" "$red_row"
  printf '\n## STORY-004: Pre-evidence story — 2026-01-01\n\n### Files changed\n- src/a.js\n'
  entry STORY-010 "$stale_row"
} > "$P"
D1="$T.story1.diff"   # outside the repo: an untracked file inside it IS a code change
printf -- '--- a/%s\n+++ b/%s\n@@\n-- [ ] STORY-001: Something\n+- [x] STORY-001: Something\n' "$P" "$P" > "$D1"

verdict() { bash "$EV" check "$P" "$1" ${2:+--diff "$2"} | head -1; }
check "fresh: latest row green on the current tree" bash -c "bash '$EV' check $P STORY-001 | grep -q '^EVIDENCE: fresh story=STORY-001'"
check "stale: latest row ran on other code (earlier green row does not rescue it)" bash -c "bash '$EV' check $P STORY-002 | grep -q '^EVIDENCE: stale'"
check "failing: latest row exit≠0" bash -c "bash '$EV' check $P STORY-003 | grep -q '^EVIDENCE: failing'"
check "missing: entry without an Evidence table" bash -c "bash '$EV' check $P STORY-004 | grep -q '^EVIDENCE: missing'"
check "missing: story with no PROGRESS entry at all" bash -c "bash '$EV' check $P STORY-099 | grep -q '^EVIDENCE: missing'"
check "STORY-010 is not confused with STORY-001" bash -c "bash '$EV' check $P STORY-001 | grep -q 'row_tree=${t2:0:12}'"
check "checked_in_diff=yes when the diff ticks the story" bash -c "bash '$EV' check $P STORY-001 --diff $D1 | grep -q 'checked_in_diff=yes'"
check "checked_in_diff=no when it does not" bash -c "bash '$EV' check $P STORY-002 --diff $D1 | grep -q 'checked_in_diff=no'"
check "check exits 0 only when fresh" bash -c "bash '$EV' check $P STORY-001 >/dev/null && ! bash '$EV' check $P STORY-002 >/dev/null"
echo 'export const a = 42;' > src/a.js
check "any code edit after the run turns fresh into stale" bash -c "bash '$EV' check $P STORY-001 | grep -q '^EVIDENCE: stale'"

echo "  evidence gate: $PASSES passed, $FAILS failed — $([ $FAILS -eq 0 ] && echo PASSED || echo "FAILED ($FAILS)")"
[ "$FAILS" -eq 0 ]
