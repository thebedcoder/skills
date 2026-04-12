# Test Doubles — Mocks, Stubs, Fakes

## The three types

**Stub** — returns a predetermined response. Doesn't verify it was called.
```python
# Stub — just returns a fixed value
def get_user(id): return User(id=id, name="Test User")
```

**Mock** — verifies it was called with specific arguments.
```python
mock_db.save.assert_called_once_with(user)
```

**Fake** — a working implementation, but simpler than production.
```python
class FakeEmailService:
    def __init__(self): self.sent = []
    def send(self, to, subject, body): self.sent.append((to, subject, body))
```

---

## Over-mocking — the most common test quality problem

Over-mocked tests verify implementation details, not behavior.
They pass even when the code is broken, and fail when refactoring even if behavior is unchanged.

```python
# Over-mocked — tests implementation, not behavior
def test_create_order():
    mock_db = Mock()
    mock_validator = Mock()
    mock_notifier = Mock()
    
    service = OrderService(mock_db, mock_validator, mock_notifier)
    service.create(order_data)
    
    mock_validator.validate.assert_called_once()   # only checks that validate was called
    mock_db.save.assert_called_once()              # only checks that save was called
    mock_notifier.notify.assert_called_once()      # no assertion on what was saved or notified

# Better — test observable behavior
def test_create_order():
    db = FakeDatabase()
    service = OrderService(db, RealValidator(), FakeNotifier())
    
    order = service.create({"item": "widget", "qty": 2})
    
    assert order.id is not None
    assert db.find(order.id).status == "pending"
    assert db.find(order.id).total == 19.98
```

**Flag when:**
- Every dependency is mocked
- Tests only assert `assert_called` without checking arguments
- Tests mock the thing being tested
- No assertion on the return value or observable state change

---

## When mocking is appropriate

**Mock external systems** — network calls, file system, time, random:
```python
# Good mock — isolates from external dependency
@patch('myapp.email.send_email')
def test_registration_sends_welcome(mock_send):
    register_user("alice@example.com")
    mock_send.assert_called_once_with(
        to="alice@example.com",
        subject="Welcome!"
    )
```

**Don't mock the code you're testing:**
```python
# Bad — mocking the service being tested
mock_service = Mock(spec=UserService)
mock_service.create_user.return_value = user
result = mock_service.create_user(data)   # tests nothing — just exercises Mock
```

**Don't mock data structures or simple dependencies:**
```python
# Bad — mocking a dict or simple model
mock_config = Mock()
mock_config.get.return_value = "value"
# Better: just use a real dict
config = {"setting": "value"}
```

---

## Fake vs Mock tradeoffs

**Use a Fake when:**
- The dependency has complex behavior you need to work correctly
- Multiple tests use the same dependency in different ways
- You want tests to catch bugs in how the code uses the dependency

**Use a Mock when:**
- You only need to verify a specific interaction happened
- The dependency is truly external (network, filesystem, time)
- You need to simulate hard-to-reproduce conditions (network failure, etc.)
