# Go Testing (testing package)

## File and naming conventions

```
users/
  users.go
  users_test.go          ← same package (white-box testing)
  users_external_test.go ← _test package (black-box testing)

# Function names
func TestCreateUser(t *testing.T)            ✓
func TestCreateUser_ReturnsID(t *testing.T)  ✓
func TestCreateUser_InvalidEmail(t *testing.T) ✓
func Testcreate(t *testing.T)               ✗ — uncapitalized after Test
```

## Table-driven tests — Go idiom

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid email", "user@example.com", false},
        {"no TLD", "user@example", true},
        {"no local", "@example.com", true},
        {"empty", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("validateEmail(%q) error = %v, wantErr %v",
                    tt.email, err, tt.wantErr)
            }
        })
    }
}
```

**Flag:** single-case tests where table-driven would cover multiple scenarios more clearly.

## Subtests with t.Run

```go
// Good — subtests are independently runnable, named clearly
func TestUserService(t *testing.T) {
    t.Run("creates user with valid data", func(t *testing.T) { ... })
    t.Run("returns error on duplicate email", func(t *testing.T) { ... })
    t.Run("hashes password before saving", func(t *testing.T) { ... })
}
```

## Assertions — no built-in, use testify or manual

```go
// Manual — verbose but no dependency
if got != want {
    t.Errorf("got %v, want %v", got, want)
}
if err != nil {
    t.Fatalf("unexpected error: %v", err)  // t.Fatal stops test immediately
}

// testify — cleaner (import "github.com/stretchr/testify/assert")
assert.Equal(t, want, got)
assert.NoError(t, err)
assert.ErrorIs(t, err, ErrNotFound)
assert.Contains(t, slice, item)
require.NoError(t, err)   // require stops test on failure (like t.Fatal)
```

## Parallel tests

```go
func TestProcess(t *testing.T) {
    tests := []struct{ name, input string }{ ... }

    for _, tt := range tests {
        tt := tt   // capture range variable — required before Go 1.22
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()   // runs subtests in parallel
            result := process(tt.input)
            assert.Equal(t, expected, result)
        })
    }
}
```

**Flag:** `tt := tt` missing in parallel subtests (Go < 1.22) — all subtests
capture the same loop variable and use the last value.

## Test helpers

```go
// Helper functions — call t.Helper() so failures show caller's line
func createTestUser(t *testing.T, db *Database) *User {
    t.Helper()
    user, err := db.CreateUser(testUserData)
    require.NoError(t, err)
    return user
}
```

## Mocking and interfaces

```go
// Go testing uses interfaces for mocking — no reflection magic
type EmailSender interface {
    Send(to, subject, body string) error
}

type fakeEmailSender struct {
    sent []Email
}
func (f *fakeEmailSender) Send(to, subject, body string) error {
    f.sent = append(f.sent, Email{to, subject, body})
    return nil
}

// In test
sender := &fakeEmailSender{}
service := NewUserService(db, sender)
service.Register("alice@example.com")
assert.Len(t, sender.sent, 1)
assert.Equal(t, "alice@example.com", sender.sent[0].To)
```

## httptest for HTTP handlers

```go
func TestCreateUserHandler(t *testing.T) {
    req := httptest.NewRequest("POST", "/users",
        strings.NewReader(`{"name":"Alice"}`))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()

    handler := NewHandler(fakeDB)
    handler.ServeHTTP(rec, req)

    assert.Equal(t, http.StatusCreated, rec.Code)
    var response User
    json.Unmarshal(rec.Body.Bytes(), &response)
    assert.NotEmpty(t, response.ID)
}
```

## What to flag

- Test with no assertion (`t.Log` only, or just calling the function)
- `t.Error` instead of `t.Fatal` when test can't continue after failure
- Missing `tt := tt` in parallel subtests (pre-Go 1.22)
- Real HTTP calls without `httptest`
- `time.Sleep` in tests — use fake clock or channel synchronization
- Test file in different package from implementation without good reason
