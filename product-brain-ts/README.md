# product-brain (TypeScript port)

TypeScript port of the Python implementation in [`../product-brain/`](../product-brain/). Same design, same commands, same brain-repo layout — just a different runtime so the team can own it in their primary stack.

**Status: feature-parity port complete + admin panel + tests.** All 36 ported modules plus a 5-page admin web UI. `tsc --noEmit` clean, `npm audit --omit=dev` clean, `vitest` **176/176 passing** across 22 test files. CLI builds and runs.

## Admin panel

Read-only dashboard + restricted-write settings editor. Same Node runtime, separate `/admin/*` routes; bound to `127.0.0.1` by default so it's not exposed to the public webhook port.

```bash
export ADMIN_PASSWORD='choose-something-strong'
product-brain bot admin                # localhost:8089/admin/
product-brain bot admin --host 0.0.0.0 --port 9000   # bind elsewhere
```

Auth is HTTP Basic; user defaults to `admin`, override via `ADMIN_USER`.

| Page | Path | What it shows |
|---|---|---|
| Dashboard | `/admin/` | Last-30d totals (runs, cost, distinct tickets/users, errors), queue depth, top commands and requesters, daily breakdown |
| Audit log | `/admin/audit` | Filterable list (ticket, command, requester, status, days). Click into any run for full output summary, model, cost, error |
| Repos | `/admin/repos` | Each bound repo: source path, indexed HEAD, ticket-record count, last-sync recency, status badge |
| Queue | `/admin/queue` | Live counts per state, pending+claimed jobs, recent failures with error excerpt |
| Settings | `/admin/settings` | Whitelisted, zod-validated edit form for `bot.*`, `estimate.*`, `llm.model_*`. Writes to `config.yaml`; restart bot to pick up |

**Styling:** self-contained — a hand-rolled ~5KB stylesheet (`src/admin/styles.ts`) is inlined into the page so the admin works in air-gapped, proxy-restricted, or any other no-CDN environment. Adding new layout patterns means appending to `styles.ts`; the templates already use Tailwind-style class names so it scales.

**Screenshots:** see `screenshots/`. Re-render anytime with `npx tsx scripts/screenshots.ts` (uses Playwright to capture each page against a temp brain repo seeded with realistic demo data).

The settings editor is **deliberately narrow** — it cannot touch `pm_adapter`, `repos`, paths, secrets, or anything else that could break the bot or escalate access. For deeper changes, edit `config.yaml` directly.

---

## Why this exists

The original implementation is Python. The owning team is more comfortable in Node/TypeScript. Same data format, same prompts, same workflow — just easier to maintain in-house.

**Existing brain repos (`company-product-brain/`) work with either implementation.** Records are markdown, config is YAML, the wire format with the bot is HTTP. No data migration needed when the team flips runtimes.

---

## Stack

| Concern | Library | Latest version (pinned) |
|---|---|---|
| Runtime | Node | ≥20.18 (LTS); CI on 22 |
| Compiler | TypeScript | 6.0.3 |
| Tests | Vitest | 4.1.5 |
| Bot HTTP | Fastify | 5.8.5 |
| Queue / audit | better-sqlite3 | 12.9.0 |
| Anthropic SDK | @anthropic-ai/sdk | 0.91.1 |
| OpenAI SDK | openai | 6.34.0 |
| YAML | js-yaml | 4.1.1 |
| CLI | commander | 14.0.3 |
| Validation | zod | 4.3.6 |
| Logging | pino + pino-pretty | 10.3.1 / 13.1.3 |
| Git | simple-git | 3.36.0 |
| Env | dotenv | 17.4.2 |
| Lint | ESLint + typescript-eslint | 10.2.1 / 8.59.0 |
| Dev runner | tsx | 4.21.0 |

All versions are the latest as of the scaffold date.

### Security audit

