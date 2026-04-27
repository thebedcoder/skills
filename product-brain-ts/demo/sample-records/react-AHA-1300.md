---
ticket: AHA-1300
title: Email verification on signup
type: feature
status: shipped
first_commit: 2025-04-01T10:30:00Z
last_commit: 2025-04-04T14:00:00Z
shas: [aabbccd, 1122334, 55ee66f]
prs: [621]
authors: [alice, dana]
files:
  - { path: src/auth/VerifyEmailPage.tsx,    change: added,    loc_added: 124, loc_removed: 0 }
  - { path: src/auth/SignupForm.tsx,         change: modified, loc_added: 18,  loc_removed: 4 }
  - { path: src/auth/api.ts,                 change: modified, loc_added: 22,  loc_removed: 2 }
  - { path: src/routes.tsx,                  change: modified, loc_added: 6,   loc_removed: 0 }
  - { path: src/__tests__/auth/verify.test.tsx, change: added, loc_added: 142, loc_removed: 0 }
symbols: [VerifyEmailPage, SignupForm.onSubmit, postVerify]
related_tickets: [AHA-1100, AHA-1450, AHA-900]
loc_added: 312
loc_removed: 6
duration_days: 3.0
pr_open_to_merge_days: 1.4
manual_sections: ["Edge cases (manual)"]
test_cases:
  - { id: TR-C-4612, title: "Email verify page handles expired token with generic error", automation: automated, type: functional, suite: "3", linked_tickets: [AHA-1300], last_status: passed, recent_failures: 0, url: "" }
  - { id: TR-C-4615, title: "Resend verification email respects 60s cooldown", automation: automated, type: functional, suite: "3", linked_tickets: [AHA-1300], last_status: passed, recent_failures: 1, url: "" }
coverage_gaps:
  - { edge: "Email delivery failure UX — silent log is not enough", edge_source: "pr#621 review @alice", rationale: "no QA case for delivery failure UX" }
---

## What shipped

`/verify-email/:token` route that hits the verify endpoint and shows
status. Signup flow gets a "check your email" intermediate state with a resend
link (60s cooldown). Generic error response on expired/invalid tokens to avoid
account enumeration.

## Key decisions

- Generic error message on any token failure (expired, invalid, already-used) —
  prevents account enumeration via timing or message difference (pr#621 review @alice).
- Resend button has client-side 60s cooldown + server-side rate limit.
- Tokens hashed at rest (server-side; pr#621 references backend AHA-1290).

## Edge cases handled

- Generic error response on expired/invalid token (avoid enumeration)
  source: pr#621 review @alice
- Resend cooldown: 60s client-side + server rate limit
  source: src/__tests__/auth/verify.test.tsx::test_resend_respects_cooldown
- Tokens hashed at rest before comparison
  source: pr#621 commit 55ee66f

## Known gaps

- Email delivery failure UX — currently logs silently; user sees nothing
  source: pr#621 description
- No deep-link handling on mobile web (separate AHA-1400 work)
  source: pr#621 description

## QA-verified edges

- Email verify page handles expired token with generic error
  source: TR-C-4612 (automated, passed)
- Resend verification email respects 60s cooldown
  source: TR-C-4615 (automated, passed)

## Stability signals

_(none — recent failures within tolerance)_

## Coverage gaps

- Email delivery failure UX — silent log is not enough
  source: pr#621 review @alice
  rationale: no QA case for delivery failure UX

<!-- manual: do not overwrite below this line -->
## Edge cases (manual)

_(no manual additions)_
