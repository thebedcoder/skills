# Misconfiguration

## Debug Mode in Production

```python
app.run(debug=True)                    # Flask — enables debugger, allows RCE
DEBUG = True                           # Django settings
app.config['DEBUG'] = True
TESTING = True                         # production config

# Flask debugger PIN bypass is a known RCE vector
# Never run with debug=True in any externally accessible environment
```

---

## CORS Misconfiguration

```python
# Reflects any origin with credentials — HIGH CONFIDENCE
@app.after_request
def add_cors(response):
    origin = request.headers.get('Origin')
    response.headers['Access-Control-Allow-Origin'] = origin      # FLAG
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Wildcard with credentials — browsers block this, but shows intent issue
response.headers['Access-Control-Allow-Origin'] = '*'
response.headers['Access-Control-Allow-Credentials'] = 'true'    # invalid combo

# Safe — explicit allowlist
ALLOWED_ORIGINS = {'https://app.example.com', 'https://admin.example.com'}
if origin in ALLOWED_ORIGINS:
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Credentials'] = 'true'
```

---

## Security Headers Missing

Not a high-confidence finding on its own, but note if missing alongside other issues:
- `X-Frame-Options` or `Content-Security-Policy: frame-ancestors` — clickjacking
- `Content-Security-Policy` — XSS mitigation
- `Strict-Transport-Security` — HTTPS enforcement
- `X-Content-Type-Options: nosniff` — MIME sniffing

---

## Hardcoded Configuration

```python
# Database with hardcoded connection string
DATABASES = {
    'default': {
        'HOST': 'prod-db.internal',
        'PASSWORD': 'production_password_123'  # FLAG
    }
}

# Development settings in production
ALLOWED_HOSTS = ['*']          # if in production Django settings
SECRET_KEY = 'dev-secret-key'  # if clearly a dev key in production config
```

---

## Exposed Admin Interfaces

```python
# Admin endpoints accessible without additional auth or IP restriction
app.include_router(admin_router, prefix="/admin")  # no extra auth middleware

# phpMyAdmin, Django admin, etc. exposed publicly
urlpatterns = [
    path('admin/', admin.site.urls),  # no IP restriction, any internet user can reach
]
```

---

## Insecure Default Configurations

```python
# JWT secret not configured — using default
JWT_SECRET = os.getenv('JWT_SECRET', 'changeme')  # FLAG if changeme is the default
JWT_SECRET = os.getenv('JWT_SECRET', '')           # FLAG — empty secret

# Default admin credentials
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')  # FLAG
```

---

## Server Misconfiguration via Headers

```python
# Revealing server information (lower severity, but note)
response.headers['Server'] = 'Apache/2.4.1 (Ubuntu)'  # version disclosure
response.headers['X-Powered-By'] = 'Django/4.2'        # framework disclosure

# Missing HSTS
# No Strict-Transport-Security header on HTTPS responses
```
