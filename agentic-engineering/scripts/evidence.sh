#!/usr/bin/env bash
# evidence.sh — fresh test evidence for story completion claims.
#
#   evidence.sh run --phase <phase> [--expect-fail] -- <test command...>
#       Runs the command from the repo root, streams its output, then prints one
#       Markdown row for the story's `### Evidence` table:
#         EVIDENCE-ROW: | <phase> | `<cmd>` | exit <rc> · <runner summary> | <YYYY-MM-DD HH:MM> | <tree> |
#       and appends the run to the ledger (below). Exits with the command's own
#       exit code — except under --expect-fail (the red run of TDD: new tests
#       written, code not yet): exit 0 when the command failed as expected, 1
#       when it passed, because a test that passes before its code exists tests
#       nothing new.
#
#   evidence.sh check <PROGRESS.md> <STORY-ID> [--diff <file>]
#       Reads the story's latest Evidence row, looks it up in the ledger and
#       compares its tree with the current one. Prints:
#         EVIDENCE: <fresh|stale|failing|unverified|missing> story=<ID> checked_in_diff=<yes|no|unknown> row_tree=<t> current_tree=<t> red=<present|missing>
#       then the row itself. Exit 0 when fresh, 1 otherwise, 2 on usage error.
#       unverified = no run in the ledger matches the row (phase, exit code, time,
#       tree): it was typed, edited, or recorded on another machine. red=present
#       when the story's table holds a verified failing `red` row.
#
# Ledger: <git common dir>/agentic/evidence.log — one tab-separated line per
# run. Inside .git, so never committed, never in a diff, shared by every
# worktree of the repository, and not a file anyone edits by accident.
#
#   evidence.sh check-row '<row>'
#       Same verdict for one row with no PROGRESS.md entry behind it — /improve
#       and /fix carry their row in the summary and the commit trailer:
#         EVIDENCE: <fresh|stale|failing|unverified> row_tree=<t> current_tree=<t>
#
#   evidence.sh tree
#       Prints the current code tree id.
#
# Tree id: `git write-tree` of the working tree (tracked + untracked, .gitignore
# honoured) through a throwaway index, with docs/, app-docs/ and .agentic/ left
# out. Same value before and after a commit of the same code; any code edit
# changes it; doc and progress edits never do. A row is evidence for exactly the
# code it ran against — output from an earlier phase, before a fix, is stale.

set -uo pipefail

