#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 Installing update-dependencies..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skill..."
rm -rf ~/.claude/skills/update-dependencies
cp -r "$SCRIPT_DIR/skills/update-dependencies" ~/.claude/skills/

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/update-dependencies.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /update-dependencies   audit + upgrade deps on any stack (also fires on \"update dependencies\")"
