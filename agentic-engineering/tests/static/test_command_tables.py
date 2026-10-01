#!/usr/bin/env python3
"""README's command table, SKILL.md's Command → File Map and commands/ agree.

SKILL.md's map is the only thing telling the router which body to read, so it
must list every command. README's table is the user-facing list: it lists every
command except the three that /ship drives internally."""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT, SKILL_DIR  # noqa: E402

c = Check("command tables")

# Driven by /ship, not by hand (CLAUDE.md "All N commands are user-visible").
INTERNAL = {"implement", "review", "frontend"}

commands = {os.path.basename(p)[:-3] for p in glob.glob(os.path.join(PLUGIN_ROOT, "commands", "*.md"))}
bodies = {os.path.basename(p)[:-3] for p in glob.glob(os.path.join(SKILL_DIR, "commands", "*.md"))}
c.expect(commands == bodies, f"every wrapper has a body and vice versa ({len(commands)} commands)",
         f"wrapper only: {sorted(commands - bodies)}\nbody only: {sorted(bodies - commands)}")


def table_commands(text, heading):
    """First-column /command names of the first table under `heading`."""
    m = re.search(rf"^{re.escape(heading)}\s*$", text, re.M)
    if not m:
        return None
    names, in_table = [], False
    for line in text[m.end():].splitlines():
        if line.startswith("|"):
            in_table = True
            cell = line.split("|")[1].strip()
            mm = re.match(r"`/([a-z][a-z0-9-]*)", cell)
            if mm:
                names.append(mm.group(1))
        elif in_table and line.strip() and not line.startswith("|"):
            if line.startswith("#"):
                break
    return names


skill_text = open(os.path.join(SKILL_DIR, "SKILL.md"), encoding="utf-8").read()
skill_names = table_commands(skill_text, "## Command → File Map")
if skill_names is None:
    c.fail("SKILL.md has a '## Command → File Map' section")
else:
    s = set(skill_names)
    c.expect(s == commands, f"SKILL.md command map lists every command ({len(s)})",
             f"missing: {sorted(commands - s)}\nextra: {sorted(s - commands)}")
    for n in sorted(s & commands):
        if f"`commands/{n}.md`" not in skill_text:
            c.fail(f"SKILL.md map row for /{n} names commands/{n}.md")

readme = open(os.path.join(PLUGIN_ROOT, "README.md"), encoding="utf-8").read()
readme_names = table_commands(readme, "## Commands")
if readme_names is None:
    c.fail("README.md has a '## Commands' section")
else:
    r = set(readme_names)
    want = commands - INTERNAL
    c.expect(r == want, f"README command table matches commands/ minus internal ({len(r)})",
             f"missing from README: {sorted(want - r)}\nin README but no command: {sorted(r - commands)}"
             f"\ninternal listed: {sorted(r & INTERNAL)}")
    dupes = sorted({n for n in readme_names if readme_names.count(n) > 1})
    c.expect(not dupes, "README command table has no duplicate rows", str(dupes))

# The --auto list in SKILL.md (loaded by every command) and README must name exactly
# the commands whose argument hint offers --auto. It once listed /doc, which takes
# no flag, and missed /frontend and /plan-all.
auto_cmds = set()
for p in glob.glob(os.path.join(PLUGIN_ROOT, "commands", "*.md")):
    m = re.search(r"^argument-hint:\s*(.*)$", open(p, encoding="utf-8").read(), re.M)
    if m and "--auto" in m.group(1):
        auto_cmds.add(os.path.basename(p)[:-3])
for label, path, pattern in (
        ("SKILL.md", os.path.join(SKILL_DIR, "SKILL.md"), r"^Accepted by (.*?)\. Per-invocation"),
        ("README", os.path.join(PLUGIN_ROOT, "README.md"), r"^Long-running commands \((.*?)\) accept a per-invocation")):
    m = re.search(pattern, open(path, encoding="utf-8").read(), re.M)
    if not m:
        c.fail(f"{label} states which commands accept --auto")
        continue
    listed = set(re.findall(r"`/([a-z-]+)`", m.group(1)))
    c.expect(listed == auto_cmds, f"{label} --auto list matches the commands that parse it ({len(auto_cmds)})",
             f"listed but no --auto: {sorted(listed - auto_cmds)}\nmissing: {sorted(auto_cmds - listed)}")

# shared/auto-mode.md carried a third copy of that list, which went stale (it named
# /doc and missed /frontend and /plan-all) while the two pinned above were fixed.
# It points at SKILL.md instead; a list creeping back in must match too.
auto_mode = open(os.path.join(SKILL_DIR, "shared", "auto-mode.md"), encoding="utf-8").read()
m = re.search(r"^.*accept `--auto`:(.*)$", auto_mode, re.M)
if m:
    listed = set(re.findall(r"`/([a-z-]+)`", m.group(1)))
    c.expect(listed == auto_cmds, "shared/auto-mode.md --auto list matches the commands that parse it",
             f"listed but no --auto: {sorted(listed - auto_cmds)}\nmissing: {sorted(auto_cmds - listed)}")
else:
    c.expect("SKILL.md \"Auto Mode\"" in auto_mode,
             "shared/auto-mode.md defers to SKILL.md's --auto list instead of keeping its own")

claude_md = open(os.path.join(PLUGIN_ROOT, "CLAUDE.md"), encoding="utf-8").read()
for m in re.finditer(r"(?:one of|All) (\d+) command", claude_md):
    c.expect(int(m.group(1)) == len(commands),
             f"CLAUDE.md count '{m.group(0)}' matches {len(commands)} commands")

c.exit()
