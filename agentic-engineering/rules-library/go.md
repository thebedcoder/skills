---
paths:
  - "**/*.go"
---

# Go Rules

## Project structure
- Standard layout: `cmd/`, `internal/`, `pkg/`, not a flat `src/`
- `internal/` for code not importable by other modules
- `pkg/` only for truly reusable libraries — most code goes in `internal/`
- Package name matches directory — `package users` in `internal/users/`

## Error handling
- Never ignore errors with `_` — always handle or wrap
- Wrap errors with context: `fmt.Errorf("loading user %d: %w", id, err)`
- Custom error types implementing `error` interface when callers need to distinguish cases
- Check errors immediately — don't defer error checks

## Context
- First parameter of any function doing I/O, DB, or HTTP: `ctx context.Context`
- Propagate context — never create new context with `context.Background()` deep in a call stack
- `context.WithTimeout` needs matching `defer cancel()` — leaks otherwise

## Concurrency
- Goroutines must have a clear exit path — pass context for cancellation
- Channels: sender closes, never receiver — panics otherwise
- Mutex scope minimal — never hold during I/O calls
- `sync.WaitGroup.Add` before `go func()` — not inside the goroutine (race)

## Interfaces
- Accept interfaces, return structs
- Define interfaces in the package that uses them, not where the concrete type lives
- Small interfaces — one method preferred, rarely more than three
- `io.Reader`, `io.Writer` patterns reused where possible

## Testing
- Table-driven tests with `t.Run(tc.name, ...)` for clarity
- `testify/require` for setup failures that should stop the test, `testify/assert` for check assertions
- Subtests can be parallelized with `t.Parallel()` if independent
- Test files end in `_test.go`, same package for white-box, `package X_test` for black-box

## Performance
- Pre-allocate slices when size is known: `make([]T, 0, n)`
- Benchmarks for hot paths — `go test -bench`
- `pprof` before optimizing — never guess

## API design
- Exported names need godoc comments starting with the name
- `context.Context` before other params, no pointers to interfaces
- Unexport when in doubt — easier to export later than remove
