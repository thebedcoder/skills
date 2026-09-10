# Injection Vulnerabilities

## SQL Injection

**Vulnerable — string concatenation or interpolation:**
```python
query = "SELECT * FROM users WHERE id = " + user_id          # Python
query = f"SELECT * FROM users WHERE name = '{name}'"          # Python f-string
cursor.execute("SELECT * FROM users WHERE id = %s" % user_id) # % formatting
```
```javascript
db.query("SELECT * FROM users WHERE id = " + req.params.id)   // JS
db.query(`SELECT * FROM users WHERE name = '${name}'`)         // template literal
```
```java
stmt.execute("SELECT * FROM users WHERE id = " + userId);      // Java
```

**Safe — parameterized queries:**
```python
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
cursor.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})
```
```javascript
db.query("SELECT * FROM users WHERE id = ?", [req.params.id])
db.query("SELECT * FROM users WHERE id = $1", [userId])
```

**Tricky cases:**
- ORM `.raw()` or `.extra()` with user input → vulnerable
- ORDER BY with user input → parameterization doesn't work, need allowlist
- Table/column names from user input → must use allowlist
- LIKE with `%` in user input → parameterized but may need escaping for wildcards

**High confidence indicators:**
- User input directly in SQL string construction
- No ORM or using ORM escape hatch with user input
- Dynamic table/column names from request params

---

## OS Command Injection

**Vulnerable:**
```python
os.system("ping " + host)                    # direct
subprocess.call("ls " + path, shell=True)    # shell=True is dangerous
subprocess.Popen(f"grep {pattern} {file}", shell=True)
eval(user_input)                             # code injection
```
```javascript
exec("ls " + userInput)                     // child_process.exec
exec(`convert ${filename} output.png`)       // template literal
```

**Safe:**
```python
subprocess.call(["ping", host])              # list form, no shell
subprocess.run(["grep", pattern, file])      # shell=False (default)
```
```javascript
execFile("ls", [userDir])                   // execFile with array
spawn("grep", [pattern, file])               // spawn with array
```

**Key distinction:** `shell=True` / string commands are dangerous. Array form with explicit executable is safe.

**High confidence indicators:**
- User input concatenated into shell command string
- `shell=True` with any user-influenced variable
- Template literal in exec/system call

---

## NoSQL Injection (MongoDB)

**Vulnerable:**
```javascript
db.users.find({ username: req.body.username })  // if username = {$gt: ""}
db.users.find({ $where: `this.age > ${age}` })  // $where with user input
```

**Safe:**
```javascript
db.users.find({ username: String(req.body.username) })  // type cast
// Or use mongoose with schema validation
```

**High confidence:** User input used directly as MongoDB query object without type validation.

---

## Template Injection (SSTI)

**Vulnerable:**
```python
# Jinja2
template = Template(user_input)          # user controls template
render_template_string(user_input)       # Flask — direct SSTI
template.render(name=name)               # safe if template is static

# Jinja2 sandbox bypass attempt patterns
"{{config}}", "{{self.__class__}}"
```
```javascript
// Handlebars
Handlebars.compile(userInput)(data)      // user controls template
```

**Safe:** Pass user input as template data, never as the template itself.

**High confidence:** User input passed to template engine compile/render function directly.

---

## LDAP Injection

**Vulnerable:**
```python
ldap.search_s(base, scope, f"(uid={username})")   # user controls filter
```

**Safe:** Escape special characters: `(`, `)`, `\`, `*`, `\x00`

---

## Header Injection

**Vulnerable:**
```python
response.headers["Location"] = user_input  # if input contains \r\n
response.set_cookie("session", user_input)  # CRLF in cookie value
```

Check for `\r\n` / `%0d%0a` in values set to headers.
