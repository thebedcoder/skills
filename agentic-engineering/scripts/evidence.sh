#!/usr/bin/env bash
# evidence.sh — fresh test evidence for story completion claims.
#
#   evidence.sh run --phase <phase> -- <test command...>
#       Runs the command from the repo root, streams its output, then prints one
#       Markdown row for the story's `### Evidence` table:
#         EVIDENCE-ROW: | <phase> | `<cmd>` | exit <rc> · <runner summary> | <YYYY-MM-DD HH:MM> | <tree> |
#       Exits with the command's own exit code.
#
#   evidence.sh check <PROGRESS.md> <STORY-ID> [--diff <file>]
#       Reads the story's latest Evidence row and compares its tree with the
#       current one. Prints:
#         EVIDENCE: <fresh|stale|failing|missing> story=<ID> checked_in_diff=<yes|no|unknown> row_tree=<t> current_tree=<t>
#       then the row itself. Exit 0 when fresh, 1 otherwise, 2 on usage error.
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

cmd_run() {
  local phase=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --phase) phase="$2"; shift 2 ;;
      --) shift; break ;;
      *) echo "usage: evidence.sh run --phase <phase> -- <command...>" >&2; exit 2 ;;
    esac
  done
  [ -n "$phase" ] && [ $# -gt 0 ] || { echo "usage: evidence.sh run --phase <phase> -- <command...>" >&2; exit 2; }
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
  printf 'EVIDENCE-ROW: | %s | `%s` | exit %s · %s | %s | %s |\n' \
    "$(cell "$phase")" "$(cell "$shown")" "$rc" "$(cell "${summary:0:160}")" "$(date '+%Y-%m-%d %H:%M')" "${tree:0:12}"
  return "$rc"
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
  # Latest row of the Evidence table inside this story's entry (## STORY-ID … next ## heading).
  local row=""
  if [ -f "$progress" ]; then
    row="$(awk -v id="$story" '
      /^## / { inside = ($0 ~ "^## " id "([^0-9]|$)"); ev = 0; next }
      inside && /^### / { ev = ($0 ~ /^### Evidence/); next }
      inside && ev && /^\|/ && !/^\|[-[:space:]|:]+$/ && !/^\|[[:space:]]*Phase[[:space:]]*\|/ { last = $0 }
      END { print last }' "$progress")"
  fi
  local current; current="$(tree_id)"
  local verdict row_tree=""
  if [ -z "$row" ]; then
    verdict="missing"
  else
    row_tree="$(printf '%s' "$row" | sed -E 's/.*\|[[:space:]]*([0-9a-f]{7,40})[[:space:]]*\|[[:space:]]*$/\1/')"
    [[ "$row_tree" =~ ^[0-9a-f]{7,40}$ ]] || row_tree=""
    if ! printf '%s' "$row" | grep -qE '\|[[:space:]]*exit 0([^0-9]|$)'; then
      verdict="failing"
    elif [ -z "$row_tree" ] || [ "${current:0:${#row_tree}}" != "$row_tree" ]; then
      verdict="stale"
    else
      verdict="fresh"
    fi
  fi
  echo "EVIDENCE: $verdict story=$story checked_in_diff=$checked row_tree=${row_tree:-none} current_tree=${current:0:12}"
  [ -n "$row" ] && echo "last row: $row"
  [ "$verdict" = "fresh" ]
}

sub="${1:-}"
[ $# -gt 0 ] && shift
case "$sub" in
  run) cmd_run "$@" ;;
  check) cmd_check "$@" ;;
  tree) tree_id ;;
  *) sed -n '2,24p' "$0" >&2; exit 2 ;;
esac
