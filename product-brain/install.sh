#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Product Brain..."

mkdir -p ~/.claude/skills ~/.claude/commands

echo "  - Copying skill to ~/.claude/skills/product-brain/"
rm -rf ~/.claude/skills/product-brain
cp -r "$SCRIPT_DIR/skills/product-brain" ~/.claude/skills/

echo "  - Copying slash command stubs to ~/.claude/commands/"
cp "$SCRIPT_DIR/commands/"pb-*.md ~/.claude/commands/

if command -v pip >/dev/null 2>&1; then
  echo "  - Installing Python package (pip install -e .[all])"
  echo "    (use [anthropic] or [openai] alone if you only need one provider)"
  pip install -e "$SCRIPT_DIR[all]" >/dev/null
else
  echo "  - pip not found; skipping Python package install."
  echo "    Install manually: pip install -e $SCRIPT_DIR[anthropic]   # or [openai] or [all]"
fi

echo
echo "Done. Next steps:"
echo "  1. Create config.yaml from config.example.yaml"
echo "  2. Create .env from .env.example and fill in API keys"
echo "  3. Add .product-brain/manifest.md to each indexed repo"
echo "  4. Run: product-brain backfill --repo <name>"
echo
echo "See README.md for the full guide."