```
npm audit --omit=dev:  0 vulnerabilities  (runtime deps are clean)
tsc --noEmit:          0 errors  (strict mode + verbatimModuleSyntax + isolatedModules)
vitest:                176/176 passing across 22 test files
```

Re-run anytime via `npm run audit`, `npm run typecheck`, `npm test`. Coverage report via `npm run test:coverage`.

**Dev-deps note:** `vitest`/`vite` ship transitive moderate-severity advisories at the time of writing. Vitest is dev-only (not in any production bundle), so we audit with `--omit=dev`. Runtime deps (`@anthropic-ai/sdk`, `openai`, `fastify`, `better-sqlite3`, `js-yaml`, `commander`, `zod`, `pino`, `dotenv`) are clean.

### Test coverage

| Module | Tests | Coverage notes |
|---|---|---|
| `blocks/hotspot` | 4 | 99.28% (deterministic clustering) |
| `blocks/estimate` | 8 | 100% (similarity + estimateEffort) |
| `blocks/edge-mine` | 9 | stabilitySignals, dedupEdgeCases, validateCitations |
| `blocks/coverage-gap` | 5 | 97.10% (heuristic + LLM-refined paths) |
| `blocks/render` | 6 | 92.40% (groom output template) |
| `records/read` + `write` | 8 | 92–98% (round-trip including manual sections) |
| `bot/queue` | 9 | 100% (atomic claim, depth, recent) |
| `bot/audit` | 4 | 100% (append, lastForTicket, tail) |
| `bot/cooldown` | 7 | 100% (cooldown + quiet hours wrap-around) |
| `bot/commands` | 10 | 100% (parseBrainCommand, all 9 verbs) |
| `bot/comment` | 11 | 100% (header, locate, contentHash) |
| `adapters/aha` | 13 | HTTP-mocked: fetchTicket, search, postComment, HMAC, parseWebhook |
| `adapters/testrail` | 7 | HTTP-mocked: fetchCase, fetchCasesForTicket, fetchRunHistory |
| `init-brain` | 5 | 94% (skeleton creation, --force, git init) |
| `bind` | 11 | 79% (language/entry-point detection on real git fixtures) |
| `migrate` | 5 | 100% (legacy → brain copy with --remove-from-source) |
| `planner` | 3 | 75% (groom/estimate/related with mocked adapter + seeded records) |
| `admin/auth` | 8 | 100% (basic-auth, env loading, timing-safe compare) |
| `admin/templates` | 11 | 100% (HTML escape, layout, table/card/badge) |
| `admin/db` | 11 | 100% (dashboard aggregates, audit filter, queue counts) |
| `admin/settings` | 10 | 100% (zod whitelist, ignores out-of-list keys, preserves untouched fields) |
| `admin/server` | 10 | 90% (each route smoke-tested via Fastify inject; auth, render, settings POST round-trip) |

**Not yet covered:** `cli.ts`, `config.ts`, `incremental.ts`, `repair.ts`, `backfill/*` (heavy git+LLM+GitHub I/O), `bot/webhook.ts` + `worker.ts` (Fastify + adapter integration), `llm/*` (SDK wrappers). Listed for future expansion if/when behavior changes warrant deeper integration tests.

---

## Quick start (for porters)

```bash
cd product-brain-ts
npm install
npm run typecheck       # tsc --noEmit
npm run lint            # eslint
npm run test            # vitest
npm run dev -- --help   # tsx src/cli.ts --help (currently stubs)
npm run build           # tsc → dist/
```

---

## Module map (Python → TypeScript)

Every TS file has a `// Port target:` comment pointing at the Python source. Recommended port order is bottom-up (no-deps first):

