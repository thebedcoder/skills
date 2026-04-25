# /pb-draft-tickets &lt;feature description or parent-ticket-id&gt;

Propose sub-tickets per repo, ready for PM review.

## Args
- Parent ticket ID (`AHA-1234`) → drafts under it.
- Or free-text → drafts returned as checklist; PM pastes or invokes `/brain draft-tickets` to create.

## Steps

1. Parent ID → `aha-fetch(id)` for context.
2. Predict per-repo scope (same as `/pb-plan` step 1).
3. Find references via `/pb-related` logic to anchor estimates.
4. Per repo w/ non-empty scope, draft:
   - title: `&lt;repo&gt;: &lt;short summary&gt;`
   - description: areas, predicted files, est range, edge checklist, top-ref link
   - effort: from `estimate` block
   - acceptance: 3-5 bullets seeded from manifest conventions + edge mining
5. Output drafts. Interactive: print only. Bot: `pm_adapter.create_ticket(draft, parent=...)`.

## Output contract

```
# Draft sub-tickets

## Parent: AHA-XXXX (or "&lt;feature description&gt;")

### Draft 1 — backend: reset endpoints
- **Effort:** 2-3d (medium confidence; ref: AHA-1100)
- **Files:** api/auth/, services/email/
- **Acceptance:**
  - POST /auth/reset/request returns 202 w/ rate-limit header
  - POST /auth/reset/confirm validates token, generic error on expired
  - Tokens hashed at rest
- **Edge cases:** rate-limit, token replay, locked accounts
- **Reference:** AHA-1100

### Draft 2 — react: reset route
...

### Draft 3 — flutter: reset screen + deep link
...
```

## Bot vs interactive

- Interactive (`/pb-draft-tickets`): stdout/Claude Code only. PM acts.
- Bot (`/brain draft-tickets`): creates drafts in PM tool, status=`config.bot.draft_status` (default "Bot-draft"), parent=source ticket. Never assigns owners.
