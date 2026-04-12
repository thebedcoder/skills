# Type & Data Bugs

## Integer overflow

```python
# Python ints don't overflow — not a concern
# But watch for overflow in fixed-width types via ctypes or numpy
import numpy as np
x = np.int8(127)
y = x + 1   # -128 — wraps silently

# Or when interfacing with C via struct
import struct
struct.pack('B', 256)   # struct.error — value out of range for B
```

```go
// Go integer overflow — wraps silently
var x int8 = 127
x++   // x == -128 — no panic, no error

// Bug in financial/size calculations
size := len(data) * itemSize   // can overflow int on 32-bit or large inputs
```

```javascript
// JavaScript number precision
Number.MAX_SAFE_INTEGER + 1 === Number.MAX_SAFE_INTEGER + 2   // true — both equal
// Use BigInt for large integers
```

---

## Float comparison

```python
# Bug — exact equality on floats
if total == 0.1 + 0.2:   # False — 0.1 + 0.2 = 0.30000000000000004
    apply_discount()

# Fix — use tolerance
import math
if math.isclose(total, 0.3, rel_tol=1e-9):
    apply_discount()
```

```javascript
0.1 + 0.2 === 0.3   // false
// Fix
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON
```

**For financial calculations:** always use `Decimal` (Python), `BigDecimal` (Java/Kotlin), or integer cents instead of float.

---

## Type coercion bugs (JavaScript)

```javascript
// Loose equality surprises
null == undefined    // true
0 == false           // true
"" == false          // true
"1" == 1             // true
[] == false          // true

// Bug — using == instead of ===
if (userId == null) { ... }   // catches both null AND undefined (may be intentional)
if (status == 0) { ... }      // matches false, "", [] too

// String/number coercion
"5" + 3      // "53" — string concatenation
"5" - 3      // 2 — numeric subtraction
+"5"         // 5 — unary + coerces to number
+""          // 0
+null        // 0
+undefined   // NaN
```

---

## NaN propagation

```javascript
// Bug — NaN silently propagates
const price = parseFloat(req.body.price)   // NaN if invalid string
const total = price * quantity              // NaN
await db.save({ total })                    // saves NaN silently

// Fix — validate before using
if (isNaN(price) || price <= 0) throw new Error("Invalid price")
```

```python
import math
value = float('nan')
if value > 0:    # False — comparisons with NaN always False
    ...
math.isnan(value)   # correct check
```

---

## String/bytes confusion

```python
# Bug — mixing str and bytes
data = b"hello"
result = data + " world"   # TypeError: can't concat str to bytes

# Bug — encoding/decoding without error handling
text = data.decode('utf-8')   # UnicodeDecodeError if invalid bytes
# Fix
text = data.decode('utf-8', errors='replace')   # or 'ignore' depending on context
```

---

## Wrong type from JSON/API

```python
# Bug — assuming type from untrusted input
user_id = request.json['id']   # could be string "123" not int 123
User.objects.get(id=user_id)   # may work due to Django coercion, or fail silently

# Bug — dict when list expected
items = response.json()   # sometimes returns {"items": [...]} not [...]
for item in items:         # TypeError: 'dict' is not iterable
```

```typescript
// TypeScript types don't prevent runtime type mismatches from JSON
const data = JSON.parse(rawString) as MyType   // cast doesn't validate at runtime
const user: User = apiResponse.data             // 'as' doesn't validate
```

---

## Division by zero

```python
# Bug — no check before division
average = total / count   # ZeroDivisionError if count is 0

# Fix
average = total / count if count else 0
```

```javascript
const rate = completed / total   // Infinity or NaN if total is 0
```

---

## Off-by-one in numeric ranges

```python
# Bug — inclusive vs exclusive range confusion
for i in range(1, n):     # 1 to n-1 — misses n
for i in range(0, n+1):   # 0 to n — includes n
items[0:n]                 # first n items — items[n] not included
```
