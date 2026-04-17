#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Installing Agentic Engineering skill..."

# Create directories if they don't exist
mkdir -p ~/.claude/skills
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/commands

# Install skill (includes all command files, even internal ones)
echo "  → Copying skill..."
cp -r "$SCRIPT_DIR/skills/agentic-engineering" ~/.claude/skills/

# Install rules library — /ae-init reads from this to offer rule templates
echo "  → Copying rules library..."
cp -r "$SCRIPT_DIR/rules-library" ~/.claude/skills/agentic-engineering/

# Patch SKILL.md for Claude Code CLI — hide /agentic-engineering from command palette
# (user-invocable: false is valid in CLI but rejected by claude.ai packager, so we add it post-install)
SKILL_FILE="$HOME/.claude/skills/agentic-engineering/SKILL.md"
if ! grep -q "user-invocable" "$SKILL_FILE"; then
  # Use Python for cross-platform compatibility (macOS sed differs from GNU sed)
  python3 -c "
import re, sys
with open('$SKILL_FILE', 'r') as f:
    content = f.read()
content = content.replace('---\n# Agentic Engineering', 'user-invocable: false\n---\n# Agentic Engineering', 1)
with open('$SKILL_FILE', 'w') as f:
    f.write(content)
"
fi

# Install subagents
echo "  → Copying subagents..."
cp "$SCRIPT_DIR/agents/ae-req.md" ~/.claude/agents/
cp "$SCRIPT_DIR/agents/ae-doc.md" ~/.claude/agents/
cp "$SCRIPT_DIR/agents/ae-scribe.md" ~/.claude/agents/
# ae-red, ae-test, ae-sec, ae-ux are full directories (references + languages)
cp -r "$SCRIPT_DIR/agents/ae-red" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-test" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-sec" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-ux" ~/.claude/agents/

# Install user-facing command wrappers only
# (implement, review, frontend are internal — used by ae-ship, not invoked directly)
echo "  → Copying commands..."
USER_COMMANDS=(
  ae-bootstrap
  ae-init
  ae-feature
  ae-design
  ae-ship
  ae-ship-all
  ae-plan-all
  ae-fix
  ae-note
  ae-doc
  ae-doc-all
  ae-status
  ae-analyze
)

for cmd in "${USER_COMMANDS[@]}"; do
  cp "$SCRIPT_DIR/commands/${cmd}.md" ~/.claude/commands/
done

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Available commands:"
echo "  /ae-bootstrap    scaffold a new project"
echo "  /ae-init         create docs structure + CLAUDE.md"
echo "  /ae-feature      research + PRD + stories"
echo "  /ae-design       generate mockups"
echo "  /ae-ship         implement → review → frontend → docs (one story)"
echo "  /ae-ship-all     ship all unchecked stories"
echo "  /ae-plan-all     plan all unplanned epics"
echo "  /ae-fix          diagnose + fix + review"
echo "  /ae-note         capture a bug, idea, or improvement for later"
echo "  /ae-doc          document a feature interactively"
echo "  /ae-doc-all      document multiple features (use --full for new projects)"
echo "  /ae-status       progress overview"
echo "  /ae-analyze      answer any question about the project"
