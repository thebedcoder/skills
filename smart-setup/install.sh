#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🧰 Installing smart-setup..."

mkdir -p ~/.claude/skills
mkdir -p ~/.claude/commands

echo "  → Copying skill..."
rm -rf ~/.claude/skills/smart-setup
cp -r "$SCRIPT_DIR/skills/smart-setup" ~/.claude/skills/

# rules-library single source of truth lives in agentic-engineering (sibling plugin)
RULES_SRC="$SCRIPT_DIR/../agentic-engineering/rules-library"
if [ -d "$RULES_SRC" ]; then
  echo "  → Copying rules-library from sibling plugin..."
  cp -r "$RULES_SRC" ~/.claude/skills/smart-setup/
else
  echo "  ⚠ rules-library not found at $RULES_SRC — stack rule templates unavailable"
fi

# Patch SKILL.md for Claude Code CLI — hide /smart-setup skill from command palette.
# (user-invocable: false is valid in CLI but rejected by claude.ai packager, so added post-install)
SKILL_FILE="$HOME/.claude/skills/smart-setup/SKILL.md"
if ! grep -q "user-invocable" "$SKILL_FILE"; then
  python3 - "$SKILL_FILE" <<'EOF'
import re, sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
# Insert before the closing --- of the YAML frontmatter (the one followed by the H1 heading).
content = re.sub(r'^---\n(?=\s*#)', 'user-invocable: false\n---\n', content, count=1, flags=re.MULTILINE)
with open(path, 'w') as f:
    f.write(content)
EOF
fi

echo "  → Copying command..."
cp "$SCRIPT_DIR/commands/smart-setup.md" ~/.claude/commands/

echo ""
echo "✅ Done. Restart Claude Code to pick up the changes."
echo ""
echo "Usage:"
echo "  /smart-setup           scan/interview → tier → manifest → generate"
echo "  /smart-setup update    re-audit existing setup, propose amendments"
