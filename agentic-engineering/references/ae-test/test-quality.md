# Test Quality Anti-Patterns

## Tests that never fail

The worst kind of test — it passes whether the code is correct or broken.

```python
# Trivial assertion — tests that function runs, not what it returns
def test_process():
    result = process(data)
    assert result is not None   # passes even if result is wrong

# No assertion at all
def test_save():
    save_user(user_data)   # no assert — just checks it doesn't throw

# Assertion on the wrong thing
def test_create_order():
    order = create_order(items)
    assert order.created_at is not None   # misses: total, status, item count
```

---

## Testing implementation, not behavior

Tests that break on refactoring even when behavior is unchanged.

```python
# Tests internal calls — brittle
def test_register_user(mock_hash, mock_db, mock_email):
    register_user("alice", "password123")
    mock_hash.assert_called_once_with("password123")   # internal detail
    mock_db.insert.assert_called_once()                # internal detail
    mock_email.send.assert_called_once()               # internal detail

# Tests behavior — robust
def test_register_user():
    fake_db = FakeDatabase()
    fake_email = FakeEmailSender()
    
    register_user("alice", "password123", db=fake_db, email=fake_email)
    
    user = fake_db.find_by_username("alice")
    assert user is not None
    assert user.password != "password123"   # password was hashed
    assert len(fake_email.sent) == 1
    assert fake_email.sent[0].to == "alice"
```

---

## Snapshot tests without review

```javascript
// Auto-generated snapshot — nobody read what it contains
it('renders correctly', () => {
    const tree = renderer.create(<Component />).toJSON()
    expect(tree).toMatchSnapshot()
    // Snapshot was auto-generated — does it capture meaningful behavior?
    // Will update snapshot on any UI change without reviewing
})
```

Flag when: snapshot tests exist but no evidence the snapshots were reviewed,
or when snapshots are enormous (entire page) rather than specific.

---

## Parametrize to cover real cases, not arbitrary ones

```python
# Arbitrary parameters — don't test real edge cases
@pytest.mark.parametrize("n", [1, 2, 3, 4, 5])
def test_factorial(n):
    assert factorial(n) > 0   # weak assertion, arbitrary cases

# Meaningful parameters — test boundaries and edge cases
@pytest.mark.parametrize("n,expected", [
    (0, 1),    # edge: factorial of 0
    (1, 1),    # edge: factorial of 1
    (5, 120),  # normal case
    (10, 3628800),  # larger value
])
def test_factorial(n, expected):
    assert factorial(n) == expected
```

---

## Setup/teardown issues

```python
# Bug — test state leaks between tests
class TestUserService:
    def setup_method(self):
        self.db = Database()
        self.db.insert(test_user)   # inserts but never removes

    def test_list_users(self):
        users = self.db.list()
        assert len(users) == 1   # passes on first run, fails on second (2 users)

# Fix — use transactions rolled back after each test, or clear in teardown
class TestUserService:
    def setup_method(self):
        self.db = Database()
        self.db.begin_transaction()

    def teardown_method(self):
        self.db.rollback()
```

---

## Magic values without explanation

```python
# Unclear why 42, "admin", or 3 specifically
def test_something():
    result = process(42, "admin", 3)
    assert result == "ok"

# Better — named constants make intent clear
VALID_USER_ID = 42
ADMIN_ROLE = "admin"
MAX_RETRIES = 3

def test_something():
    result = process(VALID_USER_ID, ADMIN_ROLE, MAX_RETRIES)
    assert result == "ok"
```

---

## Flaky test patterns

Tests that sometimes pass and sometimes fail without code changes:

```python
# Time-dependent — passes during business hours, fails at midnight
def test_is_business_hours():
    assert is_open()   # depends on real clock

# Order-dependent — passes when run first, fails otherwise
def test_b():
    assert global_counter == 0   # assumes no other test incremented it

# External-dependent — fails when network is down
def test_fetch():
    result = requests.get("https://api.example.com/data")  # real HTTP call
    assert result.status_code == 200
```

Flag any test that depends on real time, real network, real filesystem, or
order of execution.
