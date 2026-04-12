# Cross-Site Scripting (XSS)

## Reflected XSS

User input echoed back in HTML response without escaping.

**Vulnerable:**
```python
return f"<p>Hello {request.args.get('name')}</p>"          # unescaped
return render_template_string("<p>Hello {{ name }}</p>",    # Jinja2 safe
    name=request.args.get('name'))                          # BUT:
return render_template_string(f"<p>Hello {name}</p>")      # UNSAFE — bypasses escaping
```
```javascript
res.send("<p>Hello " + req.query.name + "</p>")             // unescaped
document.innerHTML = location.search                         // DOM-based
element.innerHTML = userInput                                // DOM sink
```
```jsx
<div dangerouslySetInnerHTML={{ __html: userInput }} />     // React explicit bypass
```

**Safe:**
```python
from markupsafe import escape
return f"<p>Hello {escape(name)}</p>"
# Or use template engine auto-escaping (Jinja2 {{ var }} auto-escapes)
```
```javascript
element.textContent = userInput     // safe — not HTML
element.setAttribute("data-x", v)  // safe for attributes
```

**Key distinction:**
- `innerHTML` = dangerous (parses HTML)
- `textContent` = safe (treats as text)
- Jinja2 `{{ var }}` = safe (auto-escaped)
- Jinja2 `{{ var | safe }}` = DANGEROUS (disables escaping)

---

## Stored XSS

User input stored in DB and rendered later without escaping.

**Pattern:** Any user-submitted content (comments, names, messages) that gets rendered in HTML without escaping. More severe than reflected because it affects all viewers.

**High confidence indicators:**
- User input saved to DB, later rendered with `innerHTML` or unescaped template
- Rich text fields rendered without sanitization library (DOMPurify etc.)
- Admin panels showing user-submitted content without escaping

---

## DOM-based XSS

JavaScript reads from DOM sources and writes to dangerous sinks.

**Sources (attacker-controlled):**
- `location.hash`, `location.search`, `location.href`
- `document.referrer`, `document.URL`
- `window.name`
- `localStorage`, `sessionStorage` (if populated from URL)
- `postMessage` data

**Sinks (dangerous):**
- `innerHTML`, `outerHTML`, `insertAdjacentHTML`
- `document.write()`, `document.writeln()`
- `eval()`, `Function()`, `setTimeout(string)`, `setInterval(string)`
- `element.src` (for script elements)
- jQuery: `$()`, `.html()`, `.append()` with HTML strings

**Safe sinks:**
- `textContent`, `innerText`
- `createElement` + `appendChild`
- `setAttribute` (for non-event attributes)

---

## Context-specific escaping

Different contexts require different escaping:

| Context | Required escaping |
|---|---|
| HTML body | `&`, `<`, `>`, `"`, `'` |
| HTML attribute | Same + must be quoted |
| JavaScript string | `\`, `"`, `'`, newlines |
| URL parameter | URL encoding |
| CSS | `\` + hex |

**Tricky:** Putting user data in `<script>` blocks or event handlers (onclick="...") even with HTML escaping can still be XSS.

---

## Content Security Policy (CSP) bypass indicators

If CSP is present, check if it's bypassable:
- `unsafe-inline` — negates script CSP protection
- `unsafe-eval` — allows eval()
- Wildcard `*` in script-src
- Known CSP bypass domains in allowlist (e.g., cdnjs.cloudflare.com)