| # | Python source | TS target | Notes |
|---|---|---|---|
| 1 | `src/product_brain/models.py` | `src/models.ts` | DONE (interfaces) |
| 2 | `src/product_brain/config.py` | `src/config.ts` | YAML loader + zod schema |
| 3 | `src/product_brain/llm/base.py` | `src/llm/base.ts` | DONE (interface) |
| 4 | `src/product_brain/llm/anthropic_provider.py` | `src/llm/anthropic.ts` | thin wrapper around `@anthropic-ai/sdk` |
| 5 | `src/product_brain/llm/openai_provider.py` | `src/llm/openai.ts` | covers OpenAI / Azure / openai-compatible |
| 6 | `src/product_brain/llm/__init__.py` | `src/llm/index.ts` | factory |
| 7 | `src/product_brain/adapters/base.py` | `src/adapters/base.ts` | DONE (interface) |
| 8 | `src/product_brain/adapters/aha.py` | `src/adapters/aha.ts` | REST via `fetch` |
| 9 | `src/product_brain/adapters/test_base.py` | `src/adapters/test-base.ts` | DONE (interface) |
| 10 | `src/product_brain/adapters/testrail.py` | `src/adapters/testrail.ts` | REST via `fetch` |
| 11 | `src/product_brain/index/read.py` | `src/records/read.ts` | YAML front-matter parsing |
| 12 | `src/product_brain/index/write.py` | `src/records/write.ts` | YAML front-matter rendering |
| 13 | `src/product_brain/index/rename_tracker.py` | `src/records/rename-tracker.ts` | shells out to git |
| 14 | `src/product_brain/blocks/hotspot.py` | `src/blocks/hotspot.ts` | pure math |
| 15 | `src/product_brain/blocks/estimate.py` | `src/blocks/estimate.ts` | pure math |
| 16 | `src/product_brain/blocks/edge_mine.py` | `src/blocks/edge-mine.ts` | regex + LLM call |
| 17 | `src/product_brain/blocks/coverage_gap.py` | `src/blocks/coverage-gap.ts` | tokenization + optional LLM |
| 18 | `src/product_brain/blocks/render.py` | `src/blocks/render.ts` | template fill |
| 19 | `src/product_brain/backfill/git_log.py` | `src/backfill/git-log.ts` | uses `simple-git` |
| 20 | `src/product_brain/backfill/pr_enrichment.py` | `src/backfill/pr-enrichment.ts` | uses `fetch` for GitHub REST |
| 21 | `src/product_brain/backfill/summarize.py` | `src/backfill/summarize.ts` | LLM factory |
| 22 | `src/product_brain/backfill/run.py` | `src/backfill/run.ts` | orchestrates 19–21 + records |
| 23 | `src/product_brain/incremental.py` | `src/incremental.ts` | thin wrapper over `backfill/run` |
| 24 | `src/product_brain/repair.py` | `src/repair.ts` | uses records + adapters |
| 25 | `src/product_brain/init_brain.py` | `src/init-brain.ts` | filesystem only |
| 26 | `src/product_brain/bind.py` | `src/bind.ts` | introspection + manifest write |
| 27 | `src/product_brain/migrate.py` | `src/migrate.ts` | filesystem copy |
| 28 | `src/product_brain/planner.py` | `src/planner.ts` | uses adapters + records + blocks |
| 29 | `src/product_brain/bot/queue.py` | `src/bot/queue.ts` | better-sqlite3 |
| 30 | `src/product_brain/bot/audit.py` | `src/bot/audit.ts` | better-sqlite3 |
| 31 | `src/product_brain/bot/comment.py` | `src/bot/comment.ts` | pure |
| 32 | `src/product_brain/bot/cooldown.py` | `src/bot/cooldown.ts` | pure |
| 33 | `src/product_brain/bot/commands.py` | `src/bot/commands.ts` | pure regex |
| 34 | `src/product_brain/bot/webhook.py` | `src/bot/webhook.ts` | Fastify |
| 35 | `src/product_brain/bot/worker.py` | `src/bot/worker.ts` | uses planner + adapters |
| 36 | `src/product_brain/cli.py` | `src/cli.ts` | commander |

### TS-only additions (no Python equivalent)

