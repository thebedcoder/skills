# Async / Concurrency Bugs

## Unhandled promise rejection

```javascript
// Bug — rejection silently ignored
async function saveUser(data) {
    db.save(data)   // no await, no .catch()
    return { success: true }   // returns before save completes
}

// Bug — error swallowed in fire-and-forget
someAsyncOp().catch(() => {})   // error silently discarded

// Bug — missing await causes race
async function handler() {
    await db.begin()
    db.save(record)   // missing await — save may not complete before commit
    await db.commit()
}

// Fix
async function handler() {
    await db.begin()
    await db.save(record)
    await db.commit()
}
```

---

## Promise.all failure handling

```javascript
// Bug — one rejection rejects all, others may be in-flight
const [users, orders] = await Promise.all([
    getUsers(),
    getOrders()
])
// If getUsers() throws, getOrders() result is discarded — potential partial state

// When partial results are acceptable:
const results = await Promise.allSettled([getUsers(), getOrders()])
```

---

## async/await in wrong context

```javascript
// Bug — forEach doesn't wait for async callbacks
items.forEach(async (item) => {
    await processItem(item)   // forEach returns immediately
})
// All items processed concurrently, no guarantee of order or completion

// Fix — use for...of or Promise.all
for (const item of items) {
    await processItem(item)
}
// Or parallel:
await Promise.all(items.map(item => processItem(item)))
```

```python
# Bug — async function called without await
async def process():
    result = fetch_data()   # missing await — returns coroutine, not result
    return result           # returns coroutine object, not data
```

---

## Go goroutine bugs

**Goroutine leak:**
```go
// Bug — goroutine runs forever if channel is never read
go func() {
    result := expensiveOp()
    ch <- result   // blocks forever if nobody reads ch
}()
// No mechanism to cancel or drain ch

// Fix — use context for cancellation
go func() {
    select {
    case ch <- result:
    case <-ctx.Done():
        return
    }
}()
```

**Race condition on shared variable:**
```go
// Bug — concurrent writes to shared map without mutex
var cache = map[string]string{}

func setCache(k, v string) {
    cache[k] = v   // concurrent map write = panic
}

// Fix
var mu sync.RWMutex
func setCache(k, v string) {
    mu.Lock()
    defer mu.Unlock()
    cache[k] = v
}
```

**WaitGroup counter wrong:**
```go
// Bug — Add called inside goroutine (race with Wait)
var wg sync.WaitGroup
for _, item := range items {
    go func(item Item) {
        wg.Add(1)   // Bug: Add called after goroutine starts
        defer wg.Done()
        process(item)
    }(item)
}
wg.Wait()   // may return before all goroutines start

// Fix — Add before starting goroutine
for _, item := range items {
    wg.Add(1)
    go func(item Item) {
        defer wg.Done()
        process(item)
    }(item)
}
```

---

## Deadlock patterns

```go
// Bug — channel send blocks waiting for receiver that never comes
ch := make(chan int)  // unbuffered
ch <- 1              // blocks forever — no goroutine reading

// Bug — mutex locked twice
mu.Lock()
doSomething()        // if doSomething() also calls mu.Lock() → deadlock
mu.Unlock()

// Bug — acquiring locks in inconsistent order
// goroutine 1: lock A then B
// goroutine 2: lock B then A
// → deadlock when both run concurrently
```

---

## Python asyncio bugs

```python
# Bug — blocking call in async function
async def handler():
    time.sleep(1)          # blocks the event loop
    data = requests.get(url)  # blocking HTTP — use aiohttp

# Bug — create_task result not stored (garbage collected)
async def run():
    asyncio.create_task(background_work())  # task may be GC'd before completion
    # Fix: store reference
    task = asyncio.create_task(background_work())
    await task
```

---

## Thread safety on shared mutable state

```python
# Bug — class variable shared across threads/requests
class RequestHandler:
    results = []   # shared across ALL instances → race condition in threaded server

    def handle(self, data):
        self.results.append(data)   # concurrent append = data corruption

# Fix — instance variable
class RequestHandler:
    def __init__(self):
        self.results = []
```
