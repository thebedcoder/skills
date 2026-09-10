# Logic Bugs

## Off-by-one errors

```python
# Bug — fence-post: should process n items, processes n-1 or n+1
for i in range(len(items) - 1):   # misses last item
for i in range(len(items) + 1):   # IndexError on last iteration

# Bug — slice boundary
items[1:]    # skips first item (maybe intentional?)
items[:n]    # includes items[0] through items[n-1]

# Bug — pagination
page_start = page * page_size          # page=0 starts at 0 ✓
page_start = (page - 1) * page_size   # page=1 starts at 0 ✓ — know which convention
```

---

## Wrong comparison operator

```python
# Bug — assignment in condition (Python raises SyntaxWarning but still runs)
if x = get_value():   # SyntaxError in Python 3 — but watch for:
    
# Bug — is vs ==
if x is 1000:    # identity check, not equality — may fail for large ints
if x is None:    # correct — None identity check
if x == None:    # works but style issue; is None preferred

# Bug — comparing incompatible types
if "5" > 3:   # TypeError in Python 3 (was allowed in Python 2)
```

```javascript
// Bug — = instead of == or ===
if (user = getUser()) { ... }   // assignment, always truthy if getUser() returns truthy

// Bug — loose equality with coercion (see type-data.md)
```

---

## Mutating collection while iterating

```python
# Bug — modifying list while iterating over it
for item in items:
    if should_remove(item):
        items.remove(item)   # skips items after removal

# Fix — iterate over copy
for item in items[:]:
    if should_remove(item):
        items.remove(item)
# Or: items = [i for i in items if not should_remove(i)]
```

```javascript
// Bug — modifying array during forEach
items.forEach((item, index) => {
    if (shouldRemove(item)) {
        items.splice(index, 1)   // shifts indices — skips next item
    }
})

// Fix — filter instead
const remaining = items.filter(item => !shouldRemove(item))
```

---

## Wrong logical operator

```python
# Bug — and vs or precedence
if not a or b:         # means: (not a) or b
if not (a or b):       # means: not a AND not b — different!

# Bug — short-circuit evaluation hiding effects
if check_a() or check_b():   # check_b() not called if check_a() returns True
# If check_b() has side effects, they may not happen
```

---

## String comparison bugs

```python
# Bug — case-sensitive comparison when case-insensitive needed
if username == "Admin":   # won't match "admin" or "ADMIN"
# Fix
if username.lower() == "admin":

# Bug — whitespace in comparison
if status == "active ":   # trailing space — never matches "active"
# Fix
if status.strip() == "active":
```

---

## Regex bugs

```python
import re

# Bug — re.match vs re.search
re.match(r'\d+', 'abc123')   # None — match only checks start of string
re.search(r'\d+', 'abc123')  # Match — searches anywhere in string

# Bug — greedy matching capturing too much
re.search(r'<.*>', '<a>text</a>')   # matches entire '<a>text</a>'
re.search(r'<.*?>', '<a>text</a>')  # non-greedy — matches '<a>'

# Bug — missing re.DOTALL for multiline content
re.search(r'start.*end', text)            # . doesn't match newlines
re.search(r'start.*end', text, re.DOTALL) # . matches newlines too
```

---

## Sorting / ordering bugs

```python
# Bug — sort modifies in place but also returns None
sorted_items = items.sort()   # sorted_items is None!
sorted_items = sorted(items)   # correct — returns new sorted list

# Bug — sort order dependency
# Assuming sorted items remain sorted after adding elements
# sorted list + append + access by index = likely stale sort
```

---

## Boolean logic inversion

```python
# Bug — double negative / confusing logic
if not item not in excluded_list:   # equivalent to: if item in excluded_list
    process(item)                    # confusing — are we processing excluded items?

# Bug — wrong default
def is_valid(item, strict=True):
    if not strict:
        return True   # permissive mode returns True (allow)
    # ... strict validation
# Caller passes strict=False expecting stricter — actually gets permissive
```
