# Coverage Principles

## What to test — scenario types

Every meaningful function should have coverage across these dimensions:

### 1. Happy path
The normal case with valid input. Non-negotiable baseline.

### 2. Error / failure paths
What happens when the operation fails:
- External call throws / returns error
- DB constraint violated
- Invalid state reached
- Resource unavailable

### 3. Edge cases
Boundary conditions where behavior often breaks:
- Empty: `[]`, `""`, `{}`, `0`, `None`
- Single item where multiple expected
- Maximum/minimum values
- Exactly at a limit (not just above/below)
- First and last items in a sequence

### 4. Invalid input
For any function that takes user-controlled or external data:
- Wrong type
- Missing required fields
- Out-of-range values
- Malformed format (bad JSON, invalid date, etc.)

### 5. Concurrent / timing scenarios
If the code involves state:
- What if called twice simultaneously?
- What if called before initialization completes?
- What if called after teardown?

---

## Coverage heuristics — what to flag missing

**Always flag missing:**
- No tests at all for a new public function
- Error path not tested (function can fail, but only success is tested)
- Empty/null input not tested for functions that handle collections or optional data

**Flag if likely important:**
- Exact boundary value not tested (tests `< 10` and `> 10` but not `== 10`)
- Return value not asserted (test calls function but only checks it doesn't throw)
- Side effect not verified (function writes to DB but test doesn't check DB state)

**Don't flag:**
- Private helper functions if tested through public API
- Trivial pass-through functions (single-line delegation)
- Getters/setters with no logic

---

## The regression test

The best mental model: **delete the implementation and see if any test fails.**

If you can imagine an incorrect implementation that would pass all existing tests, that's a gap.

```python
# Implementation
def add(a, b):
    return a + b

# Weak test — passes even if add() returns 0
def test_add():
    result = add(1, 2)
    assert result is not None   # too weak

# Strong test — fails if add() is wrong
def test_add():
    assert add(1, 2) == 3
    assert add(-1, 1) == 0
    assert add(0, 0) == 0
```

---

## Test independence

Each test should be runnable in any order, in isolation.

**Problems:**
- Test A sets up state that test B depends on
- Tests share mutable module-level variables
- Tests depend on external state (real DB, real clock, real network)
- Test cleanup missing — state leaks to next test

---

## What to name tests

Good test names make failures self-explaining:
- `test_login_returns_token_on_valid_credentials` — clear
- `test_login_fails_with_wrong_password` — clear
- `test_login` — useless when it fails
- `test_1` — useless

---

## AC Traceability

A story's `STORIES.md` AC list and its `PROGRESS.md` AC Coverage matrix should align 1:1.

**Contract:**
- Every `AC-N` in STORIES.md → at least one row in the matrix
- Every test in the matrix → exists in the repo (grep the `file:test_name` reference)
- Tests not in any matrix → informational, not a blocker (helpers, smoke, boilerplate, cross-cutting tests)
- Stories without `### AC Coverage` heading in PROGRESS.md → pre-convention story; skip the matrix check

**What this catches:**
- Implementer forgot to write a test for AC-3
- Test was renamed but matrix wasn't updated → stale reference
- Implementer claims `test_login_redirects` covers AC-2 but the function doesn't exist

**What this does NOT catch (covered by existing Step 3 scenario coverage):**
- Test exists and is mapped to AC, but it's a trivial assertion that doesn't actually exercise the behavior
- Edge cases the AC implies but the test doesn't cover (e.g., AC says "redirects on success" — test only checks happy path, doesn't check redirect URL or session cookie)

**Test-identifier format per framework:**
- pytest: `tests/auth_test.py::test_login_redirects`
- jest/vitest: `tests/auth.test.ts > login > redirects on success` or `tests/auth.test.ts::test_login_redirects` (project-specific — match what the runner outputs)
- go test: `auth/auth_test.go::TestLoginRedirects`
- xctest: `AuthTests/testLoginRedirects`
- junit: `AuthTest#testLoginRedirects`
- flutter test: `test/auth_test.dart::test_login_redirects`

Use the format the project's test runner emits when reporting a failure — it's the most useful for someone copying the reference into their terminal to re-run.

---

## Pyramid health

The verification pyramid (unit → integration → e2e) is a heuristic for healthy test mix. The matrix's `Level` column makes the mix visible per story.

**Three canonical levels:**

- **unit** — Single function or class, no I/O. Mocks for collaborators OK. Fast (milliseconds), isolated, easy to debug. Example:

  ```python
  def test_validate_email_rejects_no_at_sign():
      assert validate_email("foo") is False
  ```

- **integration** — Multiple components in-process, mocked or local boundaries (in-mem DB, fake HTTP). Slower (10s–100s of ms) but exercises real wiring. Example:

  ```python
  def test_signup_creates_user_and_session():
      db = InMemoryDB()
      session = SignupService(db).signup("a@b", "pw")
      assert db.get_user("a@b").email == "a@b"
      assert session.user_id == db.get_user("a@b").id
  ```

- **e2e** — Full system, real network/DB/UI. Slowest (seconds). Proves the system shipped. Example:

  ```typescript
  test('user signs up via UI', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('#email', 'a@b')
    await page.fill('#password', 'pw')
    await page.click('button[type=submit]')
    await expect(page).toHaveURL('/dashboard')
  })
  ```

**Soft warning rules (informational, not blockers):**

- `e2e_count / total > 50%` → inverted pyramid; favor extracting unit-level coverage
- `unit_count == 0` (with total > 1) → missing unit-level coverage; extract logic out of integration/e2e

**Why these warnings are soft:** Pyramid shape is project-specific. A flow-validation story can legitimately be e2e-heavy. The warning surfaces the shape; the operator decides.

**Custom levels accepted:** Projects using `contract`, `smoke`, `perf`, or other taxonomy can put those values in the Level cell. `ae-test` doesn't block, but excludes those rows from canonical pyramid math.
