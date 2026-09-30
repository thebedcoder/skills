#!/usr/bin/env python3
"""Every path and dispatch name that shipped content points at resolves.

A dangling ${CLAUDE_PLUGIN_ROOT}/… path fails silently at runtime: the agent
reads nothing and carries on. A dangling agentic-engineering:ae-* name is worse —
the dispatch errors, and the main model role-plays the reviewer inline."""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT, SKILL_DIR, rel, shipped_files  # noqa: E402

c = Check("references")

ROOT_RE = re.compile(r"\$\{CLAUDE_PLUGIN_ROOT\}/([A-Za-z0-9_./-]*)")
NAME_RE = re.compile(r"(?<![A-Za-z0-9_-])agentic-engineering:([a-z][a-z0-9-]*)")
# Bare skill-relative references inside command bodies, SKILL.md and shared blocks.
SKILL_REL_RE = re.compile(r"(?<![A-Za-z0-9_./{}-])((?:commands|shared)/[a-z0-9-]+\.md)")
AGENT_REL_RE = re.compile(r"(?<![A-Za-z0-9_./{}-])(agents/ae-[a-z]+\.md)")
ADAPTER_MARKERS = {"start", "end"}

agents = {os.path.basename(p)[:-3] for p in glob.glob(os.path.join(PLUGIN_ROOT, "agents", "*.md"))}
commands = {os.path.basename(p)[:-3] for p in glob.glob(os.path.join(PLUGIN_ROOT, "commands", "*.md"))}

bad_paths, bad_names, bad_rel = [], [], []
checked_paths = checked_names = checked_rel = 0

for path in shipped_files():
    text = open(path, encoding="utf-8", errors="replace").read()
    for n, line in enumerate(text.splitlines(), 1):
        for m in ROOT_RE.finditer(line):
            target = m.group(1).rstrip(".,;:)`'\"")
            checked_paths += 1
            if not os.path.exists(os.path.join(PLUGIN_ROOT, target)):
                bad_paths.append(f"{rel(path)}:{n} → ${{CLAUDE_PLUGIN_ROOT}}/{target}")
        for m in NAME_RE.finditer(line):
            name = m.group(1)
            if name in ADAPTER_MARKERS and path.endswith(".template"):
                continue
            checked_names += 1
            if name not in agents and name not in commands and name != "agentic-engineering":
                bad_names.append(f"{rel(path)}:{n} → agentic-engineering:{name}")
        if path.startswith(SKILL_DIR):
            for m in SKILL_REL_RE.finditer(line):
                checked_rel += 1
                if not os.path.isfile(os.path.join(SKILL_DIR, m.group(1))):
                    bad_rel.append(f"{rel(path)}:{n} → {m.group(1)}")
        for m in AGENT_REL_RE.finditer(line):
            checked_rel += 1
            if not os.path.isfile(os.path.join(PLUGIN_ROOT, m.group(1))):
                bad_rel.append(f"{rel(path)}:{n} → {m.group(1)}")

c.expect(not bad_paths, f"${{CLAUDE_PLUGIN_ROOT}} paths resolve ({checked_paths} checked)", "\n".join(bad_paths))
c.expect(not bad_names, f"agentic-engineering:<name> dispatch/skill names resolve ({checked_names} checked)", "\n".join(bad_names))
c.expect(not bad_rel, f"commands/, shared/, agents/ relative references resolve ({checked_rel} checked)", "\n".join(bad_rel))

# Every reviewer the batch dispatches is named with its namespace somewhere in /review.
review = open(os.path.join(SKILL_DIR, "commands", "review.md"), encoding="utf-8").read()
for a in ("ae-red", "ae-req", "ae-test", "ae-doc", "ae-sec", "ae-edge", "ae-lean"):
    c.expect(f"agentic-engineering:{a}" in review, f"/review names agentic-engineering:{a}")

c.exit()
