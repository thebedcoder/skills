# JavaScript / TypeScript Security Guide

## Node.js / Express

**Command injection:**
```javascript
const { exec } = require('child_process')
exec(`ls ${userInput}`)                        // FLAG — shell injection
exec('ls ' + userInput)                        // FLAG
execFile('ls', [userInput])                    // SAFE — array args, no shell

const { execSync } = require('child_process')
execSync(`git clone ${repoUrl}`)               // FLAG
```

**Path traversal:**
```javascript
const path = require('path')
const filePath = path.join(__dirname, 'uploads', userFilename)  // FLAG — traversal possible
// '../../../etc/passwd' still works with path.join

// Safe
const resolved = path.resolve('/uploads', userFilename)
if (!resolved.startsWith('/uploads')) throw new Error('Path traversal')
```

**eval and similar:**
```javascript
eval(userInput)                    // FLAG — RCE
new Function(userInput)()          // FLAG — RCE
setTimeout(userInput, 0)           // FLAG if userInput is string
setInterval(userInput, 0)          // FLAG if userInput is string
vm.runInThisContext(userInput)     // FLAG
```

**Prototype pollution:**
```javascript
Object.assign(target, JSON.parse(userInput))  // FLAG if input can contain __proto__
lodash.merge(obj, userInput)                   // FLAG in older lodash versions
```

**SQL injection (Node.js patterns):**
```javascript
db.query("SELECT * FROM users WHERE id = " + req.params.id)     // FLAG
db.query(`SELECT * FROM users WHERE name = '${name}'`)           // FLAG
db.query("SELECT * FROM users WHERE id = ?", [req.params.id])   // SAFE
pool.query("SELECT * FROM users WHERE id = $1", [userId])       // SAFE
```

---

## React / Frontend

**XSS via dangerouslySetInnerHTML:**
```jsx
<div dangerouslySetInnerHTML={{ __html: userContent }} />    // FLAG — bypass React escaping
<div dangerouslySetInnerHTML={{ __html: sanitize(content) }} />  // check sanitizer
```

**DOM-based XSS:**
```javascript
document.getElementById('output').innerHTML = userInput     // FLAG
document.write(location.search)                             // FLAG
element.outerHTML = userContent                             // FLAG
```

**Unsafe URL handling:**
```javascript
window.location = userInput                      // FLAG — javascript: protocol
element.href = userInput                         // FLAG if unvalidated
element.src = userInput                          // FLAG for script elements

// Safe — validate scheme
const url = new URL(userInput)
if (!['https:', 'http:'].includes(url.protocol)) throw new Error()
```

---

## Next.js

**Server-side injection in API routes:**
```javascript
// pages/api/user.js
export default async function handler(req, res) {
    const user = await db.query(
        `SELECT * FROM users WHERE id = ${req.query.id}`  // FLAG
    )
}
```

**SSRF in getServerSideProps:**
```javascript
export async function getServerSideProps(context) {
    const url = context.query.source
    const data = await fetch(url)   // FLAG — SSRF
}
```

**Redirect without validation:**
```javascript
res.redirect(req.query.next)        // FLAG — open redirect
```

---

## Common JS patterns to flag

**Insecure random:**
```javascript
Math.random()                        // FLAG for tokens, session IDs, OTPs
Math.floor(Math.random() * 1000000)  // FLAG for OTP generation

// Safe
crypto.randomBytes(32)
crypto.getRandomValues(new Uint8Array(32))
```

**Timing attacks:**
```javascript
if (token === storedToken)           // FLAG for security comparison
// Safe:
crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
```

**Insecure cookie options:**
```javascript
res.cookie('session', token)                          // FLAG — missing HttpOnly, Secure, SameSite
res.cookie('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
})                                                    // SAFE
```

**JWT issues:**
```javascript
jwt.verify(token, secret, { algorithms: ['none'] })   // FLAG — no signature
jwt.decode(token)                                      // FLAG — no verification
jwt.verify(token, secret)                              // check algorithm pinning
```

---

## TypeScript-specific

TypeScript types don't prevent runtime security issues:
```typescript
// Type says string, but at runtime could be object from JSON.parse
function getUser(id: string) {
    return db.query(`SELECT * FROM users WHERE id = ${id}`)  // still SQLi
}

// Assertion bypasses type safety
const input = req.body as SafeInput   // doesn't validate at runtime
```
