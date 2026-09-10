# Error Handling & Information Disclosure

## Stack Traces to Users

```python
# FLAG — full exception to API response
except Exception as e:
    return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# FLAG — Django DEBUG=True in production returns HTML debug pages with code

# Safe
except Exception as e:
    logger.exception("Unexpected error processing request")
    return jsonify({"error": "Internal server error"}), 500
```

## Database Errors Exposed

```python
# FLAG — SQL error message reveals schema
except psycopg2.Error as e:
    return jsonify({"error": str(e)}), 500
    # Returns: "column 'admin_flag' does not exist"
```

## Verbose Authentication Errors

```python
# FLAG — different messages reveal user existence
if not user:
    return "User not found", 401
if not check_password(password, user.password_hash):
    return "Wrong password", 401

# Safe — same message for both
return "Invalid credentials", 401
```

## File Path Disclosure

```python
# FLAG — file path in error
except FileNotFoundError as e:
    return jsonify({"error": str(e)}), 404
    # Returns: "/var/app/data/config.py not found"
```

## Fail-Open Patterns

```python
# FLAG — error causes security check to pass
try:
    validate_token(token)
except Exception:
    pass  # validation error = skip check = authenticated!

# Safe
try:
    validate_token(token)
except Exception:
    return unauthorized()
```
