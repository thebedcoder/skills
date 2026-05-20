# Boundary Values + Null / Empty

Adversarial probes for diff that operates on collections, numeric ranges, or optional fields.

## Empty collection probes

```python
# probe: empty list crashes a function that assumes content
def test_process_orders_empty_list():
    result = processOrders([])
    assert result == []   # currently raises IndexError: list index out of range
```

```javascript
// probe: empty object access on a function that assumes a populated map
test('parseConfig empty object', () => {
  expect(() => parseConfig({})).not.toThrow()   // currently: TypeError reading undefined.length
})
```

## Single-element collection probes

```python
# probe: off-by-one in pagination / slice / fold when there's exactly one item
def test_paginate_single_item():
    pages = paginate(['only'], per_page=10)
    assert pages == [['only']]   # currently returns [] because of `if len > 1` guard
```

## Exact-at-limit probes

```python
# probe: function fails at exactly the documented max
def test_username_at_max_length():
    name = 'a' * 32   # spec says max=32
    assert validate_username(name) is True   # currently fails — uses < instead of <=
```

## One-past-limit probes

```python
# probe: function silently truncates instead of rejecting
def test_username_over_max_length():
    name = 'a' * 33
    with pytest.raises(ValidationError):
        validate_username(name)   # currently truncates instead of raising
```

## Zero / negative probes

```python
# probe: zero where positive expected
def test_create_user_zero_age():
    with pytest.raises(ValidationError):
        create_user(age=0)   # currently accepts 0 silently
```

## Null in assumed-populated field

```python
# probe: optional field is None at point that assumes populated
def test_get_profile_handles_null_email():
    user = User(id=1, email=None)
    profile = get_profile(user)
    assert profile.email_display == "(not provided)"   # currently: AttributeError on None.lower()
```

## Whitespace-only strings

```python
# probe: " " or "\n" or "\t" pass naive truthiness check but fail business logic
def test_create_post_whitespace_title():
    with pytest.raises(ValidationError):
        create_post(title="   ")   # currently accepts because bool("   ") == True
```

## Default-value collisions

Empty string treated as "no value" when `""` is a valid distinct value.

```python
def test_set_nickname_empty_string():
    user.set_nickname("")
    assert user.nickname == ""   # currently treats "" as None and skips update
```

## Cross-language reminders

- Python: `None`, `[]`, `{}`, `""`, `0`
- JavaScript: `null`, `undefined`, `[]`, `{}`, `""`, `0`, `NaN`
- Go: zero values — `nil` slice vs empty slice — empty `string` vs unset pointer
- Rust: `None`, `Some(default)`, empty `Vec`
- Swift: `nil`, empty `[]`, `Optional.none`
- Kotlin: `null`, empty `listOf()`

## Anti-pattern reminders

- Probe must show a concrete failure on current code. If the diff already guards against the case, don't generate a probe.
- "What if the input is malicious?" — defer to `ae-sec`.
- Numeric overflow at the *correctness* layer belongs here; at the *security* layer (e.g. integer wraparound bypassing a check) belongs to `ae-sec`.
