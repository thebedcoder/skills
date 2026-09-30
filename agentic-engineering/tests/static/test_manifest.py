#!/usr/bin/env python3
"""plugin.json parses, carries a semver version, the marketplace lists the plugin,
CHANGELOG's top entry matches, and tests/load-manifest.json names real files."""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT  # noqa: E402

c = Check("manifest")

path = os.path.join(PLUGIN_ROOT, ".claude-plugin", "plugin.json")
try:
    manifest = json.load(open(path, encoding="utf-8"))
    c.ok(".claude-plugin/plugin.json is valid JSON")
except Exception as e:  # noqa: BLE001
    c.fail(".claude-plugin/plugin.json is valid JSON", e)
    c.exit()

c.expect(manifest.get("name") == "agentic-engineering", "plugin name is agentic-engineering")
c.expect(bool(re.match(r"^\d+\.\d+\.\d+$", str(manifest.get("version", "")))),
         f"version is semver ({manifest.get('version')})")

market = os.path.join(PLUGIN_ROOT, "..", ".claude-plugin", "marketplace.json")
if os.path.exists(market):
    data = json.load(open(market, encoding="utf-8"))
    names = [p.get("name") for p in data.get("plugins", [])]
    c.expect("agentic-engineering" in names, "marketplace.json lists agentic-engineering")

changelog = open(os.path.join(PLUGIN_ROOT, "CHANGELOG.md"), encoding="utf-8").read()
top = re.search(r"^## \[([^\]]+)\]", changelog, re.M)
c.expect(top is not None and top.group(1) in ("Unreleased", manifest.get("version")),
         f"CHANGELOG top entry is Unreleased or the manifest version ({top.group(1) if top else None})")

# tests/load-manifest.json names only files that exist (token-report static uses it).
lm = json.load(open(os.path.join(PLUGIN_ROOT, "tests", "load-manifest.json"), encoding="utf-8"))
listed = list(lm.get("always", []))
for entry in lm.get("commands", {}).values():
    listed += entry.get("main", []) + entry.get("subagents", [])
missing = sorted({f for f in listed if not os.path.isfile(os.path.join(PLUGIN_ROOT, f))})
c.expect(not missing, f"tests/load-manifest.json files exist ({len(set(listed))})", "\n".join(missing))
commands = {f[:-3] for f in os.listdir(os.path.join(PLUGIN_ROOT, "commands")) if f.endswith(".md")}
unknown = sorted(set(lm.get("commands", {})) - commands)
c.expect(not unknown, "load-manifest commands all exist", str(unknown))

c.exit()
