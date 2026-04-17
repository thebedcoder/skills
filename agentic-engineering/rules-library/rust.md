---
paths:
  - "**/*.rs"
  - "Cargo.toml"
---

# Rust Rules

## Error handling
- `Result<T, E>` for fallible operations — never panic from library code
- Custom error types with `thiserror` for libraries, `anyhow` for applications
- `?` operator for propagation — avoid deep match chains
- `unwrap()` and `expect()` only in: tests, `main`, prototype code with `TODO` comment
- `expect("...")` with message explaining why panic is impossible — not `unwrap()`

## Ownership and borrowing
- Prefer borrowing over cloning — only `clone()` when necessary
- `&str` over `&String`, `&[T]` over `&Vec<T>` in function signatures
- `Cow<str>` when sometimes owned, sometimes borrowed
- Lifetimes explicit on public API — elision OK in bodies

## Async
- `tokio` for async runtime — one runtime per project
- `async fn` returning `Result` — never panic in async code
- Don't hold locks across `.await` — deadlock risk
- `Arc<Mutex<T>>` shared state — prefer message passing with channels where possible

## Types
- Newtypes for domain concepts: `struct UserId(u64)` instead of raw `u64`
- Enums for state machines — invalid states unrepresentable
- `Option<T>` for nullable — never sentinel values like `-1` or empty string
- Derive traits explicitly: `#[derive(Debug, Clone, PartialEq)]`

## Modules
- `mod.rs` or `modname.rs` — pick one convention per project
- `pub(crate)` for cross-module visibility, `pub` only for true public API
- Re-exports at crate root: `pub use internal::Thing` to hide module structure

## Testing
- Unit tests in `#[cfg(test)] mod tests { ... }` at bottom of implementation file
- Integration tests in `tests/` directory — test public API only
- `proptest` or `quickcheck` for property-based tests on parsers and data structures
- `cargo test -- --nocapture` to see println during test runs

## Performance
- `cargo bench` with criterion for benchmarks
- `Vec::with_capacity` when size is known
- Avoid `collect()` into intermediate collections — use iterator chains
- Profile before optimizing: `cargo flamegraph`

## Unsafe
- `unsafe` blocks documented with `// SAFETY:` comment explaining invariants
- Keep unsafe minimal and wrapped in safe API
- Never unsafe just for performance without benchmarks showing the win
