# /pb-edges &lt;ticket-id&gt;

Edge-case-only output. Useful when the engineer/PM just wants the gotcha checklist.

## Steps

1. Validate `ticket-id`.
2. `aha-fetch(ticket_id)` and `aha-fetch related` (siblings + label matches, cap 30).
3. `index-read` for `[ticket_id] + related_ids` across all repos.
4. `edge-case-mine(records)` — aggregate, dedup, validate citations, theme.
5. Render edge-case section only.

## Output contract

```
# Edge cases for AHA-XXXX

Mined from N related tickets across &lt;repos&gt;.

- &lt;bullet&gt;     [N/M records: AHA-..., AHA-...]
  source: pr#789 review @bob | test_foo_bar | def456

## Known gaps in nearby work
- &lt;bullet&gt;     [stale: AHA-... still flags this]
```

## Failure handling

- If &lt;3 related tickets: print "low signal — limited mining material" and emit whatever bullets do validate.
