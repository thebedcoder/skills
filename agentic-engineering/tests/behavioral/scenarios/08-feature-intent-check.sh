#!/usr/bin/env bash
# P3-a: full-mode /feature checks the request for user, outcome and constraint
# before ARCH proposes approaches. Vague input → one question, no approaches, no
# PRD yet. Complete input → no intent question, straight to the approach options.
set -uo pipefail
. "$(dirname "$0")/../../lib/claude.sh"
. "$(dirname "$0")/../../lib/fixtures.sh"

build() {
  fixture_base "$1" full
  cat > "$1/src/notes.js" <<'JS'
const notes = new Map();
let nextId = 1;
export function createNote(body) {
  const note = { id: nextId++, body, createdAt: new Date().toISOString() };
  notes.set(note.id, note);
  return note;
}
export function listNotes() {
  return [...notes.values()];
}
JS
  fixture_commit "$1" "feat: notes module"
}

cat > "$AE_OUT/assert.py" <<'PY'
import re, subprocess, sys
text = subprocess.run([sys.executable, sys.argv[1], "text", sys.argv[2]], capture_output=True, text=True).stdout
mode = sys.argv[3]
options = len(set(re.findall(r"Option ([ABC])\b", text)))
intent_note = bool(re.search(r"PROD\W+Intent", text))
# Distinct question sentences, wherever they sit on a line ("**Who is it for?** For example:").
questions = sorted({q.strip("* ") for q in re.findall(r"[A-Z][^?\n]{3,200}\?", text)})
print(f"options={options} intent_note={intent_note} questions={len(questions)}")
for q in questions[:4]:
    print("  ?", q[:140])
if mode == "vague":
    ok = options < 2 and 1 <= len(questions) <= 2
else:
    ok = options >= 2 and intent_note
sys.exit(0 if ok else 1)
PY

V="$AE_OUT/vague"; build "$V"
ae_run_claude "$V" "$AE_OUT/vague.jsonl" "/agentic-engineering:feature export" 2
ae_check "vague: asks one intent question, proposes no approaches yet" \
  python3 "$AE_OUT/assert.py" "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$AE_OUT/vague.jsonl" vague
ae_check "vague: no PRD written before intent is known" bash -c "! ls '$V'/docs/features/*/PRD.md >/dev/null 2>&1"

C="$AE_OUT/complete"; build "$C"
ae_run_claude "$C" "$AE_OUT/complete.jsonl" "/agentic-engineering:feature csv-export — Admins need to download every note as a CSV file so they can audit note history offline in a spreadsheet. Constraint: must handle 10,000 notes without building the whole file in memory, and add no new dependencies." 3
ae_check "complete: no intent questions, intent note printed, approaches proposed" \
  python3 "$AE_OUT/assert.py" "$AE_PLUGIN_ROOT/tests/lib/transcript.py" "$AE_OUT/complete.jsonl" complete
ae_done
