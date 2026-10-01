#!/usr/bin/env bash
# review-diff.sh — capture UNCOMMITTED work as a diff file for reviewers.
#
#   review-diff.sh <name>
#
# /fix and /improve review before they commit, so /review's Step 0c (committed
# branch, BASE...HEAD) sees none of their change — on a fresh branch it aborts,
# on an older one it reviews the wrong commits. This writes everything not yet
# committed — tracked edits, staged or not, and new files that are not ignored —
# against HEAD:
#   .agentic/review/<name>.diff    full diff
#   .agentic/review/<name>.files   changed paths, one per line
# through a throwaway index: what the user staged stays exactly as it was.
# Reviewers have no Bash; the caller passes the printed absolute paths.
#
# Prints `DIFF <abs .diff path> FILES <abs .files path> files=<N>`.
# Exit 0 ok · 3 nothing uncommitted (a review of nothing is a failure, not a clean
# pass) · 2 usage · 1 git failure.

set -uo pipefail

name="${1:-}"
[ -n "$name" ] || { sed -n '2,18p' "$0" >&2; exit 2; }
root="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "not inside a git repository" >&2; exit 1; }
cd "$root" || exit 1
git rev-parse --verify --quiet HEAD >/dev/null || { echo "no commit yet — nothing to diff against" >&2; exit 1; }

slug="$(printf '%s' "$name" | tr -c 'A-Za-z0-9._-' '-')"
mkdir -p .agentic/review
out="$root/.agentic/review/$slug"

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
# Start from the real index so staged-but-unchanged state is kept; no index yet →
# let git build one.
cp "$(git rev-parse --git-path index)" "$tmp" 2>/dev/null || rm -f "$tmp"
# .agentic/ (review files, focus) and nested worktrees are never part of the change,
# even where .gitignore does not say so yet.
GIT_INDEX_FILE="$tmp" git add -A || { echo "git add into the throwaway index failed" >&2; exit 1; }
GIT_INDEX_FILE="$tmp" git rm -r -q --cached --ignore-unmatch -- .agentic .claude/worktrees >/dev/null
GIT_INDEX_FILE="$tmp" git diff --cached --binary HEAD > "$out.diff" || exit 1
GIT_INDEX_FILE="$tmp" git diff --cached --name-only HEAD > "$out.files" || exit 1

n="$(wc -l < "$out.files" | tr -d ' ')"
if [ "$n" -eq 0 ]; then
  echo "EMPTY: nothing uncommitted to review — $out.diff is empty"
  exit 3
fi
echo "DIFF $out.diff FILES $out.files files=$n"
