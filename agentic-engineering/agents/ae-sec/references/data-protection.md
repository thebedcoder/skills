# Data Protection & Secrets Exposure

## Secrets in Code

**High confidence — flag these:**
```python
AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
STRIPE_SECRET = "sk_live_abc123..."
DATABASE_URL = "postgresql://user:password@host/db"
GITHUB_TOKEN = "ghp_abc123..."
OPENAI_API_KEY = "sk-abc123..."
password = "P@ssw0rd123"
```

**Not a finding:**
```python
SECRET_KEY = os.environ.get('SECRET_KEY')       # loaded from env
API_KEY = settings.STRIPE_API_KEY               # loaded from config
password = ""                                   # placeholder
# TODO: add real key here                       # comment placeholder
```

**Patterns that suggest real secrets:**
- Long random-looking strings (>20 chars of mixed alphanumeric)
- Provider-specific prefixes: `sk-`, `ghp_`, `xoxb-`, `AKIA`
- Base64-encoded blobs in config
- Connection strings with embedded passwords

---

## Sensitive Data in Logs

```python
# Vulnerable — logs PII or secrets
logger.info(f"User login: {request.body}")      # may contain password
logger.debug(f"API response: {response.text}")  # may contain tokens
print(f"Auth token: {token}")                   # logs secrets
logger.info(f"Processing payment: {card_number}")
```

**What NOT to flag:**
- Logging URLs (URLs are assumed safe)
- Logging UUIDs
- Logging request method and path (without body)
- Logging error messages (without sensitive data)

**High confidence:** Logging passwords, API keys, full request bodies containing credentials, card numbers, SSNs.

---

## PII Exposure

- Returning full user objects with sensitive fields to API clients
- Including PII in error messages returned to users
- Storing PII in places with insufficient access control
- PII in URL parameters (logged by servers, proxies, browsers)

```python
# Vulnerable — returns too much
return jsonify(user.__dict__)          # includes password_hash, SSN, etc.

# Safe — explicit serialization
return jsonify({
    'id': user.id,
    'name': user.name,
    'email': user.email
})
```

---

## Sensitive Data in URLs

```python
# Vulnerable — token in URL query string (logged everywhere)
redirect_url = f"/reset?token={token}"
return redirect(f"/api/export?api_key={api_key}")

# Safe — token in POST body or header
```

---

## Insecure Direct Storage

```python
# Storing raw passwords (should be hashed)
user.password = request.form['password']      # plaintext storage

# Storing sensitive data unencrypted where encryption is expected
user.ssn = ssn                                # should be encrypted at rest
user.credit_card = cc_number                  # PCI DSS violation
```

---

## Information Disclosure in Errors

```python
# Verbose error to user — leaks stack trace, DB schema, file paths
except Exception as e:
    return jsonify({"error": str(e), "traceback": traceback.format_exc()})

# Safe
except Exception as e:
    logger.exception("Unexpected error")
    return jsonify({"error": "An unexpected error occurred"}), 500
```

**High confidence:** Stack traces, SQL errors, file paths, internal IPs returned to API clients in production code.
