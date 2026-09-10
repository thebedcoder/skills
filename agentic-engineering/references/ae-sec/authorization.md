# Authorization & Access Control

## Insecure Direct Object Reference (IDOR)

User accesses resources by ID without verifying ownership.

**Vulnerable:**
```python
# User changes /api/orders/1234 to /api/orders/5678 — gets another user's order
def get_order(order_id):
    return Order.objects.get(id=order_id)  # no ownership check

# Missing: Order.objects.get(id=order_id, user=request.user)
```
```javascript
app.get('/api/documents/:id', async (req, res) => {
    const doc = await Document.findById(req.params.id)  // no ownership check
    res.json(doc)
})
```

**Safe:**
```python
order = Order.objects.get(id=order_id, user=request.user)   # ownership check
order = Order.objects.get(id=order_id, org_id=request.user.org_id)  # org scoping
```

**High confidence:** Numeric or sequential IDs used to fetch resources without checking if the authenticated user owns/can access that resource.

---

## Missing Authorization Checks

Endpoints that should require authentication/authorization but don't.

**Patterns to check:**
- Admin endpoints accessible without admin role check
- Sensitive operations (delete, update, export) missing permission check
- API endpoints that check auth for GET but not POST/DELETE
- Internal endpoints exposed without network/auth protection

```python
# Vulnerable — no auth check
@app.route('/admin/delete-user', methods=['POST'])
def delete_user():
    User.objects.get(id=request.json['id']).delete()

# Safe
@app.route('/admin/delete-user', methods=['POST'])
@requires_role('admin')
def delete_user():
    ...
```

---

## Privilege Escalation

User manipulates request to gain higher privileges.

**Patterns:**
```python
# Vulnerable — user controls their own role
def update_profile(data):
    user.update(**data)  # if data can include 'role': 'admin'

# Safe — only update allowed fields
def update_profile(data):
    allowed = {'name', 'email', 'bio'}
    user.update(**{k: v for k, v in data.items() if k in allowed})
```

**Mass assignment** — accepting all request fields into model update without allowlist. Common in Rails (`.update(params)`), Django (`.update(**request.data)`).

---

## Horizontal vs Vertical Authorization

- **Horizontal:** User A accessing User B's data (IDOR)
- **Vertical:** Regular user accessing admin functionality

Both require explicit checks. Authentication ≠ Authorization.

---

## JWT / Token Vulnerabilities

```python
# Vulnerable — algorithm confusion
jwt.decode(token, key, algorithms=["HS256", "RS256"])  # attacker can switch to "none"
jwt.decode(token, options={"verify_signature": False})  # signature disabled

# Missing expiration check
payload = jwt.decode(token, key)  # check exp claim

# Vulnerable — accepting "none" algorithm
if header['alg'] == 'none':
    return payload  # skip verification
```

**High confidence:** JWT decoded without algorithm pinning, or `verify_signature=False`.

---

## Path-based Authorization Bypass

```python
# Checking path prefix but not normalized path
if request.path.startswith("/api/public/"):
    return  # skip auth

# Attacker uses: /api/admin/../public/sensitive
# After normalization: /api/public/sensitive → bypasses check

# Safe: normalize before checking
from pathlib import PurePosixPath
normalized = str(PurePosixPath(request.path))
```
