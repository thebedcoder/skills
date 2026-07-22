#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔀 Installing squash-merge..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skill..."
rm -rf ~/.claude/skills/squash-merge
cp -r "$SCRIPT_DIR/skills/squash-merge" ~/.claude/skills/

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/squash-merge.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /squash-merge [target-branch]   squash the current branch into target,"
echo "                                  then choose whether to push / delete the old branch"