| File | Purpose |
|---|---|
| `src/admin/auth.ts` | HTTP Basic auth hook for the admin panel |
| `src/admin/templates.ts` | tagged-template HTML renderer with auto-escape, layout, components |
| `src/admin/db.ts` | read-only SQL queries against `audit.sqlite` and `queue.sqlite` |
| `src/admin/settings.ts` | whitelisted, zod-validated config editor |
| `src/admin/server.ts` | Fastify app: dashboard, audit, repos, queue, settings pages |

After the port: keep slash-command markdown, JSON schemas, templates, docs, demo kit **as-is**. They're agent-readable / human-readable and language-agnostic.

---

## What does NOT need porting

These ship from the existing `product-brain/` repo unchanged:

- `skills/product-brain/SKILL.md` — Claude Code skill description
- `skills/product-brain/commands/*.md` — slash command bodies
- `skills/product-brain/templates/*.md` — record / output templates
- `skills/product-brain/schemas/*.json` — JSON Schemas
- `docs/` — all documentation
- `demo/` — demo kit
- `assets/` — workflow PNGs
- `scripts/install-post-merge-hook.sh` — bash, runtime-agnostic
- `scripts/github-action.yml` — GitHub Actions YAML
- `scripts/render-diagrams.py` — one-shot diagram renderer (only used at doc-build time)

---

## What changes for users

**Nothing.** Same CLI surface, same brain repo layout, same bot webhook URL. Users running the Python `product-brain` can `npm install` the TS version once it ships and pick up where they left off.

The TS install command is the only operational difference:

```bash
# instead of:
pip install -e /path/to/product-brain[all]

# you'll do:
cd product-brain-ts
npm install -g .
```

---

## Tests

Use Vitest. Recommended approach:

1. Port `models.ts` → no test (types only)
2. Port one module + its test → run `npm test` → verify
3. Move to next module

The Python codebase doesn't ship a comprehensive test suite, so we have an opportunity to add real tests during port. Suggested coverage targets:
- `blocks/` — pure-math: aim for 90%+ (deterministic, easy to test)
- `records/` — front-matter parse/write round-trip
- `bot/queue.ts` + `bot/audit.ts` — SQLite happy path
- `adapters/` — mock HTTP via `msw` or undici interceptors

---

## Migration plan

| Phase | Estimate | What |
|---|---|---|
| 1 | 0.5d | DONE: scaffold + audit + typecheck clean |
| 2 | 1d | Port `models`, `config`, `llm/*`, `records/*` (foundations, no I/O surprises) |
| 3 | 1d | Port `blocks/*` (pure math + regex + LLM call) |
| 4 | 1d | Port `backfill/*` and `adapters/aha` + `adapters/testrail` |
| 5 | 0.5d | Port `incremental`, `repair`, `init-brain`, `bind`, `migrate` |
| 6 | 1d | Port `bot/*` and `cli` |
| 7 | 1d | Smoke test against a real brain repo + a real Aha workspace |

**Total: ~6 dev-days** for someone fluent in TS and familiar with the Python codebase.

---

## Notes for the porter

- Async/await everywhere — Node's `fetch`, `simple-git`, `@anthropic-ai/sdk`, `openai` are all async. Don't try to mimic Python's sync style.
- Use `zod` to validate `config.yaml` once, at load time. Replaces Python's dataclass `from_dict` pattern.
- `verbatimModuleSyntax: true` requires explicit `import type` for type-only imports. Already configured.
- ESM-only (`"type": "module"`). Use `.js` extensions in import paths even for `.ts` files (NodeNext convention). Already pattern in stubs.
- `noUncheckedIndexedAccess: true` makes all array/object access return `T | undefined`. Forces explicit narrowing — catches real bugs.
- Don't use `any`. ESLint warns by default. If you must, use `unknown` and narrow.
- For shelling out to git, prefer `simple-git`'s typed API over raw `child_process` for readability.

Happy porting.

---

## License

MIT — see [LICENSE](LICENSE).
