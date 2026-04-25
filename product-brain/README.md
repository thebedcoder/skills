# Product Brain

> A central memory + planning layer that ties project-management tickets to real shipped code across all your product repos, so feature planning, grooming, and estimation are grounded in what was actually built — not just what the spec said.

Product Brain lives in **one central repo** that bind one or more source repos. It reads each source repo's `git log` (where every commit references a ticket ID), enriches with PR review threads, and emits one markdown record per ticket per repo — all stored in the central brain. **Source repos are never modified.** A skill, a CLI, and a headless bot consume that index to answer questions like:

- "Groom AHA-1234 — what's the scope across our 3 sub-products, what edges did we hit on similar work, and how long should it take?"
- "Plan 'password reset' — predict touched areas, find related shipped tickets, draft sub-tickets."
- "Show me everything we've shipped that touched the auth flow."

The PM tool is pluggable. Aha is the reference adapter; the abstract `PMAdapter` interface lets you swap Linear, Jira, or anything with tickets and comments.

---

## Why this exists

Product managers plan against docs. Engineers build against code. The two drift apart: the spec says "we have 2FA," the code says "we have 2FA, but only TOTP, with these three known edge cases that bit us last quarter." When a PM grooms a related feature, they need the second view, not the first.

Product Brain produces that second view automatically by mining `git log + PR history`, with **citation discipline** — every edge case in a record cites a real PR comment, test name, or commit SHA, validated at write time. Hallucinated bullets get dropped, not shipped.

---

## What you get

| Component | What it does |
|---|---|
| **Central brain repo** | One repo (e.g. `company-product-brain/`) holds `repos/<name>/{manifest.md, tickets/AHA-XXXX.md}` for every bound source repo. Source repos stay untouched. |
| **Backfill CLI** | One-shot rebuild from each source repo's `git log --all`. Idempotent. |
| **Incremental hook** | Post-merge hook (or GitHub Action) in each source repo notifies the bot, which updates one record per merge. ~1 small LLM call. |
| **Repair job** | Nightly: validates citations, flags stale gaps, reconciles renames. |
| **Slash commands** | `/pb-groom`, `/pb-plan`, `/pb-edges`, `/pb-related`, `/pb-draft-tickets`, `/pb-sync` — used inside Claude Code by engineers. |
| **Headless bot** | Webhook + worker. PM types `/brain groom` in an Aha comment; bot replies with scoped plan, estimate (with references), edge cases, and draft sub-tickets. Edits in place, never spams. |
| **PM adapter interface** | Abstract base class. Aha implementation included. Swap for Linear/Jira/etc. |
| **Test-management adapter (optional)** | TestRail integration adds `qa_edges`, `stability_signals`, and `coverage_gaps` to records. Pluggable for Zephyr/Xray/qTest. |
| **Pluggable LLM backend** | Anthropic, OpenAI, Azure OpenAI, or any OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, OpenRouter, Groq, ...). Config-only switch. Engineer-side AI tools (Claude Code, Copilot Chat, Codex, Cursor) integrate via the universal CLI. See [docs/integrations.md](docs/integrations.md). |

---

## How it works

Three phases. Data flows in continuously as engineers merge code; the index sits in each repo; data flows out on demand when a PM (or engineer) asks for a plan.

