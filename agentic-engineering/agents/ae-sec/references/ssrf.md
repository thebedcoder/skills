# Server-Side Request Forgery (SSRF)

## What is SSRF

The server makes HTTP requests to a URL controlled by the attacker, allowing them to reach internal services, cloud metadata endpoints, or bypass firewall rules.

**Only flag if the attacker can control the HOST or PROTOCOL, not just the path.**

## Vulnerable patterns

```python
# Attacker controls full URL
url = request.args.get('url')
response = requests.get(url)          # FLAG — full URL from user

# Attacker controls host part
host = request.json.get('webhook_url')
requests.post(f"https://{host}/notify", data=payload)  # FLAG

# Attacker controls domain in format string
domain = request.args.get('domain')
requests.get(f"http://{domain}/api/data")  # FLAG
```

**NOT a finding (path-only SSRF):**
```python
# Attacker only controls path — server controls host
base_url = settings.INTERNAL_API_URL    # server-controlled host
path = request.args.get('endpoint')     # user-controlled path
response = requests.get(f"{base_url}/{path}")  # path-only, not SSRF
```

---

## High-value SSRF targets

If SSRF is confirmed, these are the most impactful targets:
- `http://169.254.169.254/` — AWS/GCP/Azure metadata service (IAM credentials)
- `http://metadata.google.internal/` — GCP metadata
- `http://localhost:port/` — internal services
- `file:///` — local file read (if file:// protocol allowed)
- `http://[::1]/` — IPv6 localhost bypass
- `http://0.0.0.0/` — another localhost representation

---

## SSRF via Redirects

```python
# Vulnerable — follows redirects without checking final destination
requests.get(user_url, allow_redirects=True)  # may redirect to 169.254.169.254
```

**Safe:** Validate URL before fetching AND after resolving any redirects, or disable redirect following.

---

## DNS Rebinding

Even with IP allowlist validation, DNS rebinding can bypass it:
1. Validation checks IP → resolves to allowed IP
2. DNS TTL expires, re-resolves to internal IP
3. Request hits internal service

True fix: Re-resolve and re-check IP immediately before the request, or use allowlist of specific allowed hostnames.

---

## SSRF Prevention checklist

When reviewing SSRF mitigations, check:
- Is the URL validated against an allowlist (not just blocklist)?
- Is the scheme restricted to `https://` only?
- Are redirects followed without re-validation?
- Is DNS re-resolution done at request time (not just validation time)?
- Are private IP ranges blocked (10.x, 172.16.x, 192.168.x, 169.254.x, ::1)?
