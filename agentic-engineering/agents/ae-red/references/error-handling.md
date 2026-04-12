# Error Handling Bugs

## Swallowed errors

```python
# Bug — bare except swallows everything including KeyboardInterrupt
try:
    process()
except:
    pass   # silently discards all errors

# Bug — specific exception but no logging or re-raise
try:
    result = risky_operation()
except Exception:
    result = None   # caller gets None with no indication something failed

# Fix — log at minimum
try:
    result = risky_operation()
except Exception as e:
    logger.error("risky_operation failed: %s", e)
    raise   # or return appropriate error to caller
```

```javascript
// Bug — error swallowed in catch
try {
    await riskyOperation()
} catch (e) {
    // empty catch
}

// Bug — Promise error ignored
promise.then(handleSuccess)   // no .catch()
```

```go
// Bug — error ignored with _
result, _ := riskyOperation()   // error discarded

// Bug — error returned but not checked by caller
func caller() {
    doSomething()   // returns error, not checked
}
```

---

## Wrong error propagation

```python
# Bug — raises wrong exception type, losing original context
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    raise ValueError("Invalid data")   # loses original error and location

# Fix — chain exceptions
except json.JSONDecodeError as e:
    raise ValueError("Invalid data") from e
```

```go
// Bug — error context lost
if err != nil {
    return err   // caller doesn't know WHERE this error came from
}

// Fix — wrap with context
if err != nil {
    return fmt.Errorf("loading user %d: %w", userID, err)
}
```

---

## Fail-open error handling

```python
# Bug — exception causes security/logic check to be skipped
def is_authorized(user_id, resource_id):
    try:
        return check_permission(user_id, resource_id)
    except Exception:
        return True   # BUG — error means "allow" instead of "deny"

# Fix
    except Exception:
        logger.error("Permission check failed")
        return False   # fail closed
```

---

## Return value not checked

```python
# Some functions signal failure via return value, not exception
result = some_operation()
use(result)   # but what if result is None, -1, False indicating failure?

# Flag when:
# - Function is documented to return sentinel on failure
# - Result used directly without checking
```

```c_like
# In languages where error codes are common (Go, C-style APIs)
n, err := file.Write(data)
// Bug: n < len(data) means partial write — not always checked
if err == nil && n < len(data) {
    return fmt.Errorf("partial write: %d/%d bytes", n, len(data))
}
```

---

## Exception in cleanup code

```python
# Bug — exception in finally blocks can hide original exception
try:
    process()
except ProcessError as e:
    original_error = e
    raise
finally:
    cleanup()   # if cleanup() raises, original ProcessError is lost

# Bug — context manager __exit__ raises, hiding the original
class Resource:
    def __exit__(self, *args):
        self.close()   # if this raises, original exception is replaced
```

---

## Panic/crash not recovered (Go)

```go
// Bug — goroutine panic crashes entire program
go func() {
    // panic here kills the process
    processItem(item)
}()

// Fix — recover in goroutines that must not crash the program
go func() {
    defer func() {
        if r := recover(); r != nil {
            logger.Errorf("goroutine panic: %v", r)
        }
    }()
    processItem(item)
}()
```

---

## Retry loops hiding persistent errors

```python
# Bug — infinite retry masks a broken dependency
while True:
    try:
        result = call_external_api()
        break
    except Exception:
        time.sleep(1)   # retries forever — no max attempts, no backoff

# Fix
for attempt in range(max_retries):
    try:
        result = call_external_api()
        break
    except Exception as e:
        if attempt == max_retries - 1:
            raise
        time.sleep(2 ** attempt)   # exponential backoff
```
