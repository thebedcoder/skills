# Architecture

## Goals

1. **Bind tickets to real shipped code.** Use `git log`'s ticket-ID convention as the join key between PM tool and codebase.
2. **Cheap to query.** No semantic database; the index is markdown files in each repo.
3. **Trustworthy output.** Every edge case cites a real artifact (PR comment, test name, SHA), validated at write time.
4. **Pluggable PM tool.** Aha today, anything else tomorrow via a small adapter interface.

## Layout

```
+----------------------------+      +------------------------------+
|         PM tool            |<-----| PMAdapter (abstract)         |
|  Aha / Linear / Jira       |      | fetch_ticket / search /      |
+----------------------------+      | comment / create / link      |
                                    +-------+----------------------+
                                            |
                                            v
+--------------------------------------------------------------+
|                       product-brain                           |
|                                                               |
|  +------------+  +-------------+  +----------------+         |
|  | backfill   |->| index       |->| blocks         |         |
|  | git+PR+sum |  | read/write  |  | hotspot        |         |
|  +------------+  | rename track|  | estimate       |         |
|                  +-------------+  | edge_mine      |         |
|  +------------+  +-------------+  | render         |         |
|  | incr.      |  | repair      |  +-------+--------+         |
|  | (hook)     |  | (nightly)   |          |                   |
|  +------------+  +-------------+          v                   |
|                                    +-------------+            |
|                                    | slash cmds  |            |
|                                    | + bot       |            |
|                                    +-------------+            |
+--------------------------------------------------------------+
       |                                  |
       v                                  v
+----------------------+      +------------------------+
| .product-brain/      |      | Aha comment thread     |
| tickets/AHA-*.md     |      | bot replies (edit-     |
| manifest.md          |      | in-place)              |
+----------------------+      +------------------------+
```

## Three-layer model

### Layer 1: Index — central brain repo

One brain repo holds records for all bound source repos. Source repos are NOT modified.

```
company-product-brain/
  config.yaml
  repos/
    <repo-name>/
      manifest.md          front-matter: ticket_regex, workflow,
                           entry_points, last_indexed_sha, ...
      tickets/
        AHA-1234.md        one record per ticket touched in this repo
```

See [binding.md](binding.md) for the bind workflow.

**Front-matter is mechanical.** Files, SHAs, dates, authors, related-tickets — all derived from `git` + GitHub. A re-run produces identical front-matter regardless of LLM availability.

**Prose is LLM-generated and citation-validated.** Every bullet in `## Edge cases handled` cites a source artifact. Citations are validated at write: SHA must exist in git, PR must exist via API, test name must grep to a real file. Bullets that fail validation are dropped.

A manual section (`## Edge cases (manual)`) below a sentinel comment is never overwritten. Engineers can hand-augment what mining missed.

### Layer 2: Sync

| Job | When | What it does |
|---|---|---|
| **backfill** | One-shot, rerunnable | Walk source repo's `git log --all`, group commits by ticket, write records into the brain repo. ~$0.005/ticket with Haiku. |
| **incremental** | Source repo post-merge hook → bot webhook → worker | Update one ticket record per merge; bot commits/pushes brain repo. ~1 small LLM call. |
| **repair** | Nightly cron on brain host | Validate citations, reconcile renames, refresh `related_tickets` and `linked_bugs`, mark stale gaps. |

Front-matter and prose live together but are produced separately. Front-matter is reproducible from git/PM data alone; prose uses the LLM.

### Layer 3: Query

Building blocks (see `src/blocks/`):

| Block | Determinism | LLM calls |
|---|---|---|
| `aha-fetch` | Pure I/O | 0 |
| `index-read` | Pure I/O | 0 |
| `hotspot-cluster` | Deterministic counts + co-change matrix | 1 (theming the keyword frequencies) |
| `estimate` | Deterministic similarity + average | 0 |
| `edge-case-mine` (per-ticket) | Deterministic gather | 1 (per ticket, at backfill — cached) |
| `edge-case-mine` (cross-ticket dedup) | LLM | 1 (per query) |
| `code-verify` | Subagent fan-out (gated) | ≤3 (capped) |
| `render` | Templating | 0 |

A `/pb-groom` invocation: ~3 LLM calls + 1 PM-adapter call + optional ≤3 subagent calls. Predictable budget.

## Cross-repo joins

A feature touches all 3 repos. We do not maintain consolidated cross-repo records. Instead, each repo has its own per-ticket record under `repos/<name>/tickets/`; the planner aggregates at query time during `index-read`. Since all records live under one brain repo, joins are trivial — `grep` across `repos/*/tickets/AHA-1234.md` works directly.

## Why no vector DB

Tickets are addressable by ID. The lookup key is exact, not fuzzy. We don't need semantic search to answer "what shipped under AHA-1234?" — we need a file open. Markdown indexing covers 80% of value at ~10% of complexity. A vector index can be added later if and only if recall failures appear (e.g., "find tickets touching auth without ticket IDs"). Today, files + jq + grep + Jaccard scoring is sufficient.

## Data flow: a `/pb-groom` invocation

```
user: /pb-groom AHA-1234

1. validate ticket ID ────────────────────────────────► pure
2. aha-fetch(AHA-1234) ───────────────────────────────► 1 PM call
3. aha-fetch siblings + label matches ────────────────► 1 PM call (cached)
4. index-read [AHA-1234, siblings...] across 3 repos ─► local FS
5. hotspot-cluster(records) ──────────────────────────► deterministic + 1 LLM
6. estimate(clusters, AHA-1234) ──────────────────────► deterministic
7. edge-case-mine.dedup(records) ─────────────────────► 1 LLM
8. (optional) code-verify(top hotspots) ──────────────► ≤3 subagents
9. render groom-output.md ────────────────────────────► template fill
```

## Failure modes built into the design

| Mode | Mitigation |
|---|---|
| Sparse history (new repo) | Degrade to "low signal" — emit Aha description + risks; skip estimate. |
| File renames break frequency | `git log --follow`; canonical-path replay forward to HEAD; repair reconciles. |
| Mega-files (utils.py changes always) | Exclude files above `manifest.mega_file_threshold` percentile from clusters. |
| Reverts | `repair` tags reverted SHAs; record marks `status: abandoned`. |
| Cherry-picks | Backfill dedups by `(subject, author, original-commit-date)`. |
| Hallucinated citations | Validation pass at write; bullets without verifiable sources are dropped. |
| Stale prose | Repair flags records where `last_commit` >12 months and current code drifted. |
| LLM cost runaway | Hard caps: per-groom ≤5 LLM calls; per-backfill ≤1 call/ticket. |

## Test-management integration (optional)

When `test_adapter` is configured (see [test-adapter.md](test-adapter.md)), records gain four additional fields — `test_cases`, `qa_edges`, `stability_signals`, `coverage_gaps` — and groom output gains three sections that surface QA-discovered edges, evidence-based risk from run history, and code-vs-QA coverage gaps. None of this is required; the system runs as before without it.

## See also

- [manifest-schema.md](manifest-schema.md): the per-repo manifest and per-ticket record schemas
- [backfill.md](backfill.md): backfill phases and edge cases
- [edge-case-mining.md](edge-case-mining.md): citation discipline detail
- [pm-adapter.md](pm-adapter.md): writing a new PM adapter
- [test-adapter.md](test-adapter.md): TestRail and writing a new test adapter
- [binding.md](binding.md): brain repo layout, binding source repos, hook setup
- [bot.md](bot.md): headless bot architecture
