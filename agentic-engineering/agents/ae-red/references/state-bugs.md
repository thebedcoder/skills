# State Bugs

## Mutable default arguments (Python)

```python
# Bug — mutable default shared across ALL calls
def add_item(item, items=[]):   # items list created ONCE at function definition
    items.append(item)
    return items

add_item(1)   # [1]
add_item(2)   # [1, 2] — not [2]!

# Fix — use None as default sentinel
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

```python
# Same bug with dict
def update_config(key, value, config={}):   # shared config dict
    config[key] = value
    return config

# Same bug with class mutable default
class MyClass:
    data = []   # class variable — shared across ALL instances!
    
    def add(self, item):
        self.data.append(item)   # modifies class variable, not instance

# Fix — instance variable in __init__
class MyClass:
    def __init__(self):
        self.data = []
```

---

## Class variable vs instance variable confusion

```python
class Counter:
    count = 0   # class variable — shared!

    def increment(self):
        self.count += 1   # creates instance variable shadowing class variable
                           # on first call, but reads from class variable first

# This is subtle — Counter.count stays 0, instance.count increments
# Usually a bug if the intent was per-instance counting
```

---

## Shared mutable state across requests (web frameworks)

```python
# Bug — module-level mutable state in Flask/Django
class AppState:
    current_user = None   # shared across ALL requests in the process!

# Bug — storing request-specific data in class-level variable
class PaymentProcessor:
    last_transaction = None   # NOT thread-safe for concurrent requests

# Fix — use request-scoped storage
from flask import g   # Flask request context
g.current_user = user

from django.utils.functional import SimpleLazyObject
# Or pass state through function parameters
```

---

## Singleton initialization order

```python
# Bug — module-level initialization that depends on config not yet loaded
DATABASE_URL = os.environ.get('DATABASE_URL')
db_pool = create_pool(DATABASE_URL)   # runs at import time — env may not be set

# Better — lazy initialization
_pool = None
def get_pool():
    global _pool
    if _pool is None:
        _pool = create_pool(os.environ['DATABASE_URL'])
    return _pool
```

---

## State mutation in immutable-seeming operations

```python
# Bug — .update() mutates in place, doesn't return new dict
config = base_config.update(overrides)   # config is None!
config = {**base_config, **overrides}    # correct

# Bug — list concatenation vs append
items = original_items
items += [new_item]   # mutates original_items! (augmented assignment on list)
items = items + [new_item]   # creates new list
```

---

## Stale cached state

```python
# Bug — cache not invalidated when underlying data changes
@cache
def get_user_permissions(user_id):
    return fetch_permissions_from_db(user_id)

# If permissions change in DB, cached value is stale
# Fix — add TTL or explicit invalidation on permission change
```

---

## Closure variable capture bug

```javascript
// Bug — all closures share same variable reference
const handlers = []
for (var i = 0; i < 5; i++) {
    handlers.push(() => console.log(i))   // all print 5
}

// Fix — use let (block-scoped) or IIFE
for (let i = 0; i < 5; i++) {
    handlers.push(() => console.log(i))   // each closure captures own i
}
```

```python
# Same issue in Python
handlers = []
for i in range(5):
    handlers.append(lambda: print(i))   # all print 4

# Fix — default argument captures value
handlers.append(lambda i=i: print(i))
```

---

## Global state in tests bleeding through

```python
# Bug — test modifies module-level state affecting other tests
def test_something():
    MyModule.config['debug'] = True   # global state
    result = MyModule.process()
    # test passes but leaves debug=True for subsequent tests

# Fix — reset state in teardown or use monkeypatch
```
