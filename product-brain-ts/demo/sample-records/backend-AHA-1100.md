---
ticket: AHA-1100
title: Add 2FA to login flow
type: feature
status: shipped
first_commit: 2025-03-10T09:14:00Z
last_commit: 2025-03-14T17:33:00Z
shas: [abc1234, def4567, 789ace1, c0ffee2]
prs: [789]
authors: [alice, bob]
files:
  - { path: api/auth/two_factor.py,         change: added,    loc_added: 248, loc_removed: 0 }
  - { path: api/auth/login.py,              change: modified, loc_added: 47,  loc_removed: 12 }
  - { path: services/totp/__init__.py,      change: added,    loc_added: 89,  loc_removed: 0 }
  - { path: services/totp/codes.py,         change: added,    loc_added: 142, loc_removed: 0 }
  - { path: db/migrations/0042_two_fa.sql,  change: added,    loc_added: 14,  loc_removed: 0 }
  - { path: tests/auth/test_two_factor.py,  change: added,    loc_added: 218, loc_removed: 0 }
symbols: [TwoFactorService.verify, TwoFactorService.enroll, LoginHandler._handle_2fa_step]
related_tickets: [AHA-900, AHA-1300, AHA-1450]
loc_added: 758
loc_removed: 12
duration_days: 4.3
pr_open_to_merge_days: 2.1
manual_sections: ["Edge cases (manual)"]
test_cases:
  - { id: TR-C-4521, title: "Login with locked account shows 'account locked' message", automation: manual, type: functional, suite: "1", linked_tickets: [AHA-1100], last_status: passed, recent_failures: 0, url: "https://yourco.testrail.io/index.php?/cases/view/4521" }
  - { id: TR-C-4523, title: "TOTP code with leading whitespace is trimmed before verify", automation: automated, type: functional, suite: "1", linked_tickets: [AHA-1100], last_status: passed, recent_failures: 0, url: "https://yourco.testrail.io/index.php?/cases/view/4523" }
  - { id: TR-C-4527, title: "TOTP retains validity through network disconnect", automation: automated, type: functional, suite: "1", linked_tickets: [AHA-1100], last_status: failed, recent_failures: 5, url: "https://yourco.testrail.io/index.php?/cases/view/4527" }
  - { id: TR-C-4801, title: "Concurrent 2FA setup attempts properly serialize", automation: manual, type: functional, suite: "1", linked_tickets: [AHA-1100], last_status: blocked, recent_failures: 3, url: "https://yourco.testrail.io/index.php?/cases/view/4801" }
coverage_gaps:
  - { edge: "Rate-limit verification attempts to 5/min per account", edge_source: "pr#789 review @bob", rationale: "no QA case title matched this behavior" }
---

## What shipped

TOTP-based 2FA for the login flow. Codes generated client-side via `services/totp`,
verified server-side. Enrollment flow gates on existing-session auth. Recovery and
backup codes are out of scope (deferred to AHA-1400).

## Key decisions

- Used `pyotp` package vs rolling our own TOTP (pr#789 review by @charlie).
- Codes hashed at rest in secure storage with sha256+salt (commit def4567).
- DB migration adds `two_fa_secret` and `two_fa_enabled_at` columns; no separate table.
- Lockout after 5 failed verification attempts (commit 789ace1).

## Edge cases handled

- Rate-limit verification attempts to 5/minute per account
  source: pr#789 review @bob
- Lockout after 5 failed attempts within window
  source: tests/auth/test_two_factor.py::test_lockout_after_n_attempts
- Network failure during code submission falls back to retry with same code
  source: commit 789ace1
- TOTP secret rotated on enrollment; old secret invalidated atomically
  source: pr#789 commit c0ffee2
- Account state check (locked/disabled/deleted) before verify
  source: api/auth/two_factor.py:142 TODO

## Known gaps

- No backup codes (deferred to AHA-1400)
  source: pr#789 description
- No recovery email flow if device lost
  source: pr#789 description

## QA-verified edges

- Login with locked account shows specific error (not "wrong password")
  source: TR-C-4521 (manual, passed)
- TOTP code with leading whitespace is trimmed before verify
  source: TR-C-4523 (automated, passed)

## Stability signals

- TR-C-4527 (TOTP through network disconnect): 5 failures in 90d — structurally fragile
- TR-C-4801 (concurrent 2FA setup): 3 blocks in 90d, pending dev investigation

## Coverage gaps

- Rate-limit verification attempts to 5/min per account
  source: pr#789 review @bob
  rationale: no QA case title matched this behavior

<!-- manual: do not overwrite below this line -->
## Edge cases (manual)

- Older Android devices (<API 26) cannot generate TOTP codes; we silently fall
  back to SMS. This isn't in the PR/test history but matters for planning related
  features. Encountered post-launch via support tickets.