```
┌────────────── 1. DEVELOPMENT (continuous, source repos) ─────────────┐
│                                                                       │
│   engineer commits "AHA-1234: add 2FA" → PR → review → merge to main │
│                              │                                        │
│       Source repos:          ▼                                        │
│       flutter-app   ┌────────────────────────────┐                   │
│       react-app  ───┤ post-merge hook            │                   │
│       backend       │   OR GitHub Action         │                   │
│                     └────────────┬───────────────┘                   │
│                                  │ POST {repo, head_sha}             │
│                                  ▼                                    │
│                         brain-bot /webhook/source-merge               │
│                                  │                                    │
│                                  ▼                                    │
│                         ┌──────────────────┐                          │
│                         │ queue (SQLite)   │                          │
│                         └────────┬─────────┘                          │
│                                  ▼                                    │
│                    ┌─────────────────────────────┐                    │
│                    │ worker                       │                   │
│                    │  • git pull source repo      │                   │
│                    │  • run incremental backfill  │                   │
│                    │  • commit + push brain repo  │                   │
│                    └──────────────┬──────────────┘                    │
└───────────────────────────────────┼───────────────────────────────────┘
                                    │ writes one record
                                    ▼
┌──────────── 2. CENTRAL BRAIN REPO (one per company) ─────────────────┐
│                                                                       │
│  company-product-brain/                                               │
│  ├── config.yaml                  bound source repos + adapters       │
│  ├── repos/                                                           │
│  │   ├── flutter/                                                     │
│  │   │   ├── manifest.md                                              │
│  │   │   └── tickets/AHA-1100.md, AHA-1234.md, AHA-1500.md            │
│  │   ├── react/                                                       │
│  │   │   ├── manifest.md                                              │
│  │   │   └── tickets/AHA-1234.md, AHA-1500.md                         │
│  │   └── backend/                                                     │
│  │       ├── manifest.md                                              │
│  │       └── tickets/AHA-1100.md, AHA-1234.md, AHA-1500.md            │
│  ├── audit.sqlite                                                     │
│  └── queue.sqlite                                                     │
│                                                                       │
│  each record =  YAML front-matter (mechanical: files, SHAs, dates)    │
│              +  prose (LLM-generated, citation-validated)             │
│                                                                       │
│  Source repos NEVER modified.                                         │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ reads on demand
                               ▼
┌──────────────── 3. PLANNING (per query) ─────────────────────────────┐
│                                                                       │
│   PM types  "/brain groom"  in Aha comment on AHA-1500               │
│                  │                                                    │
│                  ▼                                                    │
│       Aha webhook ──► bot /webhook/aha (verify signature)            │
│                  │                                                    │
│                  ▼                                                    │
│            ┌───────────┐                                              │
│            │  queue    │ (SQLite, per-ticket lock)                    │
│            └─────┬─────┘                                              │
│                  ▼                                                    │
│   ┌─────────────────────────────────────────────────────┐            │
│   │ worker                                               │            │
│   │  1. fetch ticket + siblings + label matches (Aha)    │            │
│   │  2. read records for those IDs across repos/         │            │
│   │  3. hotspot-cluster        (deterministic + 1 LLM)   │            │
│   │  4. estimate w/ refs       (similarity + churn)      │            │
│   │  5. dedup edge cases       (1 LLM across records)    │            │
│   │  6. render groom output                              │            │
│   └────────────────────────┬────────────────────────────┘            │
│                            ▼                                          │
│           bot posts/edits Aha comment (in place)                      │
│                            ▼                                          │
│      PM sees: scope · estimate · edges · risks · drafts               │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

Engineers also reach the planning phase via slash commands inside Claude Code (`/pb-groom AHA-1500`), which run the same building blocks and skip the bot. Same logic, two front doors.

---

## Architecture at a glance

```
                   ┌──────────────────────────────────────────┐
                   │             PM tool (Aha)                │
                   │   tickets · comments · webhooks          │
                   └───────────────┬──────────────────────────┘
                                   │ PMAdapter (abstract)
                                   ▼
   ┌────────────────────────────────────────────────────────────────┐
   │                       product-brain                             │
   │                                                                 │
   │  ┌──────────┐   ┌──────────────┐   ┌─────────────┐              │
   │  │ backfill │──▶│  index       │──▶│  blocks      │             │
   │  │ git+PR+  │   │  read/write  │   │  hotspot     │             │
   │  │ summary  │   │  rename track│   │  estimate    │             │
   │  └──────────┘   └──────────────┘   │  edge_mine   │             │
   │                                    │  render      │             │
   │  ┌──────────┐   ┌──────────────┐   └──────┬──────┘              │
   │  │ incr.    │   │ repair       │          │                      │
   │  │ (hook)   │   │ (nightly)    │          ▼                      │
   │  └──────────┘   └──────────────┘   ┌──────────────┐              │
   │                                    │ slash cmds   │              │
   │                                    │ + headless   │              │
   │                                    │ bot          │              │
   │                                    └──────────────┘              │
   └────────────────────────────────────────────────────────────────┘
              │                                     │
              ▼                                     ▼
   ┌────────────────────────┐         ┌──────────────────────────┐
   │  .product-brain/       │         │  Aha comment thread       │
   │  tickets/AHA-1234.md   │         │  🧠 product-brain · groom │
   │  (one per repo)        │         │  scope · estimate · edges │
   └────────────────────────┘         └──────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for detail.

