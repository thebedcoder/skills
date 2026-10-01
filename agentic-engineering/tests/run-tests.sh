#!/usr/bin/env bash
# agentic-engineering test entry point.
#
#   tests/run-tests.sh                    static, then behavioral (skipped without credentials)
#   tests/run-tests.sh --static           static only — no API key, safe for CI
#   tests/run-tests.sh --behavioral       behavioral scenarios only
#   tests/run-tests.sh --scenario NAME    one scenario (file stem or prefix, e.g. 02)
#   tests/run-tests.sh --model haiku      model for behavioral runs (default: sonnet)
#   tests/run-tests.sh --keep             keep fixture projects (temp dir outside the repo)
#   tests/run-tests.sh --scenario 13 --against <git-ref>
#                                         pressure test: run scenarios with the plugin as it
#                                         was at <ref> (harness + assertions stay current).
#                                         A new gate's scenario must FAIL here and pass on HEAD.
#
# Behavioral output (transcripts, token reports) lands in tests/behavioral/out/<stamp>/.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "$HERE/.." && pwd)"
export AE_PLUGIN_ROOT="$PLUGIN_ROOT"

RUN_STATIC=1
RUN_BEHAVIORAL=1
SCENARIO=""
KEEP=0
AGAINST=""

while [ $# -gt 0 ]; do
  case "$1" in
    --static) RUN_STATIC=1; RUN_BEHAVIORAL=0 ;;
    --behavioral) RUN_STATIC=0; RUN_BEHAVIORAL=1 ;;
    --scenario) SCENARIO="$2"; RUN_STATIC=0; RUN_BEHAVIORAL=1; shift ;;
    --model) export AE_TEST_MODEL="$2"; shift ;;
    --keep) KEEP=1 ;;
    --against) AGAINST="$2"; RUN_STATIC=0; RUN_BEHAVIORAL=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

failed=0
passed=0
skipped=0

if [ "$RUN_STATIC" = 1 ]; then
  echo "========================================"
  echo " Static infra tests"
  echo "========================================"
  for t in "$HERE"/static/test_*.py "$HERE"/static/test_*.sh; do
    [ -e "$t" ] || continue
    case "$t" in
      *.py) python3 "$t" ;;
      *.sh) bash "$t" ;;
    esac
    if [ $? -eq 0 ]; then passed=$((passed + 1)); else failed=$((failed + 1)); fi
  done
fi

if [ "$RUN_BEHAVIORAL" = 1 ]; then
  echo "========================================"
  echo " Behavioral scenarios"
  echo "========================================"
  # shellcheck source=lib/claude.sh
  . "$HERE/lib/claude.sh"
  reason="$(ae_skip_reason)"
  if [ -n "$reason" ]; then
    echo "  [SKIP] behavioral scenarios — $reason"
    skipped=$((skipped + 1))
  else
    stamp="$(date +%Y%m%d-%H%M%S)"
    OUT_ROOT="$HERE/behavioral/out/$stamp"
    mkdir -p "$OUT_ROOT"
    if [ -n "$AGAINST" ]; then
      # The plugin as it was at <ref>, extracted outside the repo: no worktree, no
      # checkout, nothing in the repo changes. Only --plugin-dir points at it.
      base_dir="$(mktemp -d "${TMPDIR:-/tmp}/ae-against.XXXXXX")"
      rel="$(git -C "$PLUGIN_ROOT" rev-parse --show-prefix)"; rel="${rel%/}"
      top="$(git -C "$PLUGIN_ROOT" rev-parse --show-toplevel)"
      if ! git -C "$top" archive "$AGAINST" -- "$rel" | tar -x -C "$base_dir" 2>/dev/null \
         || [ ! -d "$base_dir/$rel" ]; then
        echo "  cannot extract $rel at $AGAINST" >&2; exit 2
      fi
      export AE_PLUGIN_UNDER_TEST="$base_dir/$rel"
      echo "  PRESSURE TEST — plugin under test: $AGAINST. A scenario that passes here does not test your change."
    fi
    echo "  model: ${AE_TEST_MODEL:-sonnet} · claude $(claude --version 2>/dev/null | head -1) · out: ${OUT_ROOT#"$PLUGIN_ROOT"/}"
    reports=()
    for s in "$HERE"/behavioral/scenarios/*.sh; do
      name="$(basename "$s" .sh)"
      if [ -n "$SCENARIO" ] && [[ "$name" != "$SCENARIO"* ]]; then continue; fi
      echo "--- $name"
      export AE_OUT="$OUT_ROOT/$name"
      # Fixture projects live OUTSIDE this repo: Claude Code loads every CLAUDE.md
      # from the cwd up, and a fixture under tests/ would inherit this repo's
      # developer notes about the plugin — contaminating behavior and token counts.
      export AE_WORK
      AE_WORK="$(mktemp -d "${TMPDIR:-/tmp}/ae-scenario.XXXXXX")/$name"
      mkdir -p "$AE_OUT" "$AE_WORK"
      start=$(date +%s)
      if bash "$s"; then passed=$((passed + 1)); else failed=$((failed + 1)); fi
      echo "  (${name}: $(( $(date +%s) - start ))s)"
      for j in "$AE_OUT"/*.jsonl; do [ -e "$j" ] && reports+=("$j"); done
      if [ "$KEEP" = 1 ]; then echo "  fixtures kept: $AE_WORK"; else rm -rf "$(dirname "$AE_WORK")"; fi
    done
    if [ ${#reports[@]} -gt 0 ]; then
      python3 "$HERE/token-report.py" transcript "${reports[@]}" | tee "$OUT_ROOT/token-report.txt"
    fi
  fi
fi

echo "========================================"
echo " Passed: $passed  Failed: $failed  Skipped: $skipped"
echo "========================================"
[ "$failed" -eq 0 ]
