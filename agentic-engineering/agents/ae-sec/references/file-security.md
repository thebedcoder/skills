# File Security

## Path Traversal

User input used in file path allows reading/writing outside intended directory.

```python
# Vulnerable
filename = request.args.get('file')
with open(f"/var/uploads/{filename}") as f:  # ../../etc/passwd
    return f.read()

# Also vulnerable — join doesn't prevent traversal
path = os.path.join("/var/uploads", filename)  # still vulnerable with ../../../etc/passwd
```

**Safe:**
```python
import os
from pathlib import Path

base = Path("/var/uploads").resolve()
target = (base / filename).resolve()

# Check that resolved path is still inside base
if not str(target).startswith(str(base)):
    abort(400, "Invalid path")

with open(target) as f:
    return f.read()
```

**Key:** Always `resolve()` both paths (follows symlinks, resolves `..`) and check the resolved target starts with the resolved base.

---

## Unrestricted File Upload

```python
# Vulnerable — trusting client-provided content type
content_type = request.headers.get('Content-Type')
ext = content_type.split('/')[1]
filename = f"upload.{ext}"

# Vulnerable — trusting client filename extension
filename = request.files['file'].filename  # could be "shell.php"
save_path = f"/var/www/uploads/{filename}"

# Vulnerable — no content validation
file.save(path)  # any content accepted
```

**Risks:**
- Uploading `.php`, `.py`, `.js` → RCE if web server executes files in upload dir
- Uploading SVG with embedded JavaScript → stored XSS
- Uploading polyglot files (valid image + valid script)

**Safe approach:**
1. Re-generate filename server-side (UUID)
2. Validate content by reading file headers (magic bytes), not extension
3. Store outside webroot or use CDN/object storage
4. Serve with `Content-Disposition: attachment` to prevent execution

---

## XXE (XML External Entity)

```python
# Vulnerable — external entity processing enabled
from lxml import etree
tree = etree.parse(xml_file)  # default allows XXE in older versions

# Vulnerable — explicit
parser = etree.XMLParser(resolve_entities=True)  # FLAG

# Safe
parser = etree.XMLParser(
    resolve_entities=False,
    no_network=True
)
```
```java
// Vulnerable — default Java XML parsers
DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();

// Safe
factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
```

**Impact:** XXE can read local files (`file:///etc/passwd`), perform SSRF, or cause DoS.

---

## Zip Slip

Extracting archives without validating paths inside the zip.

```python
# Vulnerable
with zipfile.ZipFile(uploaded_zip) as zf:
    zf.extractall("/tmp/uploads/")  # ../../../etc/cron.d/evil inside zip

# Safe
with zipfile.ZipFile(uploaded_zip) as zf:
    for member in zf.infolist():
        member_path = Path("/tmp/uploads") / member.filename
        if not member_path.resolve().is_relative_to(Path("/tmp/uploads").resolve()):
            raise ValueError("Zip slip attack detected")
    zf.extractall("/tmp/uploads/")
```

---

## Symlink Attacks

```python
# Vulnerable — follows symlinks without checking
with open(user_provided_path) as f:   # path could be symlink to /etc/shadow
    content = f.read()

# Safe — check for symlinks
path = Path(user_provided_path)
if path.is_symlink():
    abort(400)
```
