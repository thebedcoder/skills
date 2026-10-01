#!/usr/bin/env python3
"""Every wrapper command, agent and the router SKILL.md has valid frontmatter
with the keys Claude Code needs. A malformed block is dropped silently at load
time — the command or agent simply is not there."""
import glob
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT, SKILL_DIR, rel  # noqa: E402
import frontmatter  # noqa: E402

c = Check("frontmatter")

WRAPPER_KEYS = {"description", "argument-hint", "context", "allowed-tools", "model",
                "disable-model-invocation"}
AGENT_KEYS = {"name", "description", "model", "tools", "color"}
READ_ONLY_AGENTS = {"ae-red", "ae-req", "ae-test", "ae-doc", "ae-sec", "ae-edge", "ae-lean", "ae-ux"}
MODEL_RE = re.compile(r"^(inherit|sonnet|opus|haiku|fable|claude-[a-z0-9.-]+)$")
# Agents name a tier, never a pinned id. A pinned id freezes the agent on that model
# after the tier moves on (claude-sonnet-5 kept the reviewers off Sonnet 5.5), and a
# first-party id may not resolve on Bedrock or Vertex; the alias resolves per provider.
AGENT_MODEL_RE = re.compile(r"^(inherit|sonnet|opus|haiku|fable)$")

# --- wrappers -----------------------------------------------------------------
for path in sorted(glob.glob(os.path.join(PLUGIN_ROOT, "commands", "*.md"))):
    name = os.path.basename(path)[:-3]
    text = open(path, encoding="utf-8").read()
    data, err = frontmatter.parse(text)
    if err or data is None:
        c.fail(f"{rel(path)}: frontmatter invalid", err or "missing")
        continue
    problems = []
    if not isinstance(data.get("description"), str) or not data["description"].strip():
        problems.append("description missing or not a string")
    for k, v in data.items():
        if k not in WRAPPER_KEYS:
            problems.append(f"unknown key {k!r}")
        elif k in ("argument-hint", "description", "context") and not isinstance(v, str):
            problems.append(f"{k} is {type(v).__name__}, not a string — quote it")
    if data.get("context") not in (None, "fork"):
        problems.append(f"context: {data.get('context')!r} (only 'fork' is meaningful)")
    target = f"${{CLAUDE_PLUGIN_ROOT}}/skills/agentic-engineering/commands/{name}.md"
    if target not in text:
        problems.append(f"body does not point at {target}")
    if "$ARGUMENTS" not in text:
        problems.append("body does not forward $ARGUMENTS")
    if not os.path.isfile(os.path.join(SKILL_DIR, "commands", f"{name}.md")):
        problems.append("no real command body behind this wrapper")
    c.expect(not problems, f"{rel(path)}", "\n".join(problems))

# --- agents -------------------------------------------------------------------
agent_files = sorted(glob.glob(os.path.join(PLUGIN_ROOT, "agents", "*")))
for path in agent_files:
    if os.path.isdir(path) or not path.endswith(".md"):
        c.fail(f"{rel(path)}: agents/ must hold only flat <name>.md files")
        continue
    stem = os.path.basename(path)[:-3]
    data, err = frontmatter.parse(open(path, encoding="utf-8").read())
    if err or data is None:
        c.fail(f"{rel(path)}: frontmatter invalid", err or "missing")
        continue
    problems = []
    if data.get("name") != stem:
        problems.append(f"name: {data.get('name')!r} must equal file stem {stem!r}")
    for k in ("description", "model", "tools"):
        if not data.get(k):
            problems.append(f"{k} missing")
    for k in data:
        if k not in AGENT_KEYS:
            problems.append(f"unknown key {k!r}")
    if data.get("model") and not AGENT_MODEL_RE.match(str(data["model"])):
        problems.append(f"model {data['model']!r} is pinned — use a tier alias (sonnet, haiku, opus, inherit)")
    tools = [t.strip() for t in str(data.get("tools", "")).split(",")]
    if stem in READ_ONLY_AGENTS and any(t.startswith("Bash") for t in tools):
        problems.append("reviewer declares Bash — Bash(...) patterns are not honoured as a restriction")
    if stem in READ_ONLY_AGENTS and any(t in ("Write", "Edit", "NotebookEdit") for t in tools):
        problems.append("reviewer declares a write tool")
    c.expect(not problems, f"{rel(path)}", "\n".join(problems))

c.expect(len([p for p in agent_files if p.endswith(".md")]) == 9,
         "exactly nine agents ship", f"found {len(agent_files)}")

# --- router SKILL.md ----------------------------------------------------------
skill = os.path.join(SKILL_DIR, "SKILL.md")
text = open(skill, encoding="utf-8").read()
data, err = frontmatter.parse(text)
if err or data is None:
    c.fail("SKILL.md frontmatter invalid", err)
else:
    c.expect(data.get("name") == "agentic-engineering", "SKILL.md name is agentic-engineering")
    n = frontmatter.folded_len(data.get("description", ""))
    c.expect(0 < n <= 1024, f"SKILL.md description within 1024 chars ({n})")
    c.expect("user-invocable" not in data, "SKILL.md has no user-invocable (packager rejects it)")

# --- command bodies carry no frontmatter of their own -------------------------
for path in sorted(glob.glob(os.path.join(SKILL_DIR, "commands", "*.md"))):
    body = open(path, encoding="utf-8").read()
    if body.startswith("---\n"):
        data, err = frontmatter.parse(body)
        c.expect(err is None, f"{rel(path)}: frontmatter parses", err)

c.exit()
