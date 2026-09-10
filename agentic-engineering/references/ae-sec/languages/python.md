# Python Security Guide

## Framework-specific patterns

### Django

**SQL injection via ORM escape hatches:**
```python
User.objects.raw("SELECT * FROM users WHERE name = '%s'" % name)  # FLAG
User.objects.extra(where=[f"name = '{name}'"])                     # FLAG
User.objects.filter(name__contains=name)                           # SAFE — ORM
```

**Template injection:**
```python
from django.template import Template, Context
t = Template(user_input)                    # FLAG — user controls template
render_to_string(template_name, context)    # SAFE — template name from server
```

**CSRF:**
- Django middleware provides CSRF protection by default
- `@csrf_exempt` decorator disables it — flag if on state-changing endpoints
- `{% csrf_token %}` must be in forms

**Mass assignment:**
```python
user = UserForm(request.POST)    # SAFE if form has explicit fields
User.objects.create(**request.POST.dict())  # FLAG — mass assignment
user.__dict__.update(request.POST.dict())   # FLAG
```

**Debug mode:**
```python
DEBUG = True   # FLAG in production settings
```

**ALLOWED_HOSTS:**
```python
ALLOWED_HOSTS = ['*']   # FLAG in production (host header injection)
```

---

### Flask

**Debug mode:**
```python
app.run(debug=True)              # FLAG — enables debugger (RCE via PIN bypass)
app.config['DEBUG'] = True       # FLAG
```

**Secret key:**
```python
app.secret_key = 'dev'           # FLAG — weak/hardcoded
app.secret_key = 'changeme'      # FLAG
app.secret_key = ''              # FLAG — empty
```

**SSTI via render_template_string:**
```python
render_template_string(user_input)                    # FLAG — SSTI
render_template_string("<p>{{ name }}</p>", name=n)   # SAFE — user input as data
render_template_string(f"<p>{user_input}</p>")        # FLAG — bypasses escaping
```

---

### FastAPI / Pydantic

**Open redirect via Response:**
```python
return RedirectResponse(url=request.query_params.get('next'))  # FLAG — unvalidated redirect
```

**SQL injection with SQLAlchemy:**
```python
db.execute(f"SELECT * FROM users WHERE name = '{name}'")  # FLAG
db.execute(text(f"...{name}..."))                          # FLAG
db.execute(text("... :name"), {"name": name})              # SAFE
```

---

## Python-specific vulnerabilities

**Pickle deserialization:**
```python
import pickle
data = pickle.loads(request.data)            # FLAG — RCE
data = pickle.loads(base64.b64decode(input)) # FLAG
```

**YAML unsafe load:**
```python
import yaml
yaml.load(data)                  # FLAG — executes Python constructors
yaml.safe_load(data)             # SAFE
yaml.load(data, Loader=yaml.SafeLoader)  # SAFE
```

**eval/exec with user input:**
```python
eval(user_input)        # FLAG — RCE
exec(user_input)        # FLAG — RCE
compile(user_input, ...) # FLAG
__import__(user_input)  # FLAG
```

**subprocess with shell=True:**
```python
subprocess.call(f"ls {user_dir}", shell=True)   # FLAG
subprocess.call(["ls", user_dir])               # SAFE
```

**Path traversal:**
```python
open(os.path.join(BASE, user_filename))   # FLAG — join doesn't prevent ../
# Use pathlib resolution instead (see file-security.md)
```

**XML external entities:**
```python
from lxml import etree
etree.parse(xml_input)                   # check lxml version — older versions allow XXE
etree.XMLParser(resolve_entities=True)   # FLAG — explicit XXE
```

**Timing attacks:**
```python
if token == stored_token:   # FLAG for security tokens — use hmac.compare_digest
```

---

## Safe defaults checklist

When reviewing Python code, check:
- `subprocess`: using list form (not string + `shell=True`)
- File paths: using `pathlib` resolution, not `os.path.join`
- Passwords: using `bcrypt`/`argon2`, not `hashlib`
- Tokens: using `secrets` module, not `random`
- YAML: using `safe_load`, not `load`
- XML: `resolve_entities=False`
- SQL: parameterized queries, no string formatting
