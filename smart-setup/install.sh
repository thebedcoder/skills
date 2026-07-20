#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧰 Installing smart-setup..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skills..."
rm -rf ~/.claude/skills/smart-setup
cp -r "$SCRIPT_DIR/skills/smart-setup" ~/.claude/skills/
rm -rf ~/.claude/skills/update-dependencies
cp -r "$SCRIPT_DIR/skills/update-dependencies" ~/.claude/skills/

# rules-library single source of truth lives in agentic-engineering (sibling plugin)
RULES_SRC="$SCRIPT_DIR/../agentic-engineering/rules-library"
if [ -d "$RULES_SRC" ]; then
  echo "  → Copying rules-library from sibling plugin..."
  cp -r "$RULES_SRC" ~/.claude/skills/smart-setup/
else
  echo "  ⚠ rules-library not found at $RULES_SRC — stack rule templates unavailable"
fi

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/smart-setup.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /smart-setup           scan/interview → tier → manifest → generate"
echo "  /smart-setup update    re-audit existing setup, propose amendments"
echo "  \"update dependencies\"  audit + upgrade deps on any stack (update-dependencies skill)"
