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

if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node --version | sed 's/^v//' | awk -F. '{print $1}')"
  if [ "$NODE_VERSION" -lt 20 ]; then
    echo "  - Warning: Node $(node --version) detected; v20.18+ required."
  fi
else
  echo "  - Warning: node not found. Install Node.js >= 20.18 before running the CLI."
fi

if command -v npm >/dev/null 2>&1; then
  echo "  - Installing dependencies (npm install)"
  (cd "$SCRIPT_DIR" && npm install >/dev/null 2>&1)
  echo "  - Building bundle (npm run build:bundle)"
  (cd "$SCRIPT_DIR" && npm run build:bundle >/dev/null 2>&1)
else
  echo "  - npm not found; skipping dependency install + bundle build."
  echo "    Install Node.js >= 20.18, then run: cd $SCRIPT_DIR && npm install && npm run build:bundle"
fi

echo
echo "Done. Next steps:"
echo "  1. Bootstrap a brain repo:    cd ~/work/my-brain && npx tsx $SCRIPT_DIR/src/cli.ts init"
echo "  2. Edit config.yaml + .env"
echo "  3. Bind a source repo:        npx tsx $SCRIPT_DIR/src/cli.ts bind ../some-repo --name myrepo"
echo "  4. Backfill:                  npx tsx $SCRIPT_DIR/src/cli.ts backfill --repo myrepo"
echo
echo "Or build a single-file CLI for daily use:"
echo "  cd $SCRIPT_DIR/dist && npm install --production && npm link"
echo "  # \`product-brain\` is now on PATH"
echo
echo "See README.md for the full guide."
