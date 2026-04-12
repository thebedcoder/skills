# Business Logic Vulnerabilities

## Race Conditions (TOCTOU)

Only flag if concretely exploitable — two requests in parallel can cause real impact.

```python
# Vulnerable — check then act pattern
def withdraw(user_id, amount):
    balance = get_balance(user_id)      # READ
    if balance >= amount:               # CHECK
        time.sleep(0)                   # window for race
        deduct_balance(user_id, amount) # ACT — double-spend possible
        return True

# Concurrent withdrawals can both pass the balance check

# Safe — atomic operation
def withdraw(user_id, amount):
    # SQL: UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?
    rows_affected = db.execute(
        "UPDATE accounts SET balance = balance - %s WHERE id = %s AND balance >= %s",
        (amount, user_id, amount)
    )
    return rows_affected > 0  # atomic check-and-update
```

**High confidence TOCTOU patterns:**
- Financial transactions without atomic DB operations
- File existence check then use (TOCTOU on filesystem)
- Token validity check then use in separate operations

---

## Numeric Issues

```python
# Integer overflow in financial calculations (Python ints don't overflow, but others do)

# Price/quantity manipulation
discount = request.json.get('discount_percent')
if discount < 0:
    raise ValueError("Invalid discount")
# Attacker passes: discount = -50 → negative price? 
# Check: what happens if discount > 100?

# Floating point precision
0.1 + 0.2 != 0.3   # financial calculations should use Decimal, not float
price = float(request.json.get('price'))  # FLAG for financial — use Decimal
from decimal import Decimal
price = Decimal(str(request.json.get('price')))  # SAFE
```

---

## Workflow Bypass

```python
# Vulnerable — skipping required steps
def purchase(user_id, item_id):
    # Missing: check if user has verified email
    # Missing: check if item is in stock
    # Missing: check if user is not banned
    charge_user(user_id)
    ship_item(item_id)

# State machine violation
def process_order(order_id, new_status):
    order.status = new_status  # allows jumping from 'new' to 'shipped' skipping 'paid'
    # Should validate: is this transition allowed from current state?
```

---

## Mass Assignment (Business Logic)

```python
# User updates their own profile but can set admin=True
user.update(**request.json)  # FLAG — see authorization.md for mass assignment

# Price manipulation — client sends price
order = Order(
    item_id=request.json['item_id'],
    price=request.json['price'],    # FLAG — price from client, not DB
    quantity=request.json['quantity']
)
# Server should look up price from DB, not trust client
```

---

## Insecure Direct Object Reference in Workflows

```python
# User can complete someone else's payment
def confirm_payment(payment_id):
    payment = Payment.objects.get(id=payment_id)  # no ownership check
    payment.status = 'confirmed'
    payment.save()
    # Should be: Payment.objects.get(id=payment_id, user=request.user)
```
