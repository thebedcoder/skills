"""Tiny reporter shared by the static tests. Stdlib only.

Each test file builds a Check, calls ok()/fail() per assertion, and exits with
check.exit(). Output is one line per assertion so a CI log reads top to bottom.
"""
import os
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SKILL_DIR = os.path.join(PLUGIN_ROOT, "skills", "agentic-engineering")

# Directories whose content ships to users through the marketplace install.
SHIPPED_DIRS = [
    "skills", "agents", "commands", "hooks", "scripts", "references",
    "capture-tools", "rules-library", "adapters",
]


class Check:
    def __init__(self, name):
        self.name = name
        self.failures = 0
        self.passes = 0
        print(f"--- {name}")

    def ok(self, msg):
        self.passes += 1
        print(f"  [PASS] {msg}")

    def fail(self, msg, detail=None):
        self.failures += 1
        print(f"  [FAIL] {msg}")
        if detail:
            for line in str(detail).splitlines():
                print(f"         {line}")

    def expect(self, cond, msg, detail=None):
        (self.ok if cond else lambda m: self.fail(m, detail))(msg)

    def exit(self):
        status = "PASSED" if self.failures == 0 else f"FAILED ({self.failures})"
        print(f"  {self.name}: {self.passes} passed, {self.failures} failed — {status}")
        sys.exit(0 if self.failures == 0 else 1)


def shipped_files(exts=(".md", ".sh", ".json", ".py", ".template")):
    for d in SHIPPED_DIRS:
        base = os.path.join(PLUGIN_ROOT, d)
        for root, _dirs, files in os.walk(base):
            for f in sorted(files):
                if f.endswith(exts) or f in ("session-start",):
                    yield os.path.join(root, f)
    for f in ("agentic-statusline.sh",):
        p = os.path.join(PLUGIN_ROOT, f)
        if os.path.exists(p):
            yield p


def rel(path):
    return os.path.relpath(path, PLUGIN_ROOT)
