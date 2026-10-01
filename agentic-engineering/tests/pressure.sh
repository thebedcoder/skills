#!/usr/bin/env bash
# pressure.sh — does each new scenario prove its rule? Run it on this tree (must
# pass) and against <base-ref> (must fail). A scenario that passes both ways tests
# nothing.
#
#   tests/pressure.sh [--dry-run] [--model M] <base-ref> [scenario-stem ...]
#
# No stems → the scenarios this branch added or changed since <base-ref>:
#   added    → must pass here AND fail against <base-ref>   (PROVES / TESTS-NOTHING)
#   modified → must pass here; the base run is reported only (a fixture tweak or a
#              renamed PLAN line is not a new rule)
# Named stems are treated as added.
#
# Exit 0 when every required check holds, 1 otherwise, 2 on usage error. Without
# credentials it prints SKIP and exits 0 — a skipped base run would otherwise read
# as "fails before", which proves nothing.

set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$HERE/.." && pwd)"
DRY=0
MODEL="${AE_TEST_MODEL:-sonnet}"
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift ;;
    --model) MODEL="$2"; shift 2 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) break ;;
  esac
done
BASE="${1:-}"; [ -n "$BASE" ] || { sed -n '2,16p' "$0" >&2; exit 2; }
shift
git -C "$PLUGIN_ROOT" rev-parse --verify --quiet "$BASE^{commit}" >/dev/null || { echo "pressure: no commit $BASE" >&2; exit 2; }

declare -a ADDED=() MODIFIED=()
if [ $# -gt 0 ]; then
  ADDED=("$@")
else
  top="$(git -C "$PLUGIN_ROOT" rev-parse --show-toplevel)"
  rel="$(git -C "$PLUGIN_ROOT" rev-parse --show-prefix)tests/behavioral/scenarios"
  while IFS=$'\t' read -r st path; do
    [ -n "$path" ] || continue
    stem="$(basename "$path" .sh)"
    case "$st" in A*) ADDED+=("$stem") ;; M*) MODIFIED+=("$stem") ;; esac
  done < <(git -C "$top" diff --name-status "$BASE"...HEAD -- "$rel/*.sh")
fi
if [ ${#ADDED[@]} -eq 0 ] && [ ${#MODIFIED[@]} -eq 0 ]; then
  echo "pressure: no scenario added or changed since $BASE — nothing to prove"; exit 0
fi

if [ "$DRY" = 1 ]; then
  for s in "${ADDED[@]}"; do echo "PLAN $s: run here (must pass) · run --against $BASE (must fail)"; done
  for s in "${MODIFIED[@]}"; do echo "PLAN $s: run here (must pass) · run --against $BASE (reported)"; done
  exit 0
fi

. "$HERE/lib/claude.sh"
reason="$(ae_skip_reason)"
if [ -n "$reason" ]; then echo "  [SKIP] pressure test — $reason"; exit 0; fi

run() { AE_TEST_MODEL="$MODEL" bash "$HERE/run-tests.sh" --scenario "$1" "${@:2}" >/dev/null 2>&1; }
rc=0
for s in "${ADDED[@]}" "${MODIFIED[@]}"; do
  added=0; for a in "${ADDED[@]}"; do [ "$a" = "$s" ] && added=1; done
  run "$s"; here=$?
  run "$s" --against "$BASE"; before=$?
  if [ "$here" -ne 0 ]; then
    echo "FAILS-HERE $s — the scenario does not pass on this branch"; rc=1
  elif [ "$added" = 1 ] && [ "$before" -eq 0 ]; then
    echo "TESTS-NOTHING $s — passes against $BASE too: it would pass without this change"; rc=1
  elif [ "$added" = 1 ]; then
    echo "PROVES $s — fails against $BASE, passes here"
  else
    echo "PASSES $s — changed scenario; against $BASE it $([ "$before" -eq 0 ] && echo passed || echo failed)"
  fi
done
exit $rc
