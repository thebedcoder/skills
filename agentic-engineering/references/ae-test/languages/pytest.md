# pytest

## File and naming conventions

```
tests/
  test_users.py         ← module tests
  test_orders.py
  conftest.py           ← shared fixtures

# Function names
def test_create_user_returns_id():       ✓
def test_login_fails_with_bad_password():  ✓
def test_1():                            ✗ — meaningless on failure
def testLogin():                         ✗ — collected (python_functions defaults to the
                                             prefix `test`), but breaks convention. Flag as
                                             style, never as "this test never runs"
```

## Fixtures — patterns and pitfalls

```python
# Good — fixture with clear scope
@pytest.fixture
def user(db):
    user = User.create(name="Alice", email="alice@example.com")
    return user
    # No cleanup needed if db fixture handles transaction rollback

# Bug — fixture with no cleanup for real side effects
@pytest.fixture
def uploaded_file():
    path = "/tmp/test_upload.txt"
    open(path, 'w').write("test data")
    return path
    # File left on disk — fix with yield + cleanup:

@pytest.fixture
def uploaded_file():
    path = "/tmp/test_upload.txt"
    open(path, 'w').write("test data")
    yield path
    os.remove(path)   # cleanup runs after test

# DB fixture pattern — rollback after each test
@pytest.fixture
def db():
    connection = get_db_connection()
    connection.begin()
    yield connection
    connection.rollback()
    connection.close()
```

## Assertions — use pytest assertions, not unittest

```python
# Wrong — unittest style (worse error messages)
self.assertEqual(result, expected)
self.assertTrue(result)
self.assertIn(item, collection)

# Right — pytest style (better diffs on failure)
assert result == expected
assert result
assert item in collection

# Asserting exceptions
with pytest.raises(ValueError, match="invalid input"):
    process(bad_data)

# Asserting approximate equality
assert result == pytest.approx(3.14, rel=1e-3)
```

## Parametrize — when and how

```python
# Good — parametrize replaces repetitive tests
@pytest.mark.parametrize("email,valid", [
    ("user@example.com", True),
    ("user@example", False),     # no TLD
    ("@example.com", False),     # no local part
    ("", False),                 # empty
    ("a" * 256 + "@b.com", False),  # too long
])
def test_email_validation(email, valid):
    assert validate_email(email) == valid

# Bad — parametrize over arbitrary values with weak assertion
@pytest.mark.parametrize("x", [1, 2, 3, 4, 5])
def test_process(x):
    assert process(x) is not None   # weak assertion, arbitrary inputs
```

## Mocking with pytest-mock

```python
def test_sends_email_on_register(mocker):
    mock_send = mocker.patch('myapp.email.send')
    
    register_user("alice@example.com")
    
    mock_send.assert_called_once_with(
        to="alice@example.com",
        subject="Welcome to MyApp"
    )

# Patching at the right level — patch where it's used, not where it's defined
# Wrong: mocker.patch('smtplib.SMTP')
# Right: mocker.patch('myapp.email.SMTP')  ← where your code imports it

# Checking call args more flexibly
mock_send.assert_called_once()
args, kwargs = mock_send.call_args
assert kwargs['to'] == "alice@example.com"
assert "Welcome" in kwargs['subject']
```

## Async tests — pytest-asyncio

```python
# Requires: pip install pytest-asyncio
# In pyproject.toml or pytest.ini:
# asyncio_mode = "auto"  ← marks all async tests automatically

@pytest.mark.asyncio
async def test_async_operation():
    result = await some_async_func()
    assert result == expected

# Async fixtures — @pytest_asyncio.fixture, NOT @pytest.fixture.
# In pytest-asyncio's default strict mode a plain @pytest.fixture on an async
# function yields the async generator object itself, so the test gets a
# generator where it expected a client and fails somewhere far away.
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

@pytest_asyncio.fixture
async def async_client():
    # AsyncClient(app=...) was removed in httpx 0.28 — use an explicit transport.
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
```

## What to flag

- `assert result is not None` as the only assertion
- `except: pass` inside test body
- No `pytest.raises` for functions that should raise
- Fixtures with side effects and no cleanup
- Tests that import and call the same function the implementation calls (circular)
- Real HTTP calls, real file writes, real DB without transaction rollback
- `time.sleep()` in tests — mock the clock the code reads, or inject a fake. **`freezegun` does not make `time.sleep()` return early**; it patches `datetime.now`, `time.time` and friends, so a test that sleeps still sleeps for real
