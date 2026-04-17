---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/test_*.py"
  - "**/*_test.go"
  - "**/tests/**"
---

# Testing Conventions

## What to test
- Public API — behavior through public functions, not private helpers
- Error paths — every code path that returns an error should have a test
- Edge cases — empty, null, zero, maximum, boundary-off-by-one
- Not: getters/setters with no logic, trivial pass-throughs

## What not to test
- Private methods directly — test through public API
- Third-party library internals — mock the boundary, trust the library
- Framework wiring — Next.js routes, Django URL dispatch don't need tests

## Test structure
- One assertion per test where practical — multiple OK when they verify the same behavior
- Arrange-Act-Assert visible — blank lines separate the three phases
- Test name describes the scenario: `test_login_fails_with_wrong_password` not `test_login_2`
- Tests independent — order doesn't matter, no shared mutable state

## Test data
- Factories or builders for object creation — not hardcoded instances
- Minimum data needed — don't include irrelevant fields
- Fixtures cleaned up after each test — DB rollback, temp files deleted
- Never use production data — even anonymized, risk isn't worth it

## Mocks and doubles
- Mock external boundaries — network, filesystem, time, random
- Don't mock what you own — test with real implementations where practical
- Fakes preferred over mocks for complex behavior — real database > mock with stubbed queries
- Verify behavior, not implementation — `assertCalledWith` can make tests brittle

## Coverage targets
- No arbitrary coverage number — 100% coverage of trivial code is not meaningful
- Critical paths: 100% — auth, payments, data loss risks
- New code: higher bar than legacy
- Exclude generated code, migrations, trivial DTOs from coverage requirements

## What tests must catch
- Regressions — bug fixed gets a test proving it can't recur
- Contracts — API shape tested, breaking changes caught
- Business rules — discount logic, permissions, state machines fully tested

## Flaky tests
- Zero tolerance — flaky tests are immediately quarantined or fixed
- Time-dependent tests use injected clock, not `datetime.now()`
- Async tests properly awaited — never rely on `setTimeout` to resolve
- Race conditions caught with repeated runs: `--repeat 100` before landing
