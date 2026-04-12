# Async Testing

## The core problem

Async tests can pass for the wrong reason — the assertion runs before the async
operation completes, so it never actually tests anything.

```javascript
// Bug — test completes before async work finishes
test('saves user', () => {
    saveUser(userData)   // not awaited
    expect(db.find(userData.id)).toBeDefined()  // runs immediately, before save
})

// Fix
test('saves user', async () => {
    await saveUser(userData)
    expect(db.find(userData.id)).toBeDefined()
})
```

---

## Python asyncio

```python
# Bug — coroutine not awaited, test always passes
def test_fetch_user():
    result = fetch_user(1)   # returns coroutine, not result
    assert result is not None  # coroutine is always not None — passes trivially

# Fix — use pytest-asyncio
import pytest

@pytest.mark.asyncio
async def test_fetch_user():
    result = await fetch_user(1)
    assert result.id == 1
```

**Missing pytest-asyncio marker:**
```python
# Bug — async test not marked, runs as sync, coroutine never awaited
async def test_something():   # no @pytest.mark.asyncio
    result = await async_op()
    assert result == expected
# pytest collects it, runs it, gets a coroutine back — no assertions run
```

---

## JavaScript / Jest

```javascript
// Bug — returning promise not awaited (old pattern, easy to miss)
test('fetches data', () => {
    return fetchData().then(data => {
        expect(data).toBeDefined()
    })
    // If fetchData() rejects, test passes (rejection handled by Jest? no — depends on version)
})

// Safe — always use async/await
test('fetches data', async () => {
    const data = await fetchData()
    expect(data).toBeDefined()
})

// Bug — async test with done callback but done never called on error
test('calls callback', (done) => {
    asyncOperation((err, result) => {
        expect(result).toBe('expected')
        done()   // never reached if expect throws
        // Fix: wrap in try/catch and call done(err) on failure
    })
})
```

---

## Testing timeouts and delays

```python
# Bug — test relies on real time.sleep or asyncio.sleep
async def test_retry_logic():
    await operation_with_3s_retry()   # test takes 3+ seconds
    assert result == expected

# Fix — mock time
@pytest.mark.asyncio
async def test_retry_logic(mocker):
    mocker.patch('asyncio.sleep', return_value=None)  # instant "sleep"
    await operation_with_retry()
    assert result == expected
```

```javascript
// Jest fake timers for setTimeout/setInterval
jest.useFakeTimers()

test('retries after delay', async () => {
    const promise = operationWithRetry()
    jest.advanceTimersByTime(3000)   // fast-forward 3 seconds
    await promise
    expect(mockFn).toHaveBeenCalledTimes(2)
})
```

---

## Race conditions in tests

```python
# Bug — test order dependency via shared async state
class TestOrderService:
    @pytest.mark.asyncio
    async def test_create(self):
        self.order = await service.create(data)   # sets shared state

    @pytest.mark.asyncio
    async def test_get(self):
        result = await service.get(self.order.id)  # depends on test_create running first
        # Fails if run in isolation

# Fix — each test sets up its own state
@pytest.mark.asyncio
async def test_get_created_order():
    order = await service.create(data)    # setup within test
    result = await service.get(order.id)
    assert result.id == order.id
```

---

## Go concurrent test bugs

```go
// Bug — t.Parallel() without proper isolation
func TestProcess(t *testing.T) {
    t.Parallel()
    globalState = "modified"   // races with other parallel tests
    result := process()
    assert.Equal(t, expected, result)
}

// Fix — no shared mutable state in parallel tests
func TestProcess(t *testing.T) {
    t.Parallel()
    localState := "modified"   // local to this test
    result := processWithState(localState)
    assert.Equal(t, expected, result)
}
```
