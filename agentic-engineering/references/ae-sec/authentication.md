# Authentication & Session Management

## Hardcoded Credentials

```python
password = "admin123"           # hardcoded password
api_key = "sk-abc123..."        # hardcoded API key
SECRET_KEY = "mysecretkey"      # hardcoded secret
JWT_SECRET = "secret"           # weak/hardcoded JWT secret
```

**High confidence:** Any string that looks like a secret, key, token, or password hardcoded in source (not in env/config loaded from environment).

**Not a finding:** Empty string placeholders like `SECRET_KEY = ""` or `os.getenv("SECRET_KEY")`.

---

## Weak Password Hashing

```python
# Vulnerable
hashlib.md5(password.encode())          # MD5 — broken
hashlib.sha1(password.encode())         # SHA1 — insufficient
hashlib.sha256(password.encode())       # SHA256 — no salt, fast — insufficient
hashlib.sha256((password + "salt").encode())  # static salt — insufficient

# Safe
import bcrypt
bcrypt.hashpw(password.encode(), bcrypt.gensalt())

from passlib.hash import argon2
argon2.hash(password)

from django.contrib.auth.hashers import make_password
make_password(password)  # uses PBKDF2 by default
```

**Key distinction:** General-purpose hash (MD5, SHA*) for passwords = vulnerable. Password-specific KDF (bcrypt, argon2, scrypt, PBKDF2) = safe.

---

## Session Fixation

```python
# Vulnerable — session ID not regenerated after login
session['user_id'] = user.id   # reuses pre-auth session ID

# Safe — regenerate session on login
session.clear()
session.regenerate()
session['user_id'] = user.id
```

---

## Insecure Session Configuration

```python
# Missing security flags
response.set_cookie('session', token)               # no HttpOnly, no Secure, no SameSite

# Secure
response.set_cookie('session', token,
    httponly=True,      # no JS access
    secure=True,        # HTTPS only
    samesite='Strict',  # CSRF protection
    max_age=3600)
```

---

## Timing Attacks on Authentication

```python
# Vulnerable — early exit leaks user existence
if user is None:
    return "Invalid credentials"
if not check_password(password, user.password_hash):
    return "Invalid credentials"

# Safe — constant time comparison
import hmac
if not hmac.compare_digest(expected, provided):
    return "Invalid credentials"
```

```python
# Vulnerable — string comparison for tokens
if token == stored_token:       # not constant time

# Safe
import secrets
if not secrets.compare_digest(token, stored_token):
```

---

## Insecure Password Reset

**Patterns to flag:**
- Reset tokens that are predictable (timestamp-based, sequential)
- Reset tokens that don't expire
- Reset tokens reusable after use
- Email enumeration (different responses for existing vs non-existing email)
- Reset links sent without token validation

```python
# Vulnerable — predictable token
import time
token = str(int(time.time()))  # easily brutable

# Safe
import secrets
token = secrets.token_urlsafe(32)
```

---

## OAuth / SSO Issues

- `state` parameter missing or not validated → CSRF on OAuth flow
- `redirect_uri` not strictly validated → open redirect after auth
- Access token stored in URL/logs → token exposure
- `id_token` not validated → accepting forged identity

```python
# Vulnerable — redirect_uri not validated
redirect_uri = request.args.get('redirect_uri')
return redirect(f"{AUTH_URL}?redirect_uri={redirect_uri}")  # arbitrary redirect

# Safe — only allow registered URIs
ALLOWED_URIS = {'https://myapp.com/callback'}
if redirect_uri not in ALLOWED_URIS:
    abort(400)
```
