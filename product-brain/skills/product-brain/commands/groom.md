# /pb-groom &lt;ticket-id&gt; [--deep]

Full grooming. Output: scope per repo, estimate w/ refs, edges, risks, reviewers, draft sub-tickets.

## Args
- `ticket-id`: required. Match `config.ticket_regex`.
- `--deep`: force `code-verify` even on high confidence.

## Steps

1. Validate ticket-id. Invalid → print usage, stop.
2. Load `config.yaml` (or `~/.config/product-brain/config.yaml`).
3. `aha-fetch(ticket_id)` → Ticket.
4. `aha-fetch related`: siblings under parent + label matches. Cap 30. Cache per session.
5. `index-read` for `[ticket_id] + related_ids` across all repos. Missing records OK.
6. `hotspot-cluster(records)`:
   - File counts weighted by recency (≤30d ×3, ≤90d ×2, older ×1)
   - Top-15 = primary hotspots
   - Co-change matrix → greedy cluster, threshold 0.4
   - Per cluster: owners, avg LOC, avg duration, edge keywords
   - 1 LLM call → theme keyword frequencies
7. `estimate(clusters, ticket)`:
   - Score by file Jaccard, symbol overlap, label match, type match
   - Top 3-5 above `min_similarity`
   - Weighted avg days. Range = ±1σ. Confidence per `min_references_for_*`.
   - Use PR open→merge gap when available.
8. `qa-mine` (if `test_adapter` set):
   - Pull test cases for related tickets via `test_adapter.fetch_cases_for_ticket`
   - Extract qa_edges (LLM, citation = TR-C-NNNN)
   - Aggregate `stability_signals` from records
   - Aggregate `coverage_gaps` from records
9. Optional `code-verify`: trigger if `--deep` OR confidence=low OR cluster contains hotfix-active file (≤30d) OR any record `last_commit` >12mo. Fan out 1 subagent/repo, cap 3 total.
10. `edge-case-mine.dedup(records)`: aggregate, dedup, drop unverifiable bullets.
11. `render` via `templates/groom-output.md`.

## Output contract

Sections in order, none omitted (except QA sections — only if `test_adapter` set):

```
# AHA-XXXX — &lt;title&gt;

## Scope by repo
&lt;per-repo bullets&gt;

## Estimate: N–M &lt;unit&gt;  (low|medium|high confidence)
References:
- AHA-NNNN (title): Xd, YYY LOC, Z files     similarity 0.NN

## Edge cases (from N related tickets)
- &lt;bullet&gt;     [N/M records: AHA-...]

## QA-verified edges                       (if test_adapter set)
- &lt;bullet&gt;     [N/M: TR-C-...]

## Stability signals                       (if test_adapter set)
- TR-C-NNNN: N fails / window — fragile

## Coverage gaps                           (if test_adapter set)
- &lt;edge&gt; — no QA case match

## Risks
- &lt;file/area&gt;: &lt;evidence&gt;

## Suggested reviewers
- &lt;handle&gt; (&lt;area&gt;, N commits)

## Draft sub-tickets
- [ ] &lt;repo&gt;: &lt;summary&gt;
```

## Cost

3 LLM + 1-N PM calls + optional ≤3 subagents. Hard cap 5 LLM total.

## Failures

- `<5` related tickets → warn, low confidence estimate.
- PM adapter down → error, abort.
- No records anywhere → "low signal — sparse index". Emit Aha description + risks only.
