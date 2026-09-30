#!/usr/bin/env bash
# P2-c: /diagnose, run against a transcript where the seven reviewers were
# dispatched one per message, names that deviation and quotes the lines.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

P="$AE_OUT/project"
fixture_base "$P" lite
mkdir -p "$AE_OUT/input" && cp "$AE_PLUGIN_ROOT/tests/fixtures/transcripts/review-sequential.jsonl" "$AE_OUT/input/session.jsonl"

T="$AE_OUT/transcript.jsonl"
ae_run_claude "$P" "$T" "/agentic-engineering:diagnose $AE_OUT/input/session.jsonl" 2

ae_check "run completed" test "$(cat "$T.rc")" = 0
cat > "$AE_OUT/assert.py" <<'PY'
import re, subprocess, sys
text = subprocess.run([sys.executable, sys.argv[1], "text", sys.argv[2]], capture_output=True, text=True).stdout
named = re.search(r"(sequential|one (at a time|per message|by one)|separate (assistant )?messages|7 (assistant )?messages)", text, re.I)
lines = set(re.findall(r"\bL(14|16|18|20|22|24|26)\b", text))
print(f"named={bool(named)} cited={sorted(lines)}")
print(text[-1200:])
sys.exit(0 if named and len(lines) >= 3 else 1)
PY
ae_check "names the sequential-dispatch deviation and quotes ≥3 of its lines (L14…L26)" \
  python3 "$AE_OUT/assert.py" "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$T"
ae_check "read-only without --bundle: project untouched, no .agentic/diagnose" bash -c "
  cd '$P' && [ -z \"\$(git status --porcelain)\" ] && [ ! -d .agentic/diagnose ]"
ae_done
