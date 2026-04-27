# Backfill

The one-shot pipeline that walks `git log --all` and produces one record per ticket per repo. Idempotent and rerunnable.

## Phases

```
git log + PR data ─► raw mapping ─► PR enrichment ─► path normalize
                                                          │
       symbol extraction (optional) ──────────────────────┤
                                                          ▼
                       front-matter assembly  ─►  prose (LLM)  ─►  write
```

### Phase 1 — Raw mapping

```
git log --all <--no-merges per workflow> \
        --pretty=format:'%H|%an|%ae|%aI|%s|%b|%P' \
        --name-status --find-renames=50%
```

For each commit:
- Regex the configured `ticket_regex` from subject + body. A commit may reference >1 ticket; appears in each.
- Parse `--name-status` lines into `[(change, path, [renamed_to])]`.
- Skip merges per `manifest.workflow`:
  - `squash`: merge IS the diff — keep merges, drop branch commits.
  - `merge`: drop merges, keep branch commits.
  - `rebase`: drop merges (no merge commits exist on main).

Output: `Dict[ticket_id, List[Commit]]`.

### Phase 2 — PR enrichment

For each ticket's commits, find the PR(s):

- Parse `(#N)` from squash-merge subjects when present.
- Otherwise call `gh pr list --search "<ticket_id>" --state merged --json number,title,body,mergedAt,labels`.
- For each PR, fetch review comments via `/repos/{owner}/{repo}/pulls/{n}/comments` (REST) or GraphQL for batch.

PR review comments are the highest-signal source for edge cases. Skipping this phase materially degrades `## Edge cases handled` quality.

### Phase 3 — Path normalization

Replay renames forward to today's HEAD:

```
canonical_path[old] := walk renames(old) → ... → current
```

Files referenced in old commits but no longer at HEAD are kept with `change: deleted`. They're not silently dropped.

### Phase 4 — Symbol extraction (optional)

If `backfill.symbol_extraction: true` and the language has a configured diff driver:

- Parse `@@ ... function_name(` and similar from diff hunk headers.
- Or, more accurately, parse with `tree-sitter` if available.

Stored as `symbols: [list]`. Skipped if not configured. Symbol-level data is icing; not load-bearing.

### Phase 5 — Front-matter assembly

Pure function `(commits, prs) → front_matter`:

```typescript
const ticketMeta = await pmAdapter.fetchTicket(ticketId);
const frontMatter = {
  ticket: ticketId,
  title:  ticketMeta.title,
  type:   ticketMeta.type,
  status: inferStatus(commits, prs),
  firstCommit: minDate(commits.map(c => c.date)),
  lastCommit:  maxDate(commits.map(c => c.date)),
  shas:    commits.map(c => c.sha),
  prs:     prs.map(p => p.number),
  authors: [...new Set(commits.map(c => c.author))].sort(),
  files:   normalizePaths(aggregateFiles(commits)),
  symbols: cfg.symbolExtraction ? extractSymbols(commits) : [],
  locAdded:   files.reduce((a, f) => a + (f.loc_added ?? 0), 0),
  locRemoved: files.reduce((a, f) => a + (f.loc_removed ?? 0), 0),
  durationDays: (lastCommit.getTime() - firstCommit.getTime()) / 86_400_000,
  prOpenToMergeDays: prs.length ? median(prs.map(p => p.openToMerge)) : null,
};
const relatedTickets = computeRelated(frontMatter, allRecords);
```

### Phase 6 — Prose (one LLM call per ticket)

Inputs:
- PR title, body, review comment threads
- Commit subjects and bodies
- File list with +/- LOC
- Top-N largest diff hunks (head + tail sample if total exceeds `llm.max_input_tokens_per_ticket`)

Output (JSON, structured):
```json
{
  "what_shipped": "...",
  "key_decisions": ["..."],
  "edge_cases_handled": [
    {"text": "...", "source": "pr#789 review @bob"},
    ...
  ],
  "known_gaps": [
    {"text": "...", "source": "TODO in path:line"},
    ...
  ]
}
```

Prompt enforces:
- Every edge case must cite a source.
- "Return fewer or zero" if signals don't support N bullets — never invent.
- Source must be a verifiable artifact (PR comment, test name, commit SHA, file:line for TODO).

### Phase 7 — Citation validation

Before write, every cited source is checked:
- SHAs: `git cat-file -e <sha>`
- PR comments: REST API HEAD
- Test names: `grep -r "<name>" <repo>` returns ≥1 match
- TODO file:line: file exists and contains the TODO at the line

Bullets that fail validation are dropped. Drop count is logged; if >10% of bullets across a backfill drop, the audit log emits a warning.

### Phase 8 — Write

Path: `<repo>/.product-brain/tickets/<TICKET_ID>.md`.

Idempotent: if the file exists and `front_matter.last_commit == newest_sha`, skip. Otherwise rewrite (preserving any `## Edge cases (manual)` section below the sentinel).

After all writes, update `manifest.last_indexed_sha` to current HEAD.

## Performance and cost

A 5-year repo with 10K commits and 500 unique tickets:

| Phase | Time | Cost |
|---|---|---|
| 1: git log | seconds | $0 |
| 2: PR enrichment | minutes (GH rate limit) | $0 |
| 3: path normalize | seconds | $0 |
| 4: symbols | seconds | $0 |
| 5: front-matter | seconds | $0 |
| 6: prose (Haiku) | ~10–20 min | ~$2.50 |
| 7: validation | seconds | $0 |
| 8: write | seconds | $0 |

For Sonnet on phase 6: ~$25 and similar wall-time.

## Failure modes

| Mode | Mitigation |
|---|---|
| Pre-rule history (commits before "ticket-ID required" was enforced) | Document `index_cutoff_date` in manifest; planner displays "index blind before X". |
| Reverts | Identify via `git log --grep=Revert` and back-reference. The reverted ticket's record gets `reverted_by: [sha]`. |
| Cherry-picks across branches | Same logical change in multiple SHAs. Dedup by `(subject, author, original-commit-date)`. |
| Multi-ticket commits | Appear in both records; do not double-count in churn math. |
| Force-push reshuffles | Backfill is point-in-time. Re-run with `--force` if discovered. |
| GitHub rate limits | Exponential backoff; resumable mid-run via state file. |
| LLM output not valid JSON | Retry once with stricter prompt; on second failure, emit a record with empty prose sections (front-matter still valid). |

## Re-running

```bash
product-brain backfill --repo backend          # incremental: only tickets with new SHAs
product-brain backfill --repo backend --force  # rebuild all records, preserving manual sections
product-brain backfill --repo backend --since 2024-01-01
product-brain backfill --all                   # all configured repos
```

`--force` regenerates prose. `--force --no-llm` rebuilds front-matter only (free, fast — useful after schema changes).
