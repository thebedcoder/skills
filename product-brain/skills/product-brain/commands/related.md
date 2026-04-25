# /pb-related &lt;ticket-id&gt;

Show similar shipped tickets and their per-repo gotchas. The simplest, most defensive command — a good starting point if you don't trust the index yet.

## Steps

1. Validate `ticket-id`.
2. `aha-fetch(ticket_id)`.
3. `index-read` for `ticket_id` itself if it has shipped, OR predict tentative scope (see `/pb-plan` step 1) if not.
4. Score all `.product-brain/tickets/*.md` across repos by:
   - File-set Jaccard against the source ticket's file list (or predicted).
   - Symbol overlap.
   - Label match (from PM data).
5. Pick top 10 above similarity threshold.
6. For each: render a row with ticket id, title, similarity, days, LOC, and a 1–2 line summary of `## What shipped`. Plus the top 1–2 edge cases.

## Output contract

```
# Tickets related to AHA-XXXX

| Ticket | Similarity | Days | LOC | Repos touched |
|---|---|---|---|---|
| AHA-1100 — 2FA login | 0.72 | 5 | 847 | flutter, backend |
| ...

## Highlights

### AHA-1100 — 2FA login
&lt;1–2 lines from "What shipped"&gt;
Top edges:
- Rate-limit codes (pr#... by @bob)
- Hash codes at rest (test_...)
```

## No LLM calls if records exist

This command is mostly mechanical. LLM only used for the 1–2 line summary if the record's "What shipped" section is missing.