---

## Quick start

For the full click-by-click (Aha API key, TestRail token, GitHub token, bot host setup, smoke test, troubleshooting), see **[docs/setup.md](docs/setup.md)**.

What follows is the condensed overview.

### 1. Install the tool

```bash
git clone <this-repo>
cd product-brain
./install.sh
```

The installer:
- copies the skill to `~/.claude/skills/product-brain/`
- copies slash command stubs to `~/.claude/commands/`
- installs the Python package into the active environment (`pip install -e .`)

### 2. Create the central brain repo

In a sibling directory to your source repos:

```bash
mkdir company-product-brain && cd company-product-brain
product-brain init
```

This creates `config.yaml`, `repos/`, `.gitignore`, `README.md`, and `git init`s the directory. Edit `config.yaml` to fill in your Aha (or other PM tool) credentials.

### 3. Bind source repos

For each source repo you want indexed:

```bash
product-brain bind ../flutter-app --name flutter
product-brain bind ../react-app   --name react
product-brain bind ../backend     --name backend
```

Each `bind` call:
- detects languages, entry points, workflow from the source repo
- writes `repos/<name>/manifest.md` into the brain
- appends `{name, path}` to `config.yaml`
- (with `ANTHROPIC_API_KEY`) generates manifest prose from the source repo's README + package files

Source repos are not modified. Use `--no-llm` to skip prose; `--force` to overwrite.

For repos with hand-authored conventions, you can still use the manifest template at `skills/product-brain/templates/manifest.md`:

```yaml
---
repo: backend
ticket_regex: 'AHA-\d+'
workflow: squash               # squash | merge | rebase
languages: [python]
entry_points:
  - api/main.py
  - services/email/__init__.py
owners_file: CODEOWNERS
ignore_paths:
  - vendor/
  - generated/
mega_file_threshold: 0.95      # exclude files in top 5% churn percentile from clusters
---

## What this repo is
One paragraph describing the repo's purpose for the planning agent.

## Conventions worth knowing
Anything an engineer joining the team would want to know.
```

See [docs/manifest-schema.md](docs/manifest-schema.md) for the full schema and [docs/binding.md](docs/binding.md) for the bind workflow.

### 4. Backfill

From the brain repo directory:

```bash
product-brain backfill --repo backend
product-brain backfill                    # all bound repos
```

Walks each source repo's `git log --all`, extracts ticket IDs, enriches with PR data, writes records into `repos/backend/tickets/` inside the brain. Commit the brain repo when done.

Cost: with Haiku, ~$0.005/ticket × N tickets. 5-year repo with 500 tickets ≈ $2.50 and ~10 minutes.

### 5. Wire incremental updates

Two ways to keep the brain current after merges:

**Bot webhook (recommended)** — install a post-merge hook in each source repo that POSTs the bot. Bot pulls source, runs incremental, commits and pushes the brain repo:

```bash
cd ../backend
/path/to/product-brain/scripts/install-post-merge-hook.sh \
  backend https://brain-bot.example.com/webhook/source-merge
```

**GitHub Actions** — drop `scripts/github-action.yml` into each source repo's `.github/workflows/`. Same flow, runs in CI on every push to main.

Either way, source repos never get a `.product-brain/` directory — only a small hook or workflow file that fires a webhook.

### 6. Use it

**As an engineer in Claude Code:**

```
/pb-groom AHA-1234
/pb-plan password reset for the auth area
/pb-related AHA-1234
```

**As a PM in Aha** (after enabling the bot — see [docs/bot.md](docs/bot.md)):

Comment on any ticket with the opt-in label `brain:on`:

```
/brain groom
/brain estimate
/brain draft-tickets
```

The bot replies with a structured comment, edits in place on re-runs, and creates draft sub-tickets when asked.

