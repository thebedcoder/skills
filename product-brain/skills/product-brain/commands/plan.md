# /pb-plan &lt;free-text feature description&gt;

Plan a feature when no Aha ticket exists yet. Predict scope, find similar past work, propose drafts.

## Inputs
- Free-text description (1–3 sentences usually enough).

## Steps

1. **Tentative scope prediction**: read each repo's `manifest.md` (entry points, languages, conventions). Send the description + manifests to the LLM with prompt: "Predict touched directories and 3–5 likely-affected files per repo. Mark each prediction as confidence high/medium/low."
2. **Search past tickets** by:
   - Keyword match against ticket titles via PM adapter `search_tickets(keywords)`.
   - File-set similarity against tentative scope across all `.product-brain/tickets/*.md` records.
   - Combine: top 10 candidates by combined score.
3. **`index-read`** for the candidate ticket IDs.
4. **`hotspot-cluster`** + **`estimate`** as in `/pb-groom`, but mark estimate confidence as "preliminary — pre-ticket scope is unverified."
5. **`edge-case-mine`** on the candidate records.
6. **Propose draft sub-tickets**: one per repo where predicted scope is non-empty. Each draft has title, scope summary, est range, edge-case checklist, link to nearest reference ticket.
7. **Render** using `templates/groom-output.md` with `mode: plan` (adds "Tentative scope" section, marks estimate "preliminary").

## Output contract

Same as `/pb-groom` plus:

- Header note: "**Pre-ticket plan** — scope is predicted, refine after creating the ticket."
- "## Tentative scope" section with confidence per file/dir prediction.
- Estimate confidence is always one notch lower than `/pb-groom` would produce.
- "## Draft sub-tickets" section is required (it's the main deliverable).

## Failure handling

- If search returns &lt;3 candidates: print "low-signal feature — no nearby past work found. Estimate omitted." Still emit tentative scope and draft sub-tickets.
