#!/usr/bin/env bash
# Installs a post-merge hook that notifies the product-brain bot on merges to main.
# The bot pulls source repo, runs incremental, commits/pushes the brain repo.
#
# Run from inside the source repo:
#     /path/to/product-brain/scripts/install-post-merge-hook.sh <repo-name> <bot-webhook-url>
#
# Optional: export PRODUCT_BRAIN_SOURCE_MERGE_SECRET to sign requests.

set -euo pipefail

REPO_NAME="${1:-}"
WEBHOOK_URL="${2:-}"

if [[ -z "$REPO_NAME" || -z "$WEBHOOK_URL" ]]; then
  echo "usage: $0 <repo-name> <bot-webhook-url>" >&2
  echo "  example: $0 backend https://brain-bot.example.com/webhook/source-merge" >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "error: not inside a git repo" >&2
  exit 1
fi

HOOK="$REPO_ROOT/.git/hooks/post-merge"

cat > "$HOOK" <<EOF
#!/usr/bin/env bash
# Auto-installed by product-brain.
# On merge to main, notifies the brain bot to refresh this repo's index.
set -e

BRANCH="\$(git rev-parse --abbrev-ref HEAD)"
case "\$BRANCH" in
  main|master) ;;
  *) exit 0 ;;
esac

REPO_NAME='${REPO_NAME}'
WEBHOOK='${WEBHOOK_URL}'
HEAD_SHA="\$(git rev-parse HEAD)"
SINCE_SHA="\$(git rev-parse HEAD~1 2>/dev/null || true)"

PAYLOAD=\$(printf '{"repo":"%s","head_sha":"%s","since_sha":"%s"}' "\$REPO_NAME" "\$HEAD_SHA" "\$SINCE_SHA")

SIG_HEADER=()
if [[ -n "\${PRODUCT_BRAIN_SOURCE_MERGE_SECRET:-}" ]]; then
  SIG=\$(printf '%s' "\$PAYLOAD" | openssl dgst -sha256 -hmac "\$PRODUCT_BRAIN_SOURCE_MERGE_SECRET" -hex | awk '{print \$2}')
  SIG_HEADER=(-H "X-PB-Signature: \$SIG")
fi

curl -s -m 10 -X POST "\$WEBHOOK" \\
  -H "Content-Type: application/json" \\
  "\${SIG_HEADER[@]}" \\
  -d "\$PAYLOAD" >/dev/null || true
EOF

chmod +x "$HOOK"
echo "Installed post-merge hook at $HOOK"
echo "  repo:    $REPO_NAME"
echo "  webhook: $WEBHOOK_URL"
echo
echo "Optional: export PRODUCT_BRAIN_SOURCE_MERGE_SECRET to sign requests."
echo "Same secret must be set on the bot host."
