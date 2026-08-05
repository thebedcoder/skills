#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 Installing flutter-motion..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skill..."
rm -rf ~/.claude/skills/flutter-motion
cp -r "$SCRIPT_DIR/skills/flutter-motion" ~/.claude/skills/

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/flutter-motion.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /flutter-motion   audit + polish Flutter app motion (also fires on \"the app feels cheap\")"
