# Go Bug Patterns

## Error handling — most common Go bugs

```go
// Ignored errors — most common Go bug
result, _ := riskyOp()   // FLAG — error silently discarded

// Error checked but value used anyway
val, err := getValue()
process(val)   // Bug: val may be zero value if err != nil
if err != nil { return err }

// Fix — check before using
val, err := getValue()
if err != nil { return err }
process(val)   // safe — only reached if no error
```

## Nil pointer dereference

```go
// Nil pointer on interface
var w io.Writer   // nil interface
w.Write(data)     // panic: nil pointer dereference

// Nil pointer from function returning pointer
func getUser(id int) *User {
    // returns nil if not found
}
user := getUser(id)
name := user.Name   // panic if user is nil

// Subtle nil: typed nil is not nil interface
var p *MyType = nil
var i interface{} = p
i == nil   // FALSE — typed nil pointer is not nil interface
```

## Goroutine and channel bugs

```go
// Channel deadlock — send with no receiver
ch := make(chan int)
ch <- 1   // blocks forever

// Goroutine variable capture
for i := 0; i < 5; i++ {
    go func() {
        fmt.Println(i)   // Bug: all goroutines share same i variable
    }()
}
// Fix — pass as argument
for i := 0; i < 5; i++ {
    go func(i int) {
        fmt.Println(i)
    }(i)
}

// Closing closed channel — panic
close(ch)
close(ch)   // panic: close of closed channel

// Send on closed channel — panic
close(ch)
ch <- 1   // panic: send on closed channel
```

## Defer bugs

```go
// Defer in loop — see resource-management.md
for _, f := range files {
    defer f.Close()   // defers don't run until function exits
}

// Defer with loop variable capture
for i, v := range items {
    defer func() { fmt.Println(i, v) }()   // captures final i, v values
}

// Named return value modification by defer
func calculate() (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v", r)
            // result is also accessible here — may or may not be intentional
        }
    }()
    return compute()
}
```

## Slice gotchas

```go
// Slice shares underlying array — modification affects original
original := []int{1, 2, 3, 4, 5}
slice := original[1:3]   // [2, 3] — shares array
slice[0] = 99            // original is now [1, 99, 3, 4, 5]

// append may or may not create new array
a := []int{1, 2, 3}
b := a[:2]
b = append(b, 99)   // may modify a[2] if capacity allows

// Fix — copy when independence needed
safe := make([]int, len(original))
copy(safe, original)
```

## Map concurrency

```go
// Concurrent map read/write — panic in Go race detector
var cache = map[string]string{}
go func() { cache["key"] = "value" }()
go func() { _ = cache["key"] }()   // concurrent read/write = panic

// Fix — use sync.Map or sync.RWMutex
var mu sync.RWMutex
mu.Lock()
cache["key"] = "value"
mu.Unlock()
```

## Integer and type conversion

```go
// Truncation on conversion
var x int64 = 300
y := int8(x)    // y = 44 — truncated silently

// Negative index from type conversion
var n uint = 0
items[n-1]   // n-1 wraps to MaxUint — panic: index out of range
```

## Context usage

```go
// Context not propagated — cancellation has no effect
func process(ctx context.Context) {
    result := dbQuery()   // should be: dbQuery(ctx)
    // ctx cancellation doesn't cancel dbQuery
}

// Context created without cancel call — resource leak
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
// missing: defer cancel()
doWork(ctx)
```
