#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🎯 Installing JTBD Megaskill..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/agents

# Install skill
echo "  → Copying skill..."
cp -r "$SCRIPT_DIR/skills/jtbd" ~/.claude/skills/

# Patch SKILL.md for Claude Code CLI — hide from command palette
# (user-invocable: false is valid in CLI but rejected by claude.ai packager, so added post-install)
SKILL_FILE="$HOME/.claude/skills/jtbd/SKILL.md"
if ! grep -q "user-invocable" "$SKILL_FILE"; then
  python3 -c "
with open('$SKILL_FILE', 'r') as f:
    content = f.read()
content = content.replace('---\n# Jobs to Be Done', 1), 'user-invocable: false\n---\n# Jobs to Be Done', 1)
with open('$SKILL_FILE', 'w') as f:
    f.write(content)
"
fi

# Install agents (each is a directory with AGENT.md + references/)
echo "  → Copying agents..."
cp -r "$SCRIPT_DIR/agents/jtbd-researcher" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/jtbd-analyst"   ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/jtbd-scout"     ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/jtbd-copywriter" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/jtbd-scriptwriter" ~/.claude/agents/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /jtbd <product brief>   — full chain from a brief"
echo "  /jtbd MODE 3            — jump to a specific mode"
echo "  /jtbd                   — show mode guide"
echo ""
echo "Agents installed:"
echo "  jtbd-researcher   — market intelligence (MODE 0)"
echo "  jtbd-analyst      — qualitative data extraction (MODE 1)"
echo "  jtbd-scout        — competitor tier research (MODE 2B)"
echo "  jtbd-copywriter   — landing page section writer (MODE 3)"
echo "  jtbd-scriptwriter — ad script writer (MODE 4)"
