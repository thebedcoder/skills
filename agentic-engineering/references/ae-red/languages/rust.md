# Rust Bug Patterns

## Panic in production code

```rust
// unwrap() panics on None/Err — fine in tests, bug in production
let user = users.get(&id).unwrap()         // panic if id not in map
let value: i32 = "abc".parse().unwrap()    // panic on parse failure
let file = File::open(path).unwrap()       // panic if file doesn't exist

// Fix — use ? operator or match
let user = users.get(&id).ok_or(Error::NotFound)?
let value: i32 = "abc".parse().map_err(|e| Error::Parse(e))?
```

## Integer overflow in release builds

```rust
// Debug builds panic on overflow, release builds wrap silently
let x: u8 = 255;
let y = x + 1;   // debug: panic; release: y = 0

// Fix — use checked arithmetic for user-controlled values
let y = x.checked_add(1).ok_or(Error::Overflow)?
let y = x.saturating_add(1)   // saturates at max instead of wrapping
```

## Lifetime and borrow issues leading to incorrect logic

```rust
// Returning reference to local — compiler catches, but logic may be wrong
// Watch for: Arc<Mutex<T>> lock held too long
let data = shared.lock().unwrap();
expensive_operation();   // mutex held during expensive op — deadlock risk if
do_more_work();          // do_more_work also tries to lock shared
drop(data);              // release happens here — should drop earlier
```

## Unsafe block bugs

```rust
unsafe {
    let ptr = data.as_ptr().add(offset);   // offset not checked — OOB if offset >= len
    *ptr                                    // UB: potential OOB read
}
```
