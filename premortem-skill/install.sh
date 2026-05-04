#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔮 Installing Premortem Skill..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/agents

echo "  → Copying skill..."
rm -rf ~/.claude/skills/premortem
cp -r "$SCRIPT_DIR/skills/premortem" ~/.claude/skills/

echo "  → Copying agent..."
rm -rf ~/.claude/agents/premortem-investigator
cp -r "$SCRIPT_DIR/agents/premortem-investigator" ~/.claude/agents/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /premortem <plan or decision>          — run a premortem on the target"
echo "  /premortem                             — describe the target conversationally"
echo "  /premortem <target> --html             — also emit a styled HTML report"
echo ""
echo "Agent installed:"
echo "  premortem-investigator — deep-dives one assigned failure reason"
