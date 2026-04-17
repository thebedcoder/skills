---
---

# Secrets Management

## Never in code
- No API keys, passwords, tokens, or private keys in source files — ever
- Example config files use placeholders: `API_KEY=your_key_here`
- `.env` files gitignored — commit `.env.example` with placeholder values
- Pre-commit hook to scan for secrets — `git-secrets`, `trufflehog`, or similar

## Environment variables
- All secrets from environment — loaded at startup
- Validate required env vars at startup — fail fast if missing
- Use a library for typed config: `pydantic-settings`, `envalid`, `viper`
- Never log env vars — exclude them from error reports

## Secret storage by environment
- Local dev: `.env` file (gitignored), or secret manager like 1Password CLI
- CI/CD: secrets stored in CI platform (GitHub Actions, GitLab, CircleCI encrypted env)
- Production: managed secret store (AWS Secrets Manager, HashiCorp Vault, Doppler, Infisical)
- Never copy production secrets to dev or staging

## Secret rotation
- Rotate on known compromise immediately
- Rotate on schedule for high-value secrets (DB passwords, API keys to paid services)
- Dual-key periods when rotating — deploy new key before removing old
- Audit log of who rotated what and when

## Client vs server
- Never expose server secrets to clients — not even "read-only" keys if they access sensitive data
- Public API keys (e.g., Stripe publishable) OK in client code — intended to be public
- Environment variable naming conventions: `NEXT_PUBLIC_*` for client, everything else server-only
- CORS configured — don't rely on secret-in-URL for anything

## Accidentally committed secrets
- If a secret is committed — rotate it immediately, then remove from history
- Removing from history: `git filter-branch` or BFG Repo-Cleaner — don't assume force-push is enough
- Assume committed secrets are public — scraped within minutes on public repos
- Treat the repo as compromised — audit what access that secret had

## Development practices
- Never share secrets over Slack, email, DMs — use 1Password, Bitwarden, or similar
- Dev uses separate credentials from production — never share
- SSH keys: per-person, never shared — no shared service accounts with shared keys
- GPG for signing commits where required — stored in hardware key if possible

## Logging and error reporting
- Structured logging filters secrets — never `logger.info(request.headers)` blindly
- Error reporting (Sentry, Rollbar) — configure PII and secret scrubbing
- Database connection strings never logged — not even in "debug" level
- API responses logged only after scrubbing — `Authorization` header in particular
