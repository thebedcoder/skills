# Error Paths

Adversarial probes for diff that calls dependencies. What happens when the dep misbehaves?

## Dep throws probes

```python
# probe: caller doesn't handle the documented exception
def test_load_config_handles_file_not_found():
    config = load_config('/nonexistent/path')
    assert config == DEFAULT_CONFIG   # currently: FileNotFoundError propagates uncaught
```

## Dep returns wrong shape

```python
# probe: API response missing expected key
def test_parse_user_response_missing_email():
    raw = {"id": 1, "name": "alice"}   # no email field
    user = parse_user(raw)
    assert user.email is None   # currently: KeyError 'email'
```

```python
# probe: API response has extra fields that current code rejects
def test_parse_user_response_extra_field():
    raw = {"id": 1, "name": "alice", "email": "a@b", "experimental_flag": True}
    user = parse_user(raw)
    assert user.id == 1   # currently: ValidationError "unexpected field"
```

## Dep returns empty when populated expected

```python
# probe: empty list returned where caller assumes at least one item
def test_get_user_groups_empty_handled():
    db.set_user_groups(user_id=1, groups=[])
    primary = get_primary_group(user_id=1)
    assert primary is None   # currently: IndexError on groups[0]
```

## Dep returns partial result

```python
# probe: batch dep returns 3 of 5 requested items silently
def test_bulk_fetch_partial_result_flagged():
    items, missing = bulk_fetch(ids=[1, 2, 3, 4, 5])
    assert len(items) == 3
    assert missing == [4, 5]   # currently: returns 3 items, caller silently treats as success
```

## Dep times out

```python
# probe: timeout from dep — does the caller retry, fail, or hang?
def test_fetch_user_dep_timeout():
    with mock.patch('http.get', side_effect=Timeout):
        with pytest.raises(UpstreamUnavailable):
            fetch_user(1)   # currently: Timeout exception bubbles up with stack trace in response
```

## Dep returns success with invalid content

```python
# probe: 200 OK but body is HTML error page (provider behaved badly)
def test_fetch_user_invalid_json_body():
    with mock.patch('http.get', return_value=Response(200, '<html>error</html>')):
        with pytest.raises(UpstreamMalformed):
            fetch_user(1)   # currently: JSONDecodeError, no graceful handling
```

## Network probes

```python
# probe: 4xx — does the caller distinguish from 5xx?
def test_fetch_user_404_returns_none():
    with mock.patch('http.get', return_value=Response(404, '')):
        assert fetch_user(99) is None   # currently: raises generic HTTPError
```

```python
# probe: connection reset / DNS failure
def test_fetch_user_connection_error():
    with mock.patch('http.get', side_effect=ConnectionError):
        with pytest.raises(UpstreamUnavailable):
            fetch_user(1)   # currently: ConnectionError leaks with traceback
```

## DB probes

```python
# probe: unique-constraint violation handled with clear error
def test_create_user_duplicate_email():
    User.create(email="a@b")
    with pytest.raises(DuplicateEmailError):
        User.create(email="a@b")   # currently: raw IntegrityError leaks to caller
```

```python
# probe: deadlock retry path
def test_transfer_retries_on_deadlock():
    with mock.patch('db.commit', side_effect=[DeadlockError, None]):
        transfer(from_id=1, to_id=2, amount=100)
        assert db.commit.call_count == 2   # currently: no retry — first deadlock aborts
```

## Anti-pattern reminders

- Generate the probe only if the caller's behavior on the failure path is unspecified or wrong today.
- If the diff explicitly catches and handles the failure, the probe is satisfied — don't report.
- Don't fabricate dependencies the diff doesn't call. Probe real dep boundaries visible in the diff.
