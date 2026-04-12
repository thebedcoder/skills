# Go Security Guide

## SQL Injection

```go
// Vulnerable — string formatting
db.Query("SELECT * FROM users WHERE id = " + id)
db.Query(fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", name))

// Safe — parameterized
db.Query("SELECT * FROM users WHERE id = $1", id)
db.QueryRow("SELECT * FROM users WHERE name = $1", name)
```

---

## OS Command Injection

```go
// Vulnerable — shell interpretation
out, err := exec.Command("sh", "-c", "ls "+userInput).Output()  // FLAG
exec.Command("bash", "-c", fmt.Sprintf("grep %s /var/log/app.log", query))  // FLAG

// Safe — direct command, no shell
out, err := exec.Command("ls", userInput).Output()   // SAFE — no shell
exec.Command("grep", query, "/var/log/app.log").Output()  // SAFE
```

**Key:** Using `sh -c` or `bash -c` with user input = shell injection. Direct `exec.Command` with array args = safe.

---

## Path Traversal

```go
// Vulnerable — filepath.Join doesn't prevent traversal
path := filepath.Join("/uploads", userFilename)  // "../../../etc/passwd" still works

// Safe
cleanPath := filepath.Clean(filepath.Join("/uploads", userFilename))
if !strings.HasPrefix(cleanPath, "/uploads") {
    return errors.New("path traversal detected")
}
```

---

## Cryptography

```go
// Weak random for security purposes
math_rand.Int()           // FLAG — math/rand is predictable
rand.New(rand.NewSource(time.Now().UnixNano()))  // FLAG — seeded, predictable

// Safe
crypto_rand "crypto/rand"
bytes := make([]byte, 32)
_, err := crypto_rand.Read(bytes)

// Weak hash for security
md5.Sum(data)             // FLAG for passwords/tokens
sha1.Sum(data)            // FLAG for passwords/tokens

// Safe for passwords
import "golang.org/x/crypto/bcrypt"
bcrypt.GenerateFromPassword(password, bcrypt.DefaultCost)
```

---

## TLS Configuration

```go
// Insecure — certificate verification disabled
tr := &http.Transport{
    TLSClientConfig: &tls.Config{InsecureSkipVerify: true},  // FLAG
}

// Weak TLS version
tlsConfig := &tls.Config{
    MinVersion: tls.VersionTLS10,   // FLAG — TLS 1.0 is deprecated
}

// Safe
tlsConfig := &tls.Config{
    MinVersion: tls.VersionTLS13,   // or TLS12 minimum
}
```

---

## Template Injection (html/template vs text/template)

```go
// Vulnerable — text/template doesn't HTML-escape
import "text/template"
t := template.New("").Parse(userTemplate)  // FLAG — SSTI possible
tmpl.Execute(w, userInput)                 // FLAG if template contains user input

// Safe for HTML — auto-escapes
import "html/template"
t := template.New("").Parse("<p>{{.Name}}</p>")
t.Execute(w, data)  // SAFE — html/template auto-escapes
```

---

## HTTP Security

```go
// Missing security headers
func handler(w http.ResponseWriter, r *http.Request) {
    // No X-Frame-Options, CSP, etc.
    w.Write([]byte(userContent))  // if userContent is unescaped HTML
}

// SSRF
url := r.URL.Query().Get("target")
resp, err := http.Get(url)   // FLAG — SSRF

// Open redirect
next := r.URL.Query().Get("next")
http.Redirect(w, r, next, http.StatusFound)  // FLAG — unvalidated redirect
```

---

## Go-specific safe patterns

```go
// Timing-safe comparison
import "crypto/subtle"
subtle.ConstantTimeCompare([]byte(a), []byte(b))  // SAFE for tokens

// Safe temp files
f, err := os.CreateTemp("", "prefix-")  // SAFE — random name
os.TempDir() + "/myfile"                // FLAG — predictable name
```
