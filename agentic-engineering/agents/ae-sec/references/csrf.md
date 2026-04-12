# CSRF (Cross-Site Request Forgery)

## When CSRF matters

CSRF attacks trick authenticated users into making unintended requests. It's relevant for:
- State-changing operations (POST, PUT, DELETE, PATCH)
- Cookie-based session authentication
- Actions a user is authenticated to perform

**NOT relevant for:**
- APIs using token auth in Authorization header (not cookies)
- Requests requiring credentials in body (not cookies)
- Read-only GET requests

---

## Missing CSRF Protection

```python
# Vulnerable — no CSRF token check on state-changing endpoint
@app.route('/account/delete', methods=['POST'])
@login_required
def delete_account():
    current_user.delete()   # no csrf_token check

# Safe — Django CSRF middleware (auto if using render/templates)
# Safe — Flask-WTF CSRFProtect
# Safe — check X-CSRF-Token header against session value
```

---

## Bypassing Existing CSRF Protection

**Check if CSRF validation can be bypassed:**
```python
# Vulnerable — accepts GET for state-changing operation
@app.route('/transfer', methods=['GET', 'POST'])
def transfer():
    amount = request.args.get('amount') or request.form.get('amount')
    # CSRF only checked for POST, but GET works too
```

**Token in URL** — CSRF token in URL is exposed in logs and Referer header:
```python
return redirect(f"/confirm?csrf_token={token}")  # FLAG — leaks token
```

**Same-site vs SameSite cookies:**
- `SameSite=Strict` or `SameSite=Lax` (default in modern browsers) provides CSRF protection
- `SameSite=None` without a CSRF token is vulnerable

---

## CORS misconfiguration enabling CSRF

```python
# Vulnerable — reflects Origin header
origin = request.headers.get('Origin')
response.headers['Access-Control-Allow-Origin'] = origin       # FLAG
response.headers['Access-Control-Allow-Credentials'] = 'true'  # especially with this

# Also vulnerable
response.headers['Access-Control-Allow-Origin'] = '*'
response.headers['Access-Control-Allow-Credentials'] = 'true'  # invalid combo, but check intent
```

**Impact:** `Allow-Credentials: true` with reflected origin lets attacker's site make credentialed cross-origin requests — like CSRF but also reads responses.

---

## Double Submit Cookie Pattern

If checking that cookie value equals header value:
```python
# Only safe if attacker can't set cookies on your domain
if request.cookies.get('csrf') != request.headers.get('X-CSRF-Token'):
    abort(403)
```

Vulnerable if attacker can set cookies (subdomain takeover, shared domain).
