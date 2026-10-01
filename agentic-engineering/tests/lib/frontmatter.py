"""Frontmatter extraction + parsing.

Uses PyYAML when it is importable (CI installs it), otherwise a strict subset
parser that accepts exactly the shapes this plugin uses: `key: scalar`,
`key: "quoted"`, and folded/literal block scalars (`>`, `>-`, `|`). A value that
YAML would read as a flow sequence or mapping (`[x] [y]`, `a: b: c`) is rejected
by both paths, so the two cannot disagree on what "valid" means.
"""
import os
import re

FM_RE = re.compile(r"\A---\n(.*?)\n---\n", re.S)


class FrontmatterError(ValueError):
    pass


def extract(text):
    m = FM_RE.match(text)
    return m.group(1) if m else None


def _subset_parse(block):
    data = {}
    lines = block.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):(?:[ \t]+(.*))?$", line)
        if not m:
            raise FrontmatterError(f"line {i + 1}: not a 'key: value' line: {line!r}")
        key, val = m.group(1), (m.group(2) or "").rstrip()
        if key in data:
            raise FrontmatterError(f"duplicate key {key!r}")
        if val in (">", ">-", ">+", "|", "|-", "|+"):
            body = []
            i += 1
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or not lines[i].strip()):
                body.append(lines[i].strip())
                i += 1
            joiner = " " if val.startswith(">") else "\n"
            data[key] = joiner.join(b for b in body if b).strip()
            continue
        if val.startswith(("'", '"')):
            q = val[0]
            if len(val) < 2 or not val.endswith(q):
                raise FrontmatterError(f"{key}: unterminated quote")
            val = val[1:-1]
        elif val.startswith(("[", "{", "&", "*", "!", "|", ">", "@", "`")):
            raise FrontmatterError(f"{key}: value starts with YAML indicator {val[0]!r}; quote it")
        elif re.search(r":\s", val) or val.endswith(":"):
            raise FrontmatterError(f"{key}: unquoted ': ' inside value; quote it")
        elif " #" in val:
            val = val.split(" #", 1)[0].rstrip()
        data[key] = val
        i += 1
    return data


def parse(text):
    """Return (dict | None, error | None). None dict + None error = no frontmatter."""
    block = extract(text)
    if block is None:
        return None, None
    yaml = None
    if os.environ.get("AE_TESTS_NO_YAML") != "1":
        try:
            import yaml  # type: ignore
        except ImportError:
            yaml = None
    if yaml is not None:
        try:
            data = yaml.safe_load(block)
        except Exception as e:  # noqa: BLE001 — any YAML error is a finding
            return None, f"YAML: {str(e).splitlines()[0]}"
        if not isinstance(data, dict):
            return None, "frontmatter is not a mapping"
        return data, None
    try:
        return _subset_parse(block), None
    except FrontmatterError as e:
        return None, str(e)


def folded_len(value):
    return len(" ".join(str(value).split()))
