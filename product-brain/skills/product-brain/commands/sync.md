# /pb-sync [--repo &lt;name&gt;] [--since &lt;sha-or-date&gt;] [--full]

Refresh index. Hook keeps it current normally. Use when:

- Hook missed (CI failure, bypassed merge)
- Bulk catch-up after vacation
- After prompt/template changes → regen prose

## Args
- `--repo &lt;name&gt;`: limit to one repo. Default: all.
- `--since &lt;sha&gt;` or `&lt;YYYY-MM-DD&gt;`: from this point forward. Default: from `manifest.last_indexed_sha`.
- `--full`: rebuild all records. Equivalent to `product-brain backfill --force`.

## Steps

Per target repo:

1. `git pull` (warn if dirty).
2. Range:
   - `--full` → all of `git log --all`
   - `--since` → from given SHA/date forward
   - default → `manifest.last_indexed_sha` to HEAD
3. Run backfill phases 1-6 over range. See `docs/backfill.md`.
4. Update `manifest.last_indexed_sha` → current HEAD.
5. Run `repair.py` validation pass on updated records. Drop bullets w/ broken citations.
6. Print summary: `&lt;N&gt; updated, &lt;M&gt; new, &lt;K&gt; bullets dropped`.

## When to call interactively

Almost never. Engineers self-serve catch-up when noticing stale records during `/pb-groom`.

Bot worker calls same logic inline if `manifest.last_indexed_sha != HEAD` before any groom.

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
