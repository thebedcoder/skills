#!/usr/bin/env bash
# PreToolUse guard: .skill files are zip archives, not text.
#
# Editing one with Edit/Write corrupts the archive. They are build output —
# rebuild from the source tree with /rebuild-artifacts instead.
# Exit 2 blocks the tool call and returns the message to Claude.

set -uo pipefail

FILE="$(python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception: print("")' 2>/dev/null)"

if [[ "$FILE" == *.skill ]]; then
  echo "Blocked: ${FILE##*/} is a zip archive (claude.ai skill package), not a text file. Editing it corrupts the archive. Rebuild it from the source tree with /rebuild-artifacts." >&2
  exit 2
fi
exit 0
