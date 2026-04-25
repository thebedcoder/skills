# /pb-groom &lt;ticket-id&gt; [--deep]

Full ticket grooming: scope by repo, estimate (with references), edge cases mined from related work, risks, suggested reviewers, and draft sub-tickets.

## Inputs
- `ticket-id`: required. Must match `config.ticket_regex` (e.g. `AHA-1234`).
- `--deep`: optional. Forces `code-verify` subagent fan-out even when confidence is high.

## Steps

1. **Validate ticket-id** against `config.ticket_regex`. If invalid, print usage and stop.
2. **Load config** from `config.yaml` (or `~/.config/product-brain/config.yaml` if not in a product-brain workdir).
3. **`aha-fetch(ticket_id)`** → `Ticket{id, title, description, type, labels, parent_feature_id, ...}`
4. **`aha-fetch related`**: siblings under the same parent feature + tickets sharing ≥1 label. Cap at 30. Cache the response for the session.
5. **`index-read`** for `[ticket_id] + related_ids` across all configured repos. Result: `Dict[ticket_id, Dict[repo_name, TicketRecord]]`. Missing records are fine (not every ticket touches every repo).
6. **`hotspot-cluster(records)`**:
   - Flatten file lists, weight by recency (≤30d × 3, ≤90d × 2, older × 1).
   - Top-K (K=15) files = primary hotspots.
   - Co-change matrix on file pairs; greedy cluster with co-occurrence threshold 0.4.
   - Per cluster: aggregate owners (commit authors), avg ticket size (LOC, days first→last commit), recurring keywords from `## Edge cases` sections.
   - Single LLM call to turn keyword frequencies into themed bullets.
7. **`estimate(clusters, ticket)`**:
   - Score candidates by: file-set Jaccard, symbol overlap, label match, ticket type match.
   - Pick top 3–5 above `config.estimate.min_similarity`.
   - Compute weighted average days first→last commit (use PR open→merge gap when available).
   - Range = ±1 std dev. Confidence label per `config.estimate.min_references_for_*`.
8. **Optional `code-verify`**: trigger if any of:
   - `--deep` flag passed
   - estimate confidence is `low`
   - any cluster contains a file with hotfix activity in last 30d
   - any record's `last_commit` is older than 12 months
   Fan out one subagent per repo (max 3 total), scoped to top hotspot files. Question template: "Does the index's claim about &lt;feature area&gt; still match the code? Note any drift."
9. **`edge-case-mine(records)`**:
   - Aggregate `## Edge cases handled` bullets across all records.
   - Single LLM dedup/cluster pass: produce themed list with source counts ("Rate limiting: 4/7 records").
   - Drop bullets whose citations don't validate against current `git`/`gh` data.
10. **`render`** using `templates/groom-output.md`.

## Output contract

Sections in order, none omitted:

```
# AHA-XXXX — &lt;title&gt;

## Scope by repo
&lt;per-repo bullets: areas, estimated touch points&gt;

## Estimate: N–M &lt;unit&gt;  (low | medium | high confidence)
References:
- AHA-NNNN (title): Xd, YYY LOC, Z files     similarity 0.NN
- ...

## Edge cases (from N related tickets)
- &lt;bullet&gt;     [N/M records: AHA-..., AHA-...]

## Risks
- &lt;file or area&gt;: &lt;evidence&gt;

## Suggested reviewers
- &lt;handle&gt; (&lt;area&gt;, N commits in scope)

## Draft sub-tickets
- [ ] &lt;repo&gt;: &lt;summary&gt;
```

## Cost budget

3 LLM calls + 1–N PM-adapter calls + optional ≤3 subagent calls. Hard-cap at 5 LLM calls including dedup.

## Failure handling

- If &lt;5 related tickets found: print warning, proceed with low confidence estimate.
- If PM adapter unavailable: print error and abort.
- If no records exist for any related ticket (fresh repo): print "low signal — index is sparse" and emit only the Aha description + risks.
