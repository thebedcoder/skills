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
