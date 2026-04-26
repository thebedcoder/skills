# /pb-edges &lt;ticket-id&gt;

Edges-only output. Engineers/PMs wanting just the gotcha checklist.

## Steps

1. Validate ticket-id.
2. `aha-fetch(ticket_id)` + `aha-fetch related` (siblings + label, cap 30).
3. `index-read` for `[ticket_id] + related_ids`.
4. `edge-case-mine.dedup(records)` — aggregate, dedup, validate citations, theme.
5. If `test_adapter` set: also emit QA edges + stability signals + coverage gaps.
6. Render edge sections only.

## Output contract

```
# Edge cases for AHA-XXXX

Mined from N related tickets across &lt;repos&gt;.

- &lt;bullet&gt;     [N/M records: AHA-..., AHA-...]
  source: pr#789 review @bob | test_foo_bar | def456

## QA-verified edges                  (if test_adapter set)
- &lt;bullet&gt;     [TR-C-NNNN]

## Stability signals                  (if test_adapter set)
- TR-C-NNNN: N fails / window

## Coverage gaps                      (if test_adapter set)
- &lt;edge&gt; — no QA case match

## Known gaps in nearby work
- &lt;bullet&gt;     [stale: AHA-...]
```

## Failures

- `<3` related tickets → "low signal — limited mining material". Emit whatever validates.
