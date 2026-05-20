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

# Install rules library — /init reads from this to offer rule templates
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

# Install subagents (agent file names retain the ae- prefix to avoid generic-name collisions
# with other plugins — e.g., a bare "doc" agent could clash)
echo "  → Copying subagents..."
cp "$SCRIPT_DIR/agents/ae-req.md" ~/.claude/agents/
cp "$SCRIPT_DIR/agents/ae-doc.md" ~/.claude/agents/
cp "$SCRIPT_DIR/agents/ae-scribe.md" ~/.claude/agents/
# ae-red, ae-test, ae-sec, ae-ux, ae-edge are full directories (references + languages)
cp -r "$SCRIPT_DIR/agents/ae-red" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-test" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-sec" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-ux" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-edge" ~/.claude/agents/

# Install user-facing command wrappers only
# (implement, review, frontend are internal — used by ship, not invoked directly)
echo "  → Copying commands..."
USER_COMMANDS=(
  bootstrap
  init
  feature
  design
  ship
  ship-all
  plan-all
  fix
  note
  focus
  next
  doc
  doc-all
  status
  analyze
)

# Install statusline script (shared utility; per-project trigger is written by /init or /bootstrap).
echo "  → Copying statusline script..."
cp "$SCRIPT_DIR/agentic-statusline.sh" ~/.claude/agentic-statusline.sh
chmod +x ~/.claude/agentic-statusline.sh

for cmd in "${USER_COMMANDS[@]}"; do
  cp "$SCRIPT_DIR/commands/${cmd}.md" ~/.claude/commands/
done

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Available commands:"
echo "  /bootstrap    scaffold a new project"
echo "  /init         create docs structure + CLAUDE.md"
echo "  /feature      research + PRD + stories"
echo "  /design       generate mockups"
echo "  /ship         implement → review → frontend → docs (one story)"
echo "  /ship-all     ship all unchecked stories"
echo "  /plan-all     plan all unplanned epics"
echo "  /fix          diagnose + fix + review"
echo "  /note         capture a bug, idea, or improvement for later"
echo "  /focus        set current task (or /focus done|clear)"
echo "  /next         queue a task for after current is done"
echo "  /doc          document a feature interactively"
echo "  /doc-all      document multiple features (use --full for new projects)"
echo "  /status       progress overview"
echo "  /analyze      answer any question about the project"
