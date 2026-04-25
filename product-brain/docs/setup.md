# Setup walkthrough

End-to-end setup, click-by-click. Time: ~30 min if you have credentials ready.

## 0. Prerequisites

- Python 3.10+, `pip`, `git`
- An Aha workspace where you have admin access (or someone who does)
- TestRail (optional, but unlocks QA-edges / stability / coverage-gaps)
- A host where the bot can run and listen on a public HTTPS URL (Fly.io, Railway, internal VM behind reverse proxy, etc.)

## 1. Install the tool

```bash
git clone <this-repo> ~/tools/product-brain
cd ~/tools/product-brain
./install.sh
```

The installer:
- copies the skill to `~/.claude/skills/product-brain/`
- copies slash command stubs to `~/.claude/commands/`
- runs `pip install -e .[all]` (installs both anthropic and openai SDKs)

Skill + slash commands are Claude-Code-specific bonuses. The CLI works for any AI tool — see [integrations.md](integrations.md) for Copilot Chat, Codex, Cursor, and other patterns.

Verify:
```bash
product-brain --version
```

## 2. Aha credentials

### 2a. Generate API key

1. Go to **Settings → Personal → API keys**
   (URL: `https://<subdomain>.aha.io/settings/api_keys`)
2. **Generate new API key**, name it `product-brain-bot`
3. Copy the key value. You'll paste it into `.env` later.

### 2b. Create webhook (for the bot)

1. Go to **Settings → Account → Integrations → Webhooks**
2. **Add webhook**
   - URL: `https://<your-bot-host>/webhook/aha` (placeholder for now; update after step 8)
   - Events: check **comment.create**, **comment.update**, **feature.update**
   - Generate a signing secret. Copy it for `.env`.
3. Save. (Aha will start sending events; the bot will 401 them until secrets match.)

### 2c. Create custom workflow status

