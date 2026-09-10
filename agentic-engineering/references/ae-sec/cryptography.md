# Cryptography

## Weak Algorithms

**For security purposes, these are weak:**

| Algorithm | Issue | Use instead |
|---|---|---|
| MD5 | Broken collision resistance | SHA-256 or better |
| SHA-1 | Broken for signatures | SHA-256 or better |
| DES / 3DES | Short key, slow | AES-256 |
| RC4 | Multiple weaknesses | AES-GCM |
| ECB mode | Deterministic — leaks patterns | GCM, CBC with random IV |

**Context matters:**
```python
hashlib.md5(file_content)    # SAFE — file integrity checksum
hashlib.md5(password)        # FLAG — password storage
hashlib.sha1(commit_id)      # SAFE — git uses sha1 for IDs, not security
```

---

## Insecure Random Number Generation

```python
import random
token = random.randint(100000, 999999)         # VULNERABLE — predictable
session_id = str(random.random())              # VULNERABLE
token = ''.join(random.choices(chars, k=32))  # VULNERABLE

# Safe
import secrets
token = secrets.token_urlsafe(32)
token = secrets.token_hex(16)
otp = secrets.randbelow(1000000)
```
```javascript
Math.random()                    // VULNERABLE for security use
crypto.getRandomValues(buffer)   // Safe
crypto.randomBytes(32)           // Safe (Node.js)
```

**Key distinction:** `random` module / `Math.random()` are for simulations, not security. Any token, session ID, password reset link, CSRF token, or OTP must use `secrets` / `crypto.randomBytes`.

---

## Encryption Issues

```python
# ECB mode — leaks patterns (same plaintext = same ciphertext)
cipher = AES.new(key, AES.MODE_ECB)     # FLAG

# No authentication — malleable ciphertext (CBC without MAC)
cipher = AES.new(key, AES.MODE_CBC, iv)  # FLAG if no HMAC

# Safe — authenticated encryption
cipher = AES.new(key, AES.MODE_GCM)     # GCM provides auth
```

**Static IV:**
```python
iv = b'\x00' * 16              # VULNERABLE — static IV allows pattern analysis
iv = b'hardcodedIV12345'       # VULNERABLE

iv = os.urandom(16)            # Safe — random per encryption
```

---

## Key Management

```python
# Hardcoded key — HIGH CONFIDENCE finding
KEY = b"mysecretkey12345"
AES_KEY = "hardcoded_aes_key_here"

# Key derived from weak source
key = hashlib.md5(password.encode()).digest()  # MD5 key derivation

# Safe key derivation
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=480000)
key = kdf.derive(password.encode())
```

---

## TLS / Certificate Issues

```python
# Disabled certificate verification — HIGH CONFIDENCE
requests.get(url, verify=False)               # SSL disabled
ssl_context.check_hostname = False            # hostname not checked
ssl_context.verify_mode = ssl.CERT_NONE       # no cert verification

# Safe
requests.get(url, verify=True)                # default
requests.get(url, verify='/path/to/cert.pem') # custom CA
```
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'  // VULNERABLE — global disable
```

**High confidence:** `verify=False` or `CERT_NONE` in production code paths.

---

## JWT Cryptography

```python
# Weak secret
jwt.encode(payload, "secret", algorithm="HS256")       # trivially bruteforceable

# Algorithm confusion
jwt.decode(token, key, algorithms=["HS256", "RS256"])  # downgrade attack possible
jwt.decode(token, algorithms=["none"])                 # no signature

# Safe
jwt.decode(token, key, algorithms=["RS256"])           # pin to one algorithm
```
