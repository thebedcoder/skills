# Modern Threats

## Prompt Injection / LLM Injection

When user-controlled content is included in LLM prompts in a way that can override system instructions.

```python
# Vulnerable — user input directly in system prompt or trusted position
system_prompt = f"""
You are a helpful assistant for {company_name}.
User preferences: {user_preferences}
"""

# Vulnerable — user message can contain injection
messages = [
    {"role": "system", "content": SYSTEM_PROMPT},
    {"role": "user", "content": user_message}  # "Ignore previous instructions..."
]

# Vulnerable — user input in tool/function call that affects system behavior
tool_result = f"User says: {user_input}. Based on this, update the system config."
```

**What to flag:**
- User input inserted into system prompts (before user turn)
- User input used to construct tool results that feed back as "trusted" context
- Indirect injection: user controls content that gets retrieved and included in prompts (RAG, web fetching)

**What NOT to flag (per Anthropic's guidance):**
- User input in user-turn messages (normal chatbot usage)
- Including user content in prompts where it's clearly a user message

**Impact:** Exfiltrating other users' data, bypassing safety filters, unauthorized actions on behalf of the model.

---

## WebSocket Security

```python
# Missing authentication on WebSocket upgrade
@app.websocket('/ws')
async def ws_handler(ws):
    # No auth check before accepting connection
    async for message in ws:
        process_message(message)

# Missing origin check
# Any website can connect to your WebSocket if no Origin check

# Safe
@app.websocket('/ws')
async def ws_handler(ws):
    token = ws.headers.get('Authorization')
    if not validate_token(token):
        await ws.close(code=4001)
        return
    origin = ws.headers.get('Origin')
    if origin not in ALLOWED_ORIGINS:
        await ws.close(code=4003)
        return
```

**Message injection via WebSocket:**
```python
# If WebSocket messages are executed or reflected without validation
await ws.send(f"Echo: {user_message}")  # XSS if rendered in browser
eval(received_message)                  # RCE
```

---

## Supply Chain / Dependency Confusion

```python
# Private package names that could be confused with public ones
# In requirements.txt or package.json:
# my-internal-package==1.0.0    # if 'my-internal-package' exists on PyPI/npm under attacker control

# Unpinned dependencies
requests>=2.0    # allows installing any future version (including malicious ones)
# Better: requests==2.31.0 with hash pinning
```

---

## Server-Side Template Injection (SSTI) via Modern Frameworks

```python
# FastAPI / Jinja2
from jinja2 import Template
template = Template(user_controlled_string)  # RCE possible
# {{config.__class__.__init__.__globals__['os'].popen('id').read()}}

# Next.js / React SSR
dangerouslySetInnerHTML={{ __html: userContent }}  # XSS

# Handlebars triple-stache
{{{userContent}}}   # unescaped — XSS
```

---

## Insecure Postmessage

```javascript
// Vulnerable — any origin can send messages
window.addEventListener('message', (event) => {
    // No origin check
    eval(event.data)                    // FLAG — RCE
    document.innerHTML = event.data     // FLAG — XSS
    processCommand(event.data)          // FLAG — if processCommand is powerful
})

// Safe
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://trusted.example.com') return
    // process safely
})
```

---

## Prototype Pollution

```javascript
// Vulnerable — merging user input into objects without protection
function merge(target, source) {
    for (let key of Object.keys(source)) {
        if (typeof source[key] === 'object') {
            merge(target[key], source[key])   // __proto__ pollution possible
        } else {
            target[key] = source[key]
        }
    }
}

// Attacker input: {"__proto__": {"isAdmin": true}}

// Safe: check for prototype keys
if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
```

Only flag prototype pollution if it can actually lead to security impact in the specific codebase (e.g., `if (user.isAdmin)` pattern that could be polluted).
