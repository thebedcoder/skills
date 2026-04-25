# /pb-draft-tickets &lt;feature description or parent-ticket-id&gt;

Propose sub-tickets for a feature, scoped per repo, ready for PM review.

## Inputs
- Either a parent ticket ID (`AHA-1234`) — sub-tickets will be drafted under it.
- Or a free-text description — sub-tickets are returned as a checklist; PM can paste into the PM tool or invoke `/brain draft-tickets` from a comment to actually create them.

## Steps

1. If parent ticket ID: `aha-fetch(id)` for context.
2. Predict per-repo scope (same step as `/pb-plan` step 1).
3. Find references via `/pb-related` logic to anchor estimates.
4. Per repo with non-empty scope, draft one ticket:
   - title: `&lt;repo&gt;: &lt;short summary&gt;`
   - description: areas, predicted files, est range, edge-case checklist, link to top reference ticket
   - estimated effort: from `estimate` block
   - acceptance criteria: 3–5 bullets seeded from manifest conventions and edge-case mining
5. Output the drafts. **Do not push to the PM tool unless invoked from the bot.** Interactive mode prints them; bot mode calls `pm_adapter.create_ticket(draft, parent=...)`.

## Output contract

```
# Draft sub-tickets

## Parent: AHA-XXXX (or "&lt;feature description&gt;")

### Draft 1 — backend: reset endpoints
- **Effort:** 2–3d (medium confidence; ref: AHA-1100)
- **Files:** api/auth/, services/email/
- **Acceptance:**
  - POST /auth/reset/request returns 202 with rate-limit header
  - POST /auth/reset/confirm validates token, returns generic error on expired
  - Tokens hashed at rest
- **Edge cases:** rate-limit, token replay, locked accounts
- **Reference:** AHA-1100

### Draft 2 — react: reset route
...

### Draft 3 — flutter: reset screen + deep link
...
```

## Bot vs interactive

- Interactive (`/pb-draft-tickets`): prints to stdout/Claude Code only. PM acts on it.
- Bot (`/brain draft-tickets`): creates drafts in the PM tool with status = `config.bot.draft_status` (default "Bot-draft"), parent set to the source ticket. Bot never assigns owners.
