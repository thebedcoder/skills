#!/usr/bin/env bash
# agentic-engineering test entry point.
#
#   tests/run-tests.sh                    static, then behavioral (skipped without credentials)
#   tests/run-tests.sh --static           static only — no API key, safe for CI
#   tests/run-tests.sh --behavioral       behavioral scenarios only
#   tests/run-tests.sh --scenario NAME    one scenario (file stem or prefix, e.g. 02)
#   tests/run-tests.sh --model haiku      model for behavioral runs (default: sonnet)
#   tests/run-tests.sh --keep             keep fixture projects under the output dir
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

while [ $# -gt 0 ]; do
  case "$1" in
    --static) RUN_STATIC=1; RUN_BEHAVIORAL=0 ;;
    --behavioral) RUN_STATIC=0; RUN_BEHAVIORAL=1 ;;
    --scenario) SCENARIO="$2"; RUN_STATIC=0; RUN_BEHAVIORAL=1; shift ;;
    --model) export AE_TEST_MODEL="$2"; shift ;;
    --keep) KEEP=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
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
    echo "  model: ${AE_TEST_MODEL:-sonnet} · claude $(claude --version 2>/dev/null | head -1) · out: ${OUT_ROOT#"$PLUGIN_ROOT"/}"
    reports=()
    for s in "$HERE"/behavioral/scenarios/*.sh; do
      name="$(basename "$s" .sh)"
      if [ -n "$SCENARIO" ] && [[ "$name" != "$SCENARIO"* ]]; then continue; fi
      echo "--- $name"
      export AE_OUT="$OUT_ROOT/$name"
      mkdir -p "$AE_OUT"
      start=$(date +%s)
      if bash "$s"; then passed=$((passed + 1)); else failed=$((failed + 1)); fi
      echo "  (${name}: $(( $(date +%s) - start ))s)"
      for j in "$AE_OUT"/*.jsonl; do [ -e "$j" ] && reports+=("$j"); done
      [ "$KEEP" = 1 ] || rm -rf "$AE_OUT/project" "$AE_OUT/plain"
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