CALLER_PWD="$PWD"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "evidence.sh: not in a git repository" >&2; exit 2; }
cd "$ROOT" || exit 2
abs() { case "$1" in /*) printf '%s' "$1" ;; *) printf '%s/%s' "$CALLER_PWD" "$1" ;; esac; }

EXCLUDE=(docs app-docs .agentic)

tree_id() {
  local tmp idx
  tmp="$(mktemp)"
  idx="$(git rev-parse --git-path index)"
  # Start from the real index so git reuses its stat cache instead of re-hashing.
  if [ -f "$idx" ]; then cp "$idx" "$tmp"; else rm -f "$tmp"; fi
  GIT_INDEX_FILE="$tmp" git add -A -- . >/dev/null 2>&1
  GIT_INDEX_FILE="$tmp" git rm -r -q --cached --ignore-unmatch -- "${EXCLUDE[@]}" >/dev/null 2>&1
  GIT_INDEX_FILE="$tmp" git write-tree
  rm -f "$tmp"
}

cell() { printf '%s' "$1" | tr '\n\t' '  ' | sed 's/|/\\|/g'; }

ledger_path() {
  local d
  d="$(git rev-parse --git-common-dir 2>/dev/null)" || return 1
  case "$d" in /*) ;; *) d="$ROOT/$d" ;; esac
  printf '%s/agentic/evidence.log' "$d"
}

# Cells a check needs from one Evidence row, tab-separated: phase, exit code,
# run-at, tree. Escaped pipes inside the command cell are not separators.
row_fields() {
  printf '%s\n' "$1" | awk '{
    gsub(/\\\|/, "\001"); n = split($0, c, "|")
    for (i = 1; i <= n; i++) { gsub(/^[ \t]+|[ \t]+$/, "", c[i]) }
    rc = ""; if (match(c[n-3], /exit [0-9]+/)) rc = substr(c[n-3], RSTART + 5, RLENGTH - 5)
    printf "%s\t%s\t%s\t%s\n", c[2], rc, c[n-2], c[n-1]
  }'
}

# Was this row printed by a real `run`? Matched on phase, exit code, minute and tree.
in_ledger() {
  local ledger phase rc at tree
  ledger="$(ledger_path)" || return 1
  [ -f "$ledger" ] || return 1
  IFS=$'\t' read -r phase rc at tree <<<"$(row_fields "$1")"
  [ -n "$rc" ] && [ -n "$tree" ] || return 1
  awk -F '\t' -v p="$phase" -v r="$rc" -v a="$at" -v t="$tree" '
    $1 == "v1" && $2 == a && $3 == p && $4 == r && index($5, t) == 1 { found = 1; exit }
    END { exit !found }' "$ledger"
}

cmd_run() {
  local phase="" expect="pass"
  local usage="usage: evidence.sh run --phase <phase> [--expect-fail] -- <command...>"
  while [ $# -gt 0 ]; do
    case "$1" in
      --phase) phase="$2"; shift 2 ;;
      --expect-fail) expect="fail"; shift ;;
      --) shift; break ;;
      *) echo "$usage" >&2; exit 2 ;;
    esac
  done
  [ -n "$phase" ] && [ $# -gt 0 ] || { echo "$usage" >&2; exit 2; }
  local log; log="$(mktemp)"
  "$@" 2>&1 | tee "$log"
  local rc="${PIPESTATUS[0]}"
  # The runner's own summary lines: jest/vitest "Tests:", pytest "== 3 passed ==",
  # node --test "# pass"/"# fail", go "ok"/"FAIL", cargo "test result:", generic "N passed".
  local summary
  summary="$(grep -aiE '(^|[^a-z])(tests?:|# (pass|fail|tests)|test result:|[0-9]+ (passed|failed|failing|passing|errors?)|^(ok|fail|pass)[[:space:]])' "$log" \
    | sed -E 's/\x1b\[[0-9;]*m//g; s/^[[:space:]=#-]+//; s/[[:space:]=]+$//' | tail -n 3 \
    | awk 'NR > 1 { printf " · " } { printf "%s", $0 }')"
  [ -n "$summary" ] || summary="$(grep -av '^[[:space:]]*$' "$log" | tail -n 1 | sed -E 's/\x1b\[[0-9;]*m//g')"
  rm -f "$log"
  local tree; tree="$(tree_id)"
  # Re-quote only the arguments that need it, so the cell reads like the command typed.
  local shown="" a
  for a in "$@"; do
    if [[ "$a" =~ [[:space:]\"\'\$\`\\\;\&\|\<\>\(\)\*\?] ]]; then a="'${a//\'/\'\\\'\'}'"; fi
    shown="${shown:+$shown }$a"
  done
  local at; at="$(date '+%Y-%m-%d %H:%M')"
  local ledger
  if ledger="$(ledger_path)" && mkdir -p "${ledger%/*}" 2>/dev/null; then
    printf 'v1\t%s\t%s\t%s\t%s\t%s\t%s\n' "$at" "$(cell "$phase")" "$rc" "${tree:0:12}" "$expect" "$(cell "$shown")" >> "$ledger" \
      || echo "evidence.sh: could not append to $ledger — check will report this row unverified" >&2
  else
    echo "evidence.sh: no ledger directory — check will report this row unverified" >&2
  fi
  printf 'EVIDENCE-ROW: | %s | `%s` | exit %s · %s | %s | %s |\n' \
    "$(cell "$phase")" "$(cell "$shown")" "$rc" "$(cell "${summary:0:160}")" "$at" "${tree:0:12}"
  if [ "$expect" = "fail" ]; then
    if [ "$rc" -ne 0 ]; then
      echo "EVIDENCE-RED: ok — failed before the code exists"
      return 0
    fi
    echo "EVIDENCE-RED: UNEXPECTED PASS — these tests pass without the code; they prove nothing new. Fix the tests, then re-run."
    return 1
  fi
  return "$rc"
}

tree_of() {
  local t
  t="$(printf '%s' "$1" | sed -E 's/.*\|[[:space:]]*([0-9a-f]{7,40})[[:space:]]*\|[[:space:]]*$/\1/')"
  [[ "$t" =~ ^[0-9a-f]{7,40}$ ]] && printf '%s' "$t"
}

# Verdict for one row against the current tree: failing, unverified, stale, fresh.
row_verdict() {
  local row="$1" current="$2" t
  t="$(tree_of "$row")"
  if ! printf '%s' "$row" | grep -qE '\|[[:space:]]*exit 0([^0-9]|$)'; then
    echo failing
  elif ! in_ledger "$row"; then
    echo unverified
  elif [ -z "$t" ] || [ "${current:0:${#t}}" != "$t" ]; then
    echo stale
  else
    echo fresh
  fi
}

cmd_check_row() {
  local row="${1:-}"
  row="${row#EVIDENCE-ROW: }"
  [ -n "$row" ] || { echo "usage: evidence.sh check-row '<row>'" >&2; exit 2; }
  local current; current="$(tree_id)"
  local verdict; verdict="$(row_verdict "$row" "$current")"
  local t; t="$(tree_of "$row")"
  echo "EVIDENCE: $verdict row_tree=${t:-none} current_tree=${current:0:12}"
  [ "$verdict" = "fresh" ]
}

cmd_check() {
  local progress="${1:-}" story="${2:-}" diff=""
  [ -n "$progress" ] && [ -n "$story" ] || { echo "usage: evidence.sh check <PROGRESS.md> <STORY-ID> [--diff <file>]" >&2; exit 2; }
  shift 2
  while [ $# -gt 0 ]; do
    case "$1" in
      --diff) diff="$2"; shift 2 ;;
      *) echo "usage: evidence.sh check <PROGRESS.md> <STORY-ID> [--diff <file>]" >&2; exit 2 ;;
    esac
  done
  progress="$(abs "$progress")"
  [ -n "$diff" ] && diff="$(abs "$diff")"
  local checked="unknown"
  if [ -n "$diff" ]; then
    if [ -f "$diff" ] && grep -qE "^\+[[:space:]]*- \[[xX]\] ${story}([^0-9]|$)" "$diff"; then checked="yes"; else checked="no"; fi
  fi
  # Rows of the Evidence table inside this story's entry (## STORY-ID … next ## heading).
  local rows="" row=""
  if [ -f "$progress" ]; then
    rows="$(awk -v id="$story" '
      /^## / { inside = ($0 ~ "^## " id "([^0-9]|$)"); ev = 0; next }
      inside && /^### / { ev = ($0 ~ /^### Evidence/); next }
      inside && ev && /^\|/ && !/^\|[-[:space:]|:]+$/ && !/^\|[[:space:]]*Phase[[:space:]]*\|/ { print }' "$progress")"
    row="$(printf '%s\n' "$rows" | tail -n 1)"
  fi
  local current; current="$(tree_id)"
  local verdict row_tree=""
  if [ -z "$row" ]; then
    verdict="missing"
  else
    row_tree="$(tree_of "$row")"
    verdict="$(row_verdict "$row" "$current")"
  fi
  # TDD's red run: a verified, failing `red` row anywhere in the story's table.
  local red="missing" r phase rc _at _tree
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    IFS=$'\t' read -r phase rc _at _tree <<<"$(row_fields "$r")"
    if [ "$phase" = "red" ] && [ -n "$rc" ] && [ "$rc" != "0" ] && in_ledger "$r"; then red="present"; break; fi
  done <<<"$rows"
  echo "EVIDENCE: $verdict story=$story checked_in_diff=$checked row_tree=${row_tree:-none} current_tree=${current:0:12} red=$red"
  [ -n "$row" ] && echo "last row: $row"
  [ "$verdict" = "fresh" ]
}

sub="${1:-}"
[ $# -gt 0 ] && shift
case "$sub" in
  run) cmd_run "$@" ;;
  check) cmd_check "$@" ;;
  check-row) cmd_check_row "$@" ;;
  tree) tree_id ;;
  *) sed -n '2,40p' "$SELF" >&2; exit 2 ;;
esac
