# Rust Testing (cargo test)

## File and naming conventions

```rust
// Unit tests — in same file as implementation
#[cfg(test)]
mod tests {
    use super::*;   // imports from parent module

    #[test]
    fn test_create_user_returns_id() { ... }

    #[test]
    fn test_validate_email_rejects_empty() { ... }
}

// Integration tests — separate files
tests/
  integration_test.rs   ← tests crate's public API only
```

## Assertions

```rust
// Built-in macros
assert!(condition)
assert_eq!(left, right)                      // uses PartialEq
assert_ne!(left, right)
assert_eq!(left, right, "message {}", val)   // with message

// Approximate equality — no built-in, use approx crate
use approx::assert_relative_eq;
assert_relative_eq!(result, 3.14, epsilon = 1e-3);
```

## Testing errors

```rust
// Test that function returns Err
#[test]
fn test_parse_invalid_returns_error() {
    let result = parse("not a number");
    assert!(result.is_err());

    // Better — check specific error type
    assert!(matches!(result, Err(ParseError::InvalidFormat)));

    // Or unwrap_err to inspect
    let err = result.unwrap_err();
    assert_eq!(err, ParseError::InvalidFormat);
}

// Test that function panics
#[test]
#[should_panic(expected = "index out of bounds")]
fn test_out_of_bounds_panics() {
    let v = vec![1, 2, 3];
    let _ = v[10];
}
```

## Async tests — tokio

```rust
// Requires: #[tokio::test] attribute
#[tokio::test]
async fn test_fetch_user() {
    let result = fetch_user(1).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().id, 1);
}

// With timeout
#[tokio::test]
#[timeout(5000)]   // requires tokio-test or test-timeout crate
async fn test_does_not_hang() {
    let result = some_operation().await;
    assert!(result.is_ok());
}
```

## Test organization patterns

```rust
// Nested describe-style with modules
#[cfg(test)]
mod tests {
    mod create_user {
        use super::super::*;

        #[test]
        fn returns_user_with_id() { ... }

        #[test]
        fn hashes_password() { ... }
    }

    mod validate_email {
        use super::super::*;

        #[test]
        fn accepts_valid_email() { ... }

        #[test]
        fn rejects_empty_string() { ... }
    }
}
```

## Test setup patterns

```rust
// Helper returning test data
fn make_test_user() -> User {
    User {
        id: 1,
        name: "Alice".to_string(),
        email: "alice@example.com".to_string(),
    }
}

// Setup with teardown using Drop
struct TestDb {
    conn: Connection,
    name: String,
}
impl Drop for TestDb {
    fn drop(&mut self) {
        // cleanup runs when TestDb goes out of scope
        drop_test_database(&self.name);
    }
}
```

## What to flag

- `assert!(result.is_some())` where `assert_eq!(result.unwrap(), expected)` is possible
- `#[should_panic]` without `expected = "..."` — matches any panic
- Async test function without `#[tokio::test]` — compiles but doesn't run the async code
- Tests that rely on test execution order (`static mut` shared state between tests)
- `unwrap()` in test setup helpers without context — hard to debug when it fails
