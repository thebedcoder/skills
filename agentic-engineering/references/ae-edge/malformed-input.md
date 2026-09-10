# Malformed Input

Adversarial probes for diff that accepts user-controlled or external input. Correctness layer — not security exploitation. Defer SQL injection / XSS / SSRF to `ae-sec`.

## Type mismatch probes

```python
# probe: function blindly trusts type of dict value
def test_calculate_total_string_amount():
    with pytest.raises(ValidationError):
        calculate_total({"amount": "5"})   # currently: TypeError unsupported * operator for str
```

```javascript
// probe: API endpoint accepts wrong type silently
test('POST /users rejects numeric name', async () => {
  const res = await client.post('/users', { name: 12345 })
  expect(res.status).toBe(400)   // currently 200 — stores number as username
})
```

## Encoding probes

```python
# probe: UTF-8 with surrogate pairs crashes serialization
def test_save_post_emoji_with_surrogate():
    post = Post(title="hello 😀 world")   # paired surrogate U+D83D U+DE00
    post.save()   # currently raises UnicodeEncodeError during db write
```

```python
# probe: NFC vs NFD normalization mismatch causes lookup miss
def test_username_lookup_normalization():
    user = User.create(username="café")   # NFC: é
    found = User.find_by_username("café")   # NFD: e + combining acute
    assert found == user   # currently returns None — strings compare unequal
```

## Oversized payload probes (correctness, not perf)

```python
# probe: 10 MB JSON body causes parser OOM in worker
def test_upload_huge_json():
    payload = '{"items":[' + ','.join(['{}'] * 1_000_000) + ']}'
    with pytest.raises(PayloadTooLarge):
        parse_request(payload)   # currently OOMs the worker — no size guard
```

## Malformed JSON probes

```python
# probe: truncated JSON exposes raw parser error to client
def test_parse_truncated_json():
    with pytest.raises(ParseError):
        parse_user('{"name": "alice"')   # currently raises JSONDecodeError with traceback in response
```

## Malformed dates / numbers / regex

```python
# probe: ISO-8601 with timezone offset that exists but is unusual
def test_parse_event_date_chatham_islands():
    parse_event_date("2026-01-15T10:30:00+12:45")   # +12:45 is real (Chatham Islands)
    # currently: ValueError — naive impl assumes hour-only offsets
```

## Mixed-case header / content-type variants

```python
# probe: case-insensitive matching missing for incoming headers
def test_request_content_type_lowercase():
    res = client.post('/api', data='{}', headers={'content-type': 'application/json'})
    assert res.status_code == 200   # currently 415 — code checks 'Content-Type' literally
```

## Leading / trailing whitespace probes

```python
# probe: email comparison fails because input has trailing space
def test_login_email_trailing_space():
    user = User.create(email="alice@example.com")
    assert authenticate("alice@example.com ", "pw") == user   # currently None — no .strip()
```

## Anti-pattern reminders

- Don't conflate malformed with security. Defer injection-class issues (SQLi, XSS, command injection) to `ae-sec`.
- Probes must show a concrete failure today on current code.
- Don't generate probes for behavior the story explicitly doesn't promise (e.g. probing for "what if input is Cyrillic" on a feature whose AC restricts to ASCII).
