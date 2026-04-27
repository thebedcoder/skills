# Binding source repos

Product Brain lives in **one central repo** (e.g. `company-product-brain/`). Source repos are bound to it but never modified. This page covers the bind workflow, layout, and operational notes.

## Brain repo layout

```
company-product-brain/
├── README.md
├── config.yaml             orchestrator config
├── .gitignore              excludes audit/queue sqlite
├── repos/
│   ├── flutter/
│   │   ├── manifest.md
│   │   └── tickets/
│   │       └── AHA-NNNN.md
│   ├── react/
│   └── backend/
├── audit.sqlite            (gitignored) bot audit log
└── queue.sqlite            (gitignored) bot job queue
```

The brain repo IS where you run `product-brain` commands from. CLI uses `cwd` to find `config.yaml` unless `--config <path>` is passed.

## Bootstrap a new brain repo

```bash
mkdir company-product-brain && cd company-product-brain
product-brain init
```

Creates `config.yaml`, `repos/`, `.gitignore`, `README.md`, and `git init`s the directory. Edit `config.yaml` for your PM tool and (optionally) test adapter credentials.

## Bind a source repo

```bash
product-brain bind ../flutter-app --name flutter
```

What happens:
1. Detects languages, entry points, workflow, ignore paths from the source repo via `git ls-files` and pattern checks.
2. Writes `repos/flutter/manifest.md` into the brain.
3. Appends `{name: flutter, path: ../flutter-app}` to `config.yaml` (relative path resolved against the brain repo).
4. (If `ANTHROPIC_API_KEY` set) LLM-generates manifest prose from the source repo's `README.md`, package files, `CLAUDE.md`, etc.

Source repo is **not** modified.

Flags:
- `--name <name>` — short name for the repo (must match `repos[]` entry in config). Defaults to source dir name.
- `--ticket-regex <regex>` — override the global ticket regex per-repo.
- `--no-llm` — skip prose generation; leave placeholders for hand-authoring.
- `--force` — overwrite an existing manifest in the brain.

## Backfill a bound repo

```bash
product-brain backfill --repo flutter
```

Walks the source repo's `git log --all`, extracts ticket IDs, fetches PR data, writes records to `repos/flutter/tickets/` in the brain. Idempotent. Commit the brain repo to persist.

## Wire incremental updates

The brain stays current via a webhook from each source repo:

### Bot webhook (recommended)

In each source repo, install a post-merge hook:

```bash
cd ../backend
/path/to/product-brain/scripts/install-post-merge-hook.sh \
  backend https://brain-bot.example.com/webhook/source-merge
```

The hook is small (~20 lines): on every merge to `main`, it POSTs `{repo, head_sha, since_sha}` to the bot. Source repo only carries this hook file under `.git/hooks/post-merge` — nothing committed.

The bot:
1. Validates HMAC signature (if `PRODUCT_BRAIN_SOURCE_MERGE_SECRET` is set).
2. Queues a `source-merge` job for that repo.
3. Worker pulls the source repo (already cloned on bot host), runs incremental backfill, writes records into `repos/<name>/`, then `git commit && git push` the brain repo.
4. Rebases on push conflicts; retries up to 3 times.

### GitHub Actions

For squash-merges via the GitHub UI (where local hooks don't fire), use the workflow at `scripts/github-action.yml`:

```bash
cp /path/to/product-brain/scripts/github-action.yml \
   ../backend/.github/workflows/product-brain.yml
```

Set the source repo's secrets:
- `PRODUCT_BRAIN_WEBHOOK` — the bot's webhook URL
- `PRODUCT_BRAIN_SOURCE_MERGE_SECRET` — HMAC secret (optional)

This is the only file added to the source repo. No other pollution.

## Migrate from the legacy in-repo layout

If you previously ran the embedded version (`.product-brain/` inside source repos):

```bash
product-brain migrate --repo backend
product-brain migrate --repo backend --remove-from-source
```

Copies records from `<source>/.product-brain/` into `repos/backend/` in the brain. Optionally deletes from source after copy.

## Operational notes

### Where does the bot run?

The bot host needs:
- The brain repo cloned (writable, with push credentials)
- All source repos cloned (read-only)
- LLM API key, Aha API key, GitHub token

Bot incremental jobs `git pull` source repos at job start, so a stale clone catches up automatically as long as the source repo is fetchable from the bot host.

### Race handling

Three source repos merging simultaneously all queue source-merge jobs. Worker is single-threaded by default — jobs serialize. Each job:
- claims via SQLite queue (atomic)
- writes to `repos/<name>/...` in brain
- `git pull --rebase && git push` (retries on conflict)

If you scale to multiple workers, add a coarse brain-write lock; default single-worker is fine for ≲100 jobs/day.

### Where do PMs/engineers grep the index?

The brain repo. From the brain repo dir:

```bash
grep -l "auth/login.py" repos/*/tickets/*.md
cat repos/backend/tickets/AHA-1234.md
```

Or via slash commands inside Claude Code, which already know to read from `config.brain_root`. Engineers don't need the source repo to query the index.

### What if I want to add a 4th repo later?

```bash
cd company-product-brain
product-brain bind ../mobile-android --name android
product-brain backfill --repo android
git add . && git commit -m "bind: android"
```

Then install the hook in `mobile-android/`. Existing repos and records are unaffected.

## Tradeoff with the legacy "in-repo" layout

| Aspect | Central brain | Embedded `.product-brain/` |
|---|---|---|
| Source repo pollution | none | one directory + post-merge hook |
| Cross-repo joins | trivial (same tree) | needs walking N paths |
| Engineer can grep without leaving source | no | yes |
| Reviewers can sanity-check records inline w/ feature PR | no | yes |
| Adoption friction | low (no source-repo PR) | medium (each team approves the directory) |
| Centralized audit/access | yes | distributed |
| Multi-team / multi-repo at scale | strong | weak |

For 3+ sub-products with central PM, the central layout wins on every dimension that matters at scale. The embedded layout is fine for monorepos or single-team setups.
