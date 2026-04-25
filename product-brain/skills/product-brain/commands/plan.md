# /pb-plan &lt;free-text feature description&gt;

Plan when no ticket exists. Predict scope, find similar past work, propose drafts.

## Args
- Free-text. 1-3 sentences usually enough.

## Steps

1. **Tentative scope**: read each repo's `manifest.md` (entry points, languages, conventions). LLM: "Predict touched dirs + 3-5 likely files per repo. Mark each high/medium/low."
2. **Search past tickets**:
   - PM adapter `search_tickets(keywords)` on title match
   - File-set similarity vs tentative scope across all `.product-brain/tickets/*.md`
   - Combine score → top 10 candidates
3. `index-read` for candidate IDs.
4. `hotspot-cluster` + `estimate` as in `/pb-groom`. Mark estimate "preliminary — pre-ticket scope unverified".
5. `edge-case-mine` on candidates.
6. **Draft sub-tickets**: one per repo with non-empty scope. Title, scope summary, est range, edge checklist, ref ticket link.
7. Render via `templates/groom-output.md` mode=plan (adds "Tentative scope" section, marks estimate preliminary).

## Output contract

Same as `/pb-groom` plus:

- Header: "**Pre-ticket plan** — scope predicted, refine after ticket creation."
- "## Tentative scope" w/ confidence per file/dir.
- Estimate confidence one notch lower than equivalent `/pb-groom`.
- "## Draft sub-tickets" required (main deliverable).

## Failures

- `<3` candidates → "low-signal feature — no nearby past work". Emit tentative scope + drafts. Skip estimate.
