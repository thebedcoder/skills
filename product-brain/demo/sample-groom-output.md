# Sample `/brain groom` output

This is what the bot replies with — paste it into a slide, print it for the demo, send it after.

(Realistic example. Names and ticket IDs are illustrative; numbers come from the kind of run-history this tool produces on a real repo.)

---

🧠 **product-brain** · groom · run 2026-04-25 14:32
_Estimate revised: AHA-1450 shipped last week, now in references._

# AHA-1500 — Add password reset via email

## Scope by repo

**backend**
- api/auth/                      (similar pattern to AHA-1100, AHA-1300)
- services/email/                (template + send)

**react**
- src/auth/                      (new /reset route + form)

**flutter**
- lib/auth/                      (new screen)
- lib/routing/deep_links.dart    (handle reset link)

## Estimate: 4–6d  (medium confidence)

References:
- AHA-1100 (2FA login):           5.0d, 847 LOC, 14 files     similarity 0.72
- AHA-1300 (email verification):  3.0d, 412 LOC,  9 files     similarity 0.65
- AHA-900  (account locking):     4.0d, 533 LOC, 11 files     similarity 0.41

## Edge cases (from 7 related tickets)

- Rate-limit reset requests (N/hour per email)
    [4/7 records: AHA-1100, AHA-1300, AHA-900, AHA-1450]
- Hash tokens at rest (sha256 + salt)
    [3/7 records: AHA-1300, AHA-1100, AHA-1450]
- Return generic error on expired/invalid token (avoid account enumeration)
    [3/7 records]
- Email delivery failure UX — silent log is not enough
    [2/7: AHA-1300, AHA-1450]
- Account states differ: locked vs disabled vs deleted
    [2/7: AHA-900, AHA-1100]

## QA-verified edges (from related tickets' test suites)

- Login with locked account shows specific error (not "wrong password")
    [TR-C-4521 (AHA-1100), manual, passed]
- TOTP code with leading whitespace is trimmed
    [TR-C-4523 (AHA-1100), automated, passed]
- Concurrent 2FA setup attempts properly serialize
    [TR-C-4801 (AHA-1100), manual, passed]

## Stability signals (from test run history)

- TR-C-4527 (TOTP through network disconnect): 5 failures in 90d window — structurally fragile
- TR-C-4801 (concurrent 2FA setup): 3 blocks in 90d, pending dev fix from AHA-1450

## Coverage gaps (handled in code, not in QA suite)

- Rate-limit reset requests
    source: pr#789 review @bob (from AHA-1100)
    rationale: no QA case title matched this behavior

## Risks

- services/email: 3 hotfixes in last 60d (instability)
- flutter deep-link handler last touched 8mo ago (may need refresh)
- TR-C-4527 area has pattern of failures — add regression test upfront

## Suggested reviewers

- alice    (auth area,    14 commits in scope)
- bob      (email service,  9 commits)
- charlie  (mobile auth,    6 commits)

## Draft sub-tickets

- [ ] backend: reset request/confirm endpoints + token storage
- [ ] backend: email template + send pipeline
- [ ] react: /reset route + ResetForm component
- [ ] flutter: PasswordResetScreen + deep link handler
- [ ] QA: edge-case test plan covering top 5 bullets above

---

<sub>Trigger: `/brain refresh` by pm@example.com ·
Re-run with `/brain refresh` · Disable with label `brain:off` · run_id=4f8a2b1c</sub>
