# /pb-related &lt;ticket-id&gt;

Show similar shipped tickets w/ per-repo gotchas. Cheapest, most defensive command. Good first call when index trust is unclear.

## Steps

1. Validate ticket-id.
2. `aha-fetch(ticket_id)`.
3. `index-read` for `ticket_id` if shipped, else predict tentative scope (see `/pb-plan` step 1).
4. Score all `.product-brain/tickets/*.md` by:
   - File-set Jaccard vs source ticket files (or predicted)
   - Symbol overlap
   - Label match
5. Top 10 above similarity threshold.
6. Per ticket: row w/ id, title, similarity, days, LOC, 1-2 line summary from `## What shipped`. Plus top 1-2 edges.

## Output contract

```
# Tickets related to AHA-XXXX

| Ticket | Similarity | Days | LOC | Repos touched |
|---|---|---|---|---|
| AHA-1100 — 2FA login | 0.72 | 5 | 847 | flutter, backend |
| ...

## Highlights

### AHA-1100 — 2FA login
&lt;1-2 lines from "What shipped"&gt;
Top edges:
- Rate-limit codes (pr#... by @bob)
- Hash codes at rest (test_...)
```

## Cost

No LLM if records exist. LLM only for 1-2 line summary when `## What shipped` missing.
