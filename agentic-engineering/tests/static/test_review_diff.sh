#!/usr/bin/env bash
# scripts/review-diff.sh: the uncommitted change /fix and /improve hand their
# reviewers — complete (tracked edits, staged, new files), nothing extra (ignored
# files, .agentic/, nested worktrees), the user's real index untouched, and an
# empty change reported as a failure rather than a clean review.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
RD="$HERE/../../scripts/review-diff.sh"
FAILS=0
PASSES=0
pass() { PASSES=$((PASSES + 1)); echo "  [PASS] $1"; }
fail() { FAILS=$((FAILS + 1)); echo "  [FAIL] $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/         /'; }
check() { local d="$1"; shift; if out="$("$@" 2>&1)"; then pass "$d"; else fail "$d" "$out"; fi; }
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@example.invalid GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@example.invalid

echo "--- review diff (uncommitted work)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
R="$T/repo"
mkdir -p "$R/src"
cd "$R" || exit 1
git init -q -b main
printf 'export const add = (a, b) => a - b;\n' > src/add.js
printf 'export const one = 1;\n' > src/one.js
printf 'build.log\n' > .gitignore          # .agentic/ deliberately not ignored
git add -A && git commit -q -m init

bash "$RD" fix-add > "$T/empty.out" 2>&1; rc=$?
check "nothing uncommitted: exit 3, says EMPTY" bash -c "[ $rc -eq 3 ] && grep -q '^EMPTY' '$T/empty.out'"

printf 'export const add = (a, b) => a + b;\n' > src/add.js     # tracked edit
printf 'test("adds", () => {});\n' > src/add.test.js            # new file
printf 'export const one = 2;\n' > src/one.js && git add src/one.js   # staged edit
printf 'noise\n' > build.log                                    # ignored
mkdir -p .agentic && printf '# CURRENT\n' > .agentic/focus.md   # not ignored, never part of a change
git worktree add -q -b scratch .claude/worktrees/scratch main 2>/dev/null
staged_before="$(git diff --cached --name-only)"

bash "$RD" "fix add/subtracts" > "$T/run.out" 2>&1; rc=$?
D="$R/.agentic/review/fix-add-subtracts"
check "capture succeeds and prints absolute paths" bash -c "
  [ $rc -eq 0 ] && grep -qx 'DIFF $D.diff FILES $D.files files=3' '$T/run.out'"
check "tracked, staged and new files all in the diff" bash -c "
  grep -qx src/add.js '$D.files' && grep -qx src/one.js '$D.files' && grep -qx src/add.test.js '$D.files' &&
  grep -q '^+export const add = (a, b) => a + b;' '$D.diff' && grep -q '^+test(\"adds\"' '$D.diff'"
check "ignored files, .agentic/ and nested worktrees left out" bash -c "
  ! grep -q 'build.log' '$D.files' && ! grep -q '^.agentic' '$D.files' && ! grep -q '^.claude/worktrees' '$D.files'"
check "the user's real index is untouched" bash -c "[ \"\$(git diff --cached --name-only)\" = '$staged_before' ]"
check "nothing committed, working tree unchanged" bash -c "
  [ \$(git rev-list --count HEAD) -eq 1 ] && grep -q 'a + b' src/add.js"

check "runs from a subdirectory, writes at the repo root" bash -c "
  cd src && bash '$RD' fix-sub >/dev/null && test -s '$R/.agentic/review/fix-sub.diff'"
check "works inside a linked worktree, scoped to that worktree" bash -c "
  cd .claude/worktrees/scratch && echo change > wt.txt && bash '$RD' wt >/dev/null &&
  [ \"\$(cat .agentic/review/wt.files)\" = wt.txt ]"

echo "  review diff: $PASSES passed, $FAILS failed — $([ $FAILS -eq 0 ] && echo PASSED || echo "FAILED ($FAILS)")"
[ "$FAILS" -eq 0 ]
