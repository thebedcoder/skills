#!/usr/bin/env bash
# Installs a post-merge hook that updates product-brain index after each merge to main.
# Run from inside the target repo:
#     /path/to/product-brain/scripts/install-post-merge-hook.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "error: not inside a git repo" >&2
  exit 1
fi

HOOK="$REPO_ROOT/.git/hooks/post-merge"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Auto-installed by product-brain.
# Updates the .product-brain/ index for tickets in the freshly-merged commits.
set -e

if ! command -v product-brain >/dev/null 2>&1; then
  exit 0
fi

# Only act on main / master
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
case "$BRANCH" in
  main|master) ;;
  *) exit 0 ;;
esac

product-brain incremental --repo "$(pwd)" || true
EOF

chmod +x "$HOOK"
echo "Installed post-merge hook at $HOOK"
