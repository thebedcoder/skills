# Resource Management

## Unclosed file handles

```python
# Bug — file not closed on exception
f = open(filename)
data = f.read()
process(data)   # if this raises, f.close() never called
f.close()

# Fix — context manager
with open(filename) as f:
    data = f.read()
    process(data)   # file closed even if exception raised
```

```go
// Bug — defer in loop — defers don't run until function returns
for _, path := range paths {
    f, err := os.Open(path)
    if err != nil { continue }
    defer f.Close()   // BUG — all defers pile up until loop function exits
    process(f)
}

// Fix — close explicitly or use helper function
for _, path := range paths {
    func() {
        f, err := os.Open(path)
        if err != nil { return }
        defer f.Close()   // runs when anonymous func exits, not outer func
        process(f)
    }()
}
```

---

## Database connection leaks

```python
# Bug — connection not returned to pool on exception
conn = pool.getconn()
cursor = conn.cursor()
cursor.execute(query)
result = cursor.fetchall()
pool.putconn(conn)   # never reached if exception above

# Fix
conn = pool.getconn()
try:
    cursor = conn.cursor()
    cursor.execute(query)
    result = cursor.fetchall()
finally:
    pool.putconn(conn)
```

```javascript
// Bug — client not released on error
const client = await pool.connect()
const result = await client.query(sql)   // if this throws, client leaked
client.release()

// Fix
const client = await pool.connect()
try {
    const result = await client.query(sql)
    return result
} finally {
    client.release()
}
```

---

## HTTP client / response body leaks

```go
// Bug — response body not closed (connection not returned to pool)
resp, err := http.Get(url)
if err != nil { return err }
// missing: defer resp.Body.Close()
data, _ := io.ReadAll(resp.Body)

// Fix
resp, err := http.Get(url)
if err != nil { return err }
defer resp.Body.Close()
data, err := io.ReadAll(resp.Body)
```

```python
# requests — response body consumed automatically, but:
response = requests.get(url, stream=True)
# If streaming, must consume or close:
for chunk in response.iter_content():
    process(chunk)
# Or: response.close()
```

---

## Unclosed database transactions

```python
# Bug — exception leaves transaction open
conn.execute("BEGIN")
conn.execute(update_query)
conn.execute(another_query)   # if this raises, no ROLLBACK called
conn.execute("COMMIT")

# Fix
try:
    conn.execute("BEGIN")
    conn.execute(update_query)
    conn.execute(another_query)
    conn.execute("COMMIT")
except Exception:
    conn.execute("ROLLBACK")
    raise
```

---

## Goroutine / thread leaks

```go
// Bug — goroutine blocked forever on channel with no sender
func process() {
    ch := make(chan Result)
    go func() {
        ch <- doWork()   // if doWork panics, nobody reads ch → goroutine leaked
    }()
    return <-ch
}

// Bug — ticker not stopped
ticker := time.NewTicker(time.Second)
go func() {
    for range ticker.C {
        doWork()
    }
}()
// ticker.Stop() never called — goroutine runs forever
```

---

## Memory — large allocations not released

```python
# Bug — accumulating results without bound
results = []
for item in huge_dataset:
    results.append(expensive_process(item))   # all results in memory at once
return results

# Fix — generator/streaming if caller can consume one at a time
def process_stream(dataset):
    for item in dataset:
        yield expensive_process(item)
```

```go
// Bug — bytes.Buffer grows without bound in loop
var buf bytes.Buffer
for _, item := range items {
    buf.WriteString(process(item))   // buf never reset — grows indefinitely
}
```
