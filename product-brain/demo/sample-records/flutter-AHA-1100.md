---
ticket: AHA-1100
title: Add 2FA to login flow
type: feature
status: shipped
first_commit: 2025-03-11T11:02:00Z
last_commit: 2025-03-14T15:18:00Z
shas: [b1a2c3d, e4f5a6b, 9876543]
prs: [412]
authors: [charlie]
files:
  - { path: lib/auth/two_factor.dart,           change: added,    loc_added: 312, loc_removed: 0 }
  - { path: lib/auth/login_screen.dart,         change: modified, loc_added: 64,  loc_removed: 18 }
  - { path: lib/auth/widgets/code_input.dart,   change: added,    loc_added: 87,  loc_removed: 0 }
  - { path: test/auth/two_factor_test.dart,     change: added,    loc_added: 156, loc_removed: 0 }
symbols: [TwoFactorService.verify, LoginScreen._handleSubmit, CodeInputWidget]
related_tickets: [AHA-900, AHA-1300, AHA-1450]
loc_added: 619
loc_removed: 18
duration_days: 3.2
pr_open_to_merge_days: 1.8
manual_sections: ["Edge cases (manual)"]
test_cases:
  - { id: TR-C-4520, title: "2FA screen accepts 6-digit code via numeric keyboard only", automation: automated, type: functional, suite: "2", linked_tickets: [AHA-1100], last_status: passed, recent_failures: 0, url: "" }
  - { id: TR-C-4522, title: "2FA screen handles paste from clipboard with spaces", automation: manual, type: functional, suite: "2", linked_tickets: [AHA-1100], last_status: passed, recent_failures: 0, url: "" }
coverage_gaps: []
---

## What shipped

PIN-style 6-digit code input on the login screen, integrated with the backend
TOTP verify endpoint. Numeric-only keyboard, paste support, auto-advance between
digits, and a "code didn't arrive" link to the recovery flow (placeholder, links to
AHA-1400 ticket).

## Key decisions

- Used a custom `CodeInputWidget` rather than Flutter's `TextField` for better paste
  handling and digit-by-digit feedback (pr#412 review @david).
- Numeric soft keyboard only — no chance of accidental letter entry.
- Loading state covers entire screen during verify; prevents double-submit.

## Edge cases handled

- Paste handling strips whitespace and non-digits before submit
  source: pr#412 review @david
- Auto-advance respects backspace (focuses previous field)
  source: test/auth/two_factor_test.dart::testBackspaceFocusesPrevious
- Loading state blocks double-submit during verify
  source: lib/auth/two_factor.dart:88

## Known gaps

- No biometric pre-auth on subsequent app opens
  source: pr#412 description
- Older Android (<API 26) doesn't generate codes — falls back to SMS at the API
  source: api/auth/two_factor.py:142 TODO (cross-repo reference)

## QA-verified edges

- 2FA screen accepts 6-digit code via numeric keyboard only
  source: TR-C-4520 (automated, passed)
- 2FA screen handles paste from clipboard with spaces
  source: TR-C-4522 (manual, passed)

## Stability signals

_(none — this surface has been stable in run history)_

## Coverage gaps

_(none — code edges all match QA cases)_

<!-- manual: do not overwrite below this line -->
## Edge cases (manual)

_(no manual additions)_