---

## Documentation map

| File | Topic |
|---|---|
| [docs/setup.md](docs/setup.md) | Click-by-click setup (Aha, TestRail, GitHub, brain repo, bot, hooks, smoke test, troubleshooting) |
| [docs/integrations.md](docs/integrations.md) | LLM providers (Anthropic / OpenAI / Azure / local) + engineer-side AI tools (Claude Code / Copilot Chat / Codex / Cursor) |
| [docs/architecture.md](docs/architecture.md) | System architecture, building blocks, data flow |
| [docs/manifest-schema.md](docs/manifest-schema.md) | manifest and ticket-record schemas |
| [docs/binding.md](docs/binding.md) | brain repo layout, binding source repos, hook setup |
| [docs/backfill.md](docs/backfill.md) | Backfill algorithm, phases, failure modes |
| [docs/edge-case-mining.md](docs/edge-case-mining.md) | Where edge cases come from, citation discipline |
| [docs/pm-adapter.md](docs/pm-adapter.md) | Abstract PM adapter interface; writing a new adapter |
| [docs/test-adapter.md](docs/test-adapter.md) | Optional TestRail integration; QA-verified edges, stability signals, coverage gaps |
| [docs/bot.md](docs/bot.md) | Headless Aha bot setup, triggers, spam prevention |
| [docs/howto-engineer.md](docs/howto-engineer.md) | Engineer workflow: picking up a ticket, using slash commands |
| [docs/howto-pm.md](docs/howto-pm.md) | PM workflow: grooming, drafting, estimating |
| [docs/build-order.md](docs/build-order.md) | Suggested rollout order if adopting incrementally |

---

## Project layout

```
product-brain/
├── README.md                       (this file)
├── install.sh                      installs skill + CLI
├── config.example.yaml             orchestrator config template
├── .env.example                    secrets template
├── pyproject.toml                  Python package
│
├── commands/                       slash-command stubs (deployed to ~/.claude/commands/)
│   ├── pb-groom.md
│   ├── pb-plan.md
│   ├── pb-edges.md
│   ├── pb-related.md
│   ├── pb-draft-tickets.md
│   └── pb-sync.md
│
├── skills/product-brain/           the skill itself (deployed to ~/.claude/skills/)
│   ├── SKILL.md                    auto-trigger description
│   ├── commands/                   command bodies (one per slash command)
│   ├── templates/                  output templates
│   └── schemas/                    JSON schemas for records and config
│
├── docs/                           full documentation
│
├── src/product_brain/              Python source
│   ├── cli.py                      entry: `product-brain <subcommand>`
│   ├── config.py                   config loader
│   ├── models.py                   dataclasses
│   ├── adapters/                   PM adapter base + Aha
│   ├── index/                      read/write/rename-track ticket records
│   ├── blocks/                     hotspot, estimate, edge_mine, render
│   ├── backfill/                   git log → records pipeline
│   ├── incremental.py              post-merge hook target
│   ├── repair.py                   nightly validator
│   └── bot/                        webhook, worker, queue, comment, audit
│
└── scripts/                        shell wrappers + hook installer
```

---

## Costs and operational notes

| Action | Cost (Haiku) | Cost (Sonnet) |
|---|---|---|
| Backfill, per ticket | ~$0.005 | ~$0.05 |
| Incremental, per merge | ~$0.005 | ~$0.05 |
| `/pb-groom` (interactive) | ~$0.02–0.05 | ~$0.20–0.50 |
| Bot `/brain groom` (headless) | same as `/pb-groom` | same |

Use Haiku for backfill and incremental (mechanical summarization). Sonnet for interactive grooming if quality matters more than cost.

---

## Status and roadmap

This is v1. See [docs/build-order.md](docs/build-order.md) for what was built first and what's planned next. Highlights:

- v1: Aha adapter, backfill, slash commands, basic bot (manual triggers only).
- v1.1: Status-change auto-triggers behind opt-in label.
- v1.2: Linear adapter (drop-in via `PMAdapter`).
- v2: Cross-repo aggregated records, semantic search index (only if MD-grep stops scaling).

---

## License

MIT.
