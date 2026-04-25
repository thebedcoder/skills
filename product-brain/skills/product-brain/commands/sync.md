# /pb-sync [--repo &lt;name&gt;] [--since &lt;sha-or-date&gt;] [--full]

Refresh the product-brain index. Normally the post-merge hook keeps it current; use this when:

- The hook was missed (CI failure, bypassed merge)
- Bulk catch-up after vacation
- After changing prompts/templates and wanting prose regenerated

## Inputs
- `--repo &lt;name&gt;`: limit to one repo. Default: all configured.
- `--since &lt;sha&gt;` or `--since &lt;YYYY-MM-DD&gt;`: only update tickets touched after this point. Default: incremental from last indexed SHA.
- `--full`: rebuild all records from scratch. Equivalent to `product-brain backfill --force`.

## Steps

For each target repo:

1. `git pull` (warn if dirty).
2. Identify the range:
   - `--full`: all of `git log --all`.
   - `--since`: from the given SHA/date forward.
   - default: from `manifest.last_indexed_sha` (stored in `.product-brain/manifest.md`) to HEAD.
3. Run the backfill pipeline (phases 1–6) over the range. See `docs/backfill.md`.
4. Update `manifest.last_indexed_sha` to current HEAD.
5. Run `repair.py` validation pass on the updated records to drop bullets with broken citations.
6. Print a summary: `&lt;N&gt; tickets updated, &lt;M&gt; new, &lt;K&gt; edge-case bullets dropped (failed validation)`.

## When to call this from interactive Claude Code

Almost never — engineers shouldn't be running sync. It exists so engineers can self-serve catch-up when they notice stale records during `/pb-groom`.

The bot worker calls the same logic inline before any groom run if `manifest.last_indexed_sha != git HEAD`.

## Output contract

```
sync: backend
  range: abc123..def456 (8 commits)
  tickets updated: 3
  tickets created: 1
  bullets dropped: 2 (failed citation validation)
  duration: 14s
  cost: $0.02
```
