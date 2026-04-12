# Null / Nil Safety

## Unchecked dereference after nullable return

```python
user = User.objects.filter(id=user_id).first()  # returns None if not found
print(user.name)   # AttributeError: 'NoneType' has no attribute 'name'

# Fix
user = User.objects.filter(id=user_id).first()
if user is None:
    raise NotFoundError(f"User {user_id} not found")
print(user.name)
```

```javascript
const user = await db.findOne({ id: userId })  // returns null if not found
console.log(user.name)   // TypeError: Cannot read property 'name' of null

// Fix
const user = await db.findOne({ id: userId })
if (!user) throw new NotFoundError(`User ${userId} not found`)
```

```go
user, err := db.GetUser(userID)  // may return nil pointer
fmt.Println(user.Name)           // nil pointer dereference panic

// Fix — check err AND nil pointer
if err != nil { return err }
if user == nil { return ErrNotFound }
```

---

## Optional chaining used to hide real errors

```javascript
// Silent failure — returns undefined instead of throwing
const name = user?.profile?.displayName  // undefined if any step is nil
// Bug: caller expects string, gets undefined, fails silently later
```

**When to flag:** Optional chaining (`?.`) used where `null` result would cause
a silent failure downstream rather than an explicit error. Check what happens
with the result.

---

## Forced unwrap / non-null assertion on untrusted data

```swift
let name = user.profile!.name   // crash if profile is nil
let value = dict["key"]!        // crash if key missing
```

```typescript
const user = getUser(id)!   // TypeScript non-null assertion
const el = document.getElementById('btn')!   // returns null if element absent
el.addEventListener('click', handler)        // crash if el was null
```

```kotlin
val name = user?.name!!   // NPE if name is null despite ?. check
```

**Distinguish:** `!` on values from trusted internal state = acceptable.
`!` on data from external input, DB, or DOM = flag.

---

## Map/dictionary access without existence check

```python
value = data['key']         # KeyError if missing
value = data.get('key')     # None if missing — check downstream use

# Only flag .get() if None causes a bug downstream
result = data.get('multiplier') * price   # TypeError: can't multiply by None
```

```go
value := myMap[key]   // zero value if missing — no error
// Bug: zero value silently used as if the key existed
if v, ok := myMap[key]; ok {
    // use v
}
```

---

## Index out of bounds

```python
items = get_items()
first = items[0]    # IndexError if items is empty

# Fix
if not items:
    raise ValueError("No items available")
first = items[0]
```

```go
items := getItems()
first := items[0]   // index out of range panic if empty
```

```javascript
const first = items[0]   // undefined if empty — check downstream
```

---

## Nil receiver method call (Go)

```go
var user *User   // nil pointer
name := user.GetName()   // nil pointer dereference

// Fix — add nil receiver check in method
func (u *User) GetName() string {
    if u == nil { return "" }
    return u.Name
}
// Or check before calling
```
