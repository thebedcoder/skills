# Python Bug Patterns

## Mutable defaults — most common Python bug
```python
def func(x, data=[]):    # FLAG — shared list
def func(x, cfg={}):     # FLAG — shared dict
class Foo:
    items = []           # FLAG — shared across instances
```

## Exception handling
```python
except:                  # FLAG — catches SystemExit, KeyboardInterrupt
except Exception: pass   # FLAG — swallows all errors
result, _ = risky()      # FLAG — ignores error return
```

## Generator / iterator exhaustion
```python
gen = (x for x in range(10))
list(gen)   # exhausts generator
list(gen)   # returns [] — generator already consumed, no error!

# Same with file iterators, zip(), map(), filter()
lines = file.readlines()  # OK — list, reusable
lines = iter(file)        # one-shot — exhausted after first loop
```

## String formatting traps
```python
"%s" % value             # if value is tuple: TypeError
"%s" % (value,)          # safe — single-element tuple
"%(key)s" % data         # KeyError if 'key' missing from data
f"{undefined_var}"       # NameError
```

## Dictionary gotchas
```python
d.get('key', default_list.append(x))  # default computed eagerly even if key exists
{}.setdefault('k', []).append(x)      # OK — setdefault only stores if key absent

# Iterating and modifying
for k in d:
    del d[k]   # RuntimeError: dictionary changed size during iteration
for k in list(d.keys()):
    del d[k]   # OK — iterating over copy
```

## Number parsing
```python
int("3.14")      # ValueError — can't parse float string as int
int(float("3.14"))  # 3 — works but truncates
int("0x1F", 16)  # 31 — hex parsing needs base
int("0x1F")      # ValueError — needs base argument
```

## Datetime traps
```python
from datetime import datetime
datetime.utcnow()   # FLAG — deprecated, returns naive datetime with no timezone
datetime.now()      # FLAG — local time, no timezone info

# Fix
from datetime import datetime, timezone
datetime.now(timezone.utc)   # timezone-aware UTC

# Comparison pitfall
dt1 = datetime.now()           # naive (no tz)
dt2 = datetime.now(timezone.utc)  # aware (has tz)
dt1 < dt2   # TypeError — can't compare aware and naive
```

## Django-specific
```python
# Queryset lazy evaluation
users = User.objects.filter(active=True)   # not evaluated yet
for user in users:                          # evaluated here
    if something:
        users = users.filter(...)   # reassignment doesn't affect loop — stale

# N+1 query
for order in Order.objects.all():
    print(order.user.name)   # 1 query per order for user — use select_related

# Missing select_related / prefetch_related
orders = Order.objects.all()
for o in orders:
    _ = o.user.email   # N+1 — should be: Order.objects.select_related('user')
```

## Async Python
```python
# Coroutine not awaited
async def main():
    result = fetch_data()   # returns coroutine object, not result
    # Fix: result = await fetch_data()

# asyncio.run inside async function
async def handler():
    asyncio.run(another_coro())   # RuntimeError — can't nest event loops
    # Fix: await another_coro()

# Blocking call in async
async def handler():
    time.sleep(1)              # blocks event loop
    requests.get(url)          # blocking HTTP
    # Fix: await asyncio.sleep(1) and use aiohttp
```
