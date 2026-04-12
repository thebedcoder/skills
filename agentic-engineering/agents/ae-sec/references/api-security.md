# API Security

## Mass Assignment

Accepting all request fields into model update without an explicit allowlist.

```python
# Vulnerable — Rails style
user.update(params)                    # attacker adds role=admin
user.update(request.json)             # same

# Vulnerable — Django
UserSerializer(user, data=request.data)  # if no read_only fields set

# Safe — explicit fields
user.name = request.json.get('name')
user.email = request.json.get('email')
# role and is_admin never touched from request

# Safe — DRF with read_only
class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(read_only=True)  # can't be updated via API
```

---

## Broken Object Level Authorization (BOLA/IDOR)

See `authorization.md` for details. In API context:

```
GET /api/v1/users/123/orders       → should only return user 123's orders
GET /api/v1/invoices/456           → should verify invoice 456 belongs to auth user
DELETE /api/v1/comments/789        → should verify commenter is auth user
```

---

## GraphQL Security

**Introspection in production:**
```python
# Should be disabled in production
GRAPHQL_INTROSPECTION = True   # FLAG in production config
```

**Batch query attacks / DoS:**
```python
# Vulnerable — unlimited query complexity
schema = graphene.Schema(query=Query)  # no depth/complexity limits
```

**Missing field-level authorization:**
```graphql
# Vulnerable — returns all fields including sensitive ones
type User {
    id: ID!
    email: String!
    passwordHash: String!   # should never be exposed
    internalNotes: String!  # admin-only field accessible to all
}
```

**N+1 query injection:**
```python
# Not a security issue, but mention if relevant to BOLA
```

---

## Rate Limiting / Brute Force

**Not a finding by default** (DOS excluded), but flag if:
- Login endpoint has no rate limiting AND no account lockout → credential stuffing
- Password reset has no rate limiting → can enumerate valid emails
- OTP/2FA has no rate limiting → can brute force 6-digit codes

Only flag if the attack is **concretely achievable and impactful**, not theoretical.

---

## API Key Exposure

```python
# In API responses — leaks other users' keys
return jsonify(user.dict())   # if user.api_key is included

# In error messages
return jsonify({"error": f"Invalid key: {provided_key}"})  # echoes back key

# In logs (see data-protection.md)
```

---

## Insecure Deserialization in APIs

```python
# Pickle deserialization from user input — RCE
import pickle
data = pickle.loads(request.data)   # FLAG — RCE

# YAML unsafe load
import yaml
config = yaml.load(user_input)      # FLAG — code execution
config = yaml.safe_load(user_input) # Safe

# eval of JSON-like input
eval(request.args.get('filter'))    # FLAG
```