For `/brain draft-tickets` to land safely:
1. **Settings → Workspace → Workflows**
2. Pick the workflow used by features
3. Add status **"Bot-draft"** (or whatever name you'll set in `bot.draft_status`)

### 2d. Create labels

1. **Settings → Workspace → Tags**
2. Create `brain:on` (opt-in for auto-triggers)
3. Create `brain:off` (kill switch)

### 2e. Note allowed users

List the email addresses of PMs/leads who should be able to issue `/brain` commands. Goes into `config.bot.allowed_users` later.

## 3. TestRail (optional)

Skip this section if you don't have TestRail. The system runs fine without it — only `qa_edges`, `stability_signals`, and `coverage_gaps` are unavailable.

### 3a. Generate API key

1. **My Settings → API Keys** in TestRail
2. Click **Add Key**, name it `product-brain`
3. Copy the value. Paste into `.env` later as `TESTRAIL_API_KEY`.

### 3b. Find your project ID

1. Open the project in TestRail
2. URL contains `/index.php?/projects/overview/<NUMBER>` — the number is `project_id`

### 3c. Confirm `refs` field

The default `refs_field: refs` is the standard TestRail "References" field on cases. To verify:
1. Open any test case
2. Look for a "References" field — should accept comma-separated values like `AHA-1100, AHA-1300`

If your team uses a different custom field, note its API name (something like `custom_jira_id`) and override `testrail.refs_field` in config.

### 3d. Confirm linkage hygiene

Sample 10 random cases linked to recent tickets. If <50% of cases have `refs` populated, expect sparse `qa_edges` until linkage improves. The system falls back to file-area search but loses precision.

## 4. GitHub token

For PR enrichment:
1. **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Generate token, name it `product-brain`
3. Scope: read access to all source repos you'll bind
4. Copy. Paste into `.env` as `GITHUB_TOKEN`.

## 5. Bootstrap the brain repo

```bash
mkdir ~/projects/company-product-brain
cd ~/projects/company-product-brain
product-brain init
```

This creates:
- `config.yaml` (from template)
- `repos/`
- `.gitignore`
- `README.md`
- `.git/` (auto `git init`)

Now edit `config.yaml`:

```yaml
ticket_regex: 'AHA-\d+'
pm_adapter: aha
test_adapter: testrail              # or null if skipping
aha:
  subdomain: yourcompany
  api_key_env: AHA_API_KEY
testrail:
  base_url: https://yourco.testrail.io
  user_email: bot@yourcompany.com
  api_key_env: TESTRAIL_API_KEY
  project_id: 7
  refs_field: refs
  run_history_window_days: 90
github:
  api_key_env: GITHUB_TOKEN
llm:
  provider: anthropic
  api_key_env: ANTHROPIC_API_KEY
  model_summarize:  claude-haiku-4-5-20251001
  model_extract:    claude-haiku-4-5-20251001
  model_synthesize: claude-sonnet-4-6
estimate:
  unit: days
  reference_window_days: 90
  min_similarity: 0.4
backfill:
  workflow: squash                  # or merge | rebase
  pr_enrichment: true
bot:
  enabled: false                    # flip after step 8
  host: 0.0.0.0
  port: 8088
  webhook_signing_secret_env: AHA_WEBHOOK_SECRET
  allowed_users: [pm1@example.com, lead@example.com]
  cooldown_hours: 24
  opt_in_label: brain:on
  kill_switch_label: brain:off
  quiet_hours_utc: [22, 7]
  draft_status: Bot-draft
audit: { path: ./audit.sqlite }
queue: { backend: sqlite, path: ./queue.sqlite }
```

Create `.env` from the template and fill in the secrets you collected:

```bash
cp ~/tools/product-brain/.env.example .env
# edit:
ANTHROPIC_API_KEY=sk-ant-...
AHA_API_KEY=<from step 2a>
AHA_WEBHOOK_SECRET=<from step 2b>
GITHUB_TOKEN=<from step 4>
TESTRAIL_API_KEY=<from step 3a, optional>
PRODUCT_BRAIN_SOURCE_MERGE_SECRET=$(openssl rand -hex 32)
```

Load the env:

```bash
set -a; source .env; set +a
```

## 6. Bind source repos

For each source repo:

```bash
product-brain bind ../flutter-app --name flutter
product-brain bind ../react-app   --name react
product-brain bind ../backend     --name backend
```

Each call:
1. Detects languages, entry points, workflow
2. Writes `repos/<name>/manifest.md`
3. Appends `{name, path}` to `config.yaml`
4. (If `ANTHROPIC_API_KEY` set) LLM-summarizes the source repo's README + package files into the manifest prose body

Sanity-check one manifest:
```bash
cat repos/backend/manifest.md
```

Tweak `entry_points`, `ignore_paths`, prose if needed.

## 7. First backfill

```bash
product-brain backfill --repo backend
```

Watch for the summary line:
```
{"repo": "backend", "written": 0, "created": 312, "bullets_dropped": 4, "head": "abc123..."}
```

`created` should match roughly the number of unique tickets referenced in your `git log`. If `bullets_dropped` is high (>10% of expected bullets), check the audit log — the prompt may need tuning, or your PR review culture is sparse.

Repeat for each repo:

```bash
product-brain backfill --repo react
product-brain backfill --repo flutter
```

Or all at once:

```bash
product-brain backfill
```

Commit the brain repo:

```bash
git add . && git commit -m "initial backfill"
git remote add origin git@github.com:yourorg/company-product-brain.git
git push -u origin main
```

Cost: with Haiku, ≈$0.005/ticket. 500 tickets × 3 repos ≈ $7.50.

## 8. Start the bot

On your bot host:

```bash
git clone git@github.com:yourorg/company-product-brain.git
cd company-product-brain
# load .env (with the SAME PRODUCT_BRAIN_SOURCE_MERGE_SECRET you used in step 5)

product-brain bot serve &        # webhook server
product-brain bot worker &       # job worker
```

Behind a reverse proxy (nginx/Caddy/Cloudflare Tunnel) so the bot is reachable at HTTPS.

Update the Aha webhook URL (step 2b) to point at your real `https://<bot-host>/webhook/aha`.

Set `bot.enabled: true` in `config.yaml`, restart the worker.

Test:
```bash
product-brain bot status         # queue depth
product-brain bot tail-audit     # follow audit
```

## 9. Wire incremental hooks

For each source repo, install the post-merge hook OR the GitHub Action.

### 9a. Local post-merge hook (fires on local merges)

```bash
cd ../backend
~/tools/product-brain/scripts/install-post-merge-hook.sh \
  backend https://<bot-host>/webhook/source-merge

# expose the secret to git's hook environment
echo 'export PRODUCT_BRAIN_SOURCE_MERGE_SECRET="<value>"' >> ~/.zshrc
```

Repeat for `flutter-app`, `react-app`.

### 9b. GitHub Action (fires on UI squash-merges)

```bash
cp ~/tools/product-brain/scripts/github-action.yml \
   ../backend/.github/workflows/product-brain.yml
cd ../backend
git add .github/workflows/product-brain.yml
git commit -m "ci: add product-brain notify"
git push
```

In the source repo's GitHub settings:
- **Settings → Secrets → Actions**
- Add `PRODUCT_BRAIN_WEBHOOK` (the bot URL)
- Add `PRODUCT_BRAIN_SOURCE_MERGE_SECRET` (same value as in your bot `.env`)

Repeat for each source repo.

You generally want **both** — local hook for fast feedback during dev merges, Action as the safety net for UI squash-merges.

## 10. Smoke test

Pick a recently-shipped feature (a real Aha ticket).

### 10a. Verify backfill captured it

```bash
ls repos/*/tickets/AHA-<id>.md
cat repos/backend/tickets/AHA-<id>.md
```

You should see front-matter with files/SHAs/dates and prose with citations.

### 10b. Verify the bot

In Aha, open the ticket. Add the label `brain:on`. Comment:

```
/brain related
```

Within ~30s the bot should reply with a related-tickets table and "Highlights" sections. If nothing happens within 60s, check:

```bash
product-brain bot tail-audit
product-brain bot status         # queue depth — pending should be 0
```

If the bot returns empty/error, common issues:
- HMAC mismatch (Aha webhook secret ≠ `AHA_WEBHOOK_SECRET`)
- Bot can't reach Aha API (`AHA_API_KEY` invalid or host firewalled)
- `allowed_users` doesn't include the comment author's email

### 10c. Verify the incremental hook

Make a tiny commit on a source repo's main branch (locally):

```bash
cd ../backend
echo "" >> README.md
git commit -am "AHA-<id>: smoke test"
git push
```

Within 30s:
- `product-brain bot tail-audit` shows a `source-merge` event
- The brain repo gets a new commit pushed (check `git log`)
- The corresponding ticket record reflects the new SHA

### 10d. Verify TestRail (if configured)

Pick a ticket with linked test cases:

```bash
cat repos/backend/tickets/AHA-<id>.md
```

You should see `test_cases:` populated in front-matter and a `## QA-verified edges` section.

## 11. Daily operations

| Task | Command |
|---|---|
| Watch bot queue | `product-brain bot status` |
| Tail audit log | `product-brain bot tail-audit --limit 100` |
| Manual sync after CI failure | `product-brain sync --repo backend --since <sha>` |
| Force full rebuild of one repo | `product-brain backfill --repo backend --force` |
| Nightly repair (cron) | `product-brain repair` |
| Rebuild front-matter only (free) | `product-brain backfill --repo backend --no-llm --force` |

## 12. Rollout recommendation

Don't enable everything on day 1.

1. **Week 1**: bot disabled. Engineers use `/pb-related` and `/pb-groom` in Claude Code only. Build trust in the index.
2. **Week 2**: enable bot, manual `/brain` commands only. PMs opt in via `brain:on` per ticket.
3. **Month 2**: turn on status-change auto-triggers behind `opt_in_label`.
4. **Month 3**: add nightly repair cron, scale workers if needed.

See [build-order.md](build-order.md) for the full incremental rollout.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Bot replies "ignored: no /brain command" | Comment didn't match parser | Use exact `/brain <cmd>` at line start |
| Bot replies 401 | HMAC mismatch | Re-check `AHA_WEBHOOK_SECRET` matches Aha webhook config |
| Bot returns "ignored: author not allowed" | Author not in `allowed_users` | Add their Aha email to config |
| Backfill produces 0 records | `ticket_regex` doesn't match commits, or `workflow` setting wrong | `git log --oneline | head` and verify; flip `workflow: squash↔merge` |
| Many `bullets_dropped` | Sparse PR review culture, or vague test names | Expected. Quality of mining tracks team's review hygiene. |
| `qa_edges` empty | TestRail cases not linked via `refs` | Spot-check: `gh api ...` or just look in TestRail. Improve linkage or accept fall-back. |
| Source-merge webhook not firing | Hook didn't install, or `PRODUCT_BRAIN_SOURCE_MERGE_SECRET` not in env | `cat .git/hooks/post-merge` to verify; re-install with `install-post-merge-hook.sh` |
| Brain repo push fails (rejected) | Concurrent merges raced | Worker rebases automatically; check audit for retry count. If consistently failing, consider single bot worker. |
