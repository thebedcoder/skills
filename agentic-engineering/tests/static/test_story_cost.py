#!/usr/bin/env python3
"""scripts/story-cost.py — a story's subagent runs found by the story id their prompt
leads with, usage counted once per message, nothing invented when data is missing."""
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT  # noqa: E402

c = Check("story cost")
TOOL = os.path.join(PLUGIN_ROOT, "scripts", "story-cost.py")

cfg = tempfile.mkdtemp()
sid = "11111111-2222-3333-4444-555555555555"
proj = os.path.join(cfg, "projects", "-tmp-fixture")
sub = os.path.join(proj, sid, "subagents")
os.makedirs(sub)
open(os.path.join(proj, f"{sid}.jsonl"), "w").write(json.dumps({"type": "user", "message": {"content": "/ship"}}) + "\n")


def agent(name, agent_type, prompt, messages):
    with open(os.path.join(sub, f"agent-{name}.jsonl"), "w") as f:
        f.write(json.dumps({"type": "user", "message": {"role": "user", "content": prompt}}) + "\n")
        for mid, model, usage, copies in messages:
            for i in range(copies):  # one message split across lines repeats its usage; only
                u = usage if i == copies - 1 else {**usage, "output_tokens": 1}  # the last is final
                f.write(json.dumps({"type": "assistant", "message": {"id": mid, "model": model, "usage": u,
                                                                     "content": [{"type": "text", "text": "x"}]}}) + "\n")
    json.dump({"agentType": agent_type}, open(os.path.join(sub, f"agent-{name}.meta.json"), "w"))


U = lambda i, o, cr=0, cw=0: {"input_tokens": i, "output_tokens": o, "cache_read_input_tokens": cr,
                              "cache_creation_input_tokens": cw}
agent("a1", "agentic-engineering:ae-arch", "mode: story\nstory: STORY-002\nparallel: yes — group STORY-002, STORY-003",
      [("m1", "claude-opus-5-5", U(10, 100, 1000, 50), 3)])
agent("a2", "agentic-engineering:ae-arch", "mode: story\nstory: STORY-003\nparallel: yes — group STORY-002, STORY-003",
      [("m2", "claude-opus-5-5", U(7, 70), 1)])
agent("a3", "agentic-engineering:ae-impl", "brief: /w/.agentic/briefs/STORY-002.md\nmode: build",
      [("m3", "claude-sonnet-5-5", U(5, 500, 2000, 100), 2), ("m4", "claude-sonnet-5-5", U(1, 50), 1)])
agent("a4", "agentic-engineering:ae-red", "Review diff .agentic/review/STORY-0021.diff",
      [("m5", "claude-sonnet-5-5", U(9, 9), 1)])
agent("a5", "agentic-engineering:ae-red", "Review diff .agentic/review/STORY-002.diff",
      [("m6", "claude-sonnet-5-5", U(3, 30), 1)])


def run(*args, env=None):
    e = {k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}
    e["CLAUDE_CONFIG_DIR"] = cfg
    e.update(env or {})
    return subprocess.run([sys.executable, TOOL, *args], capture_output=True, text=True, env=e)


p = run("STORY-002", env={"CLAUDE_CODE_SESSION_ID": sid})
out = p.stdout
c.expect(p.returncode == 0 and out.startswith("COST: STORY-002 · 3 subagent runs"),
         "finds the session from CLAUDE_CODE_SESSION_ID and keeps the 3 runs that lead with STORY-002", out)
c.expect("| ae-arch | 1 | claude-opus-5-5 | 10 | 100 | 1,000 | 50 |" in out,
         "a message over 3 lines counts once, at its final output count", out)
c.expect("| ae-impl | 1 | claude-sonnet-5-5 | 6 | 550 | 2,000 | 100 |" in out,
         "two messages of one run are summed", out)
c.expect("| ae-red | 1 |" in out and "| 3 | 30 |" in out, "the STORY-002 review counts", out)
c.expect("| 9 | 9 |" not in out, "STORY-0021 is not STORY-002", out)
c.expect("| total | 3 | — | 19 | 680 | 3,000 | 150 |" in out, "total row", out)
p = run("STORY-003", "--session", sid)
c.expect("COST: STORY-003 · 1 subagent runs" in p.stdout,
         "--session by id; a planner naming its peers counts only for its own story", p.stdout)
p = run("STORY-003", "--session", os.path.join(proj, f"{sid}.jsonl"))
c.expect("COST: STORY-003" in p.stdout, "--session by transcript path", p.stdout)
p = run("STORY-002")
c.expect(p.returncode == 0 and p.stdout.startswith("COST: unavailable — no session id"),
         "no session id → unavailable, exit 0", p.stdout)
p = run("STORY-002", "--session", "99999999-0000-0000-0000-000000000000")
c.expect(p.returncode == 0 and "COST: unavailable — no transcript" in p.stdout, "unknown session → unavailable", p.stdout)
p = run("STORY-777", "--session", sid)
c.expect(p.returncode == 0 and "COST: unavailable — no subagent run" in p.stdout, "story with no runs → unavailable", p.stdout)

# The same id under a second project dir with no subagent runs (a child session that
# inherited its parent's id): the fixture project's transcript still wins.
other = os.path.join(cfg, "projects", "-elsewhere")
os.makedirs(other)
open(os.path.join(other, f"{sid}.jsonl"), "w").write(json.dumps({"type": "user", "message": {"content": "hi"}}) + "\n")
fixture = os.path.join(tempfile.mkdtemp(), "fixture")
os.makedirs(fixture)
p = subprocess.run([sys.executable, TOOL, "STORY-002", "--session", sid], capture_output=True, text=True, cwd=fixture,
                   env={**{k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}, "CLAUDE_CONFIG_DIR": cfg})
c.expect(p.stdout.startswith("COST: STORY-002 · 3 subagent runs"),
         "an id under two project dirs → the one with subagent runs", p.stdout)
os.makedirs(os.path.join(other, sid, "subagents"))
slugged = os.path.join(cfg, "projects", __import__("re").sub(r"[^A-Za-z0-9]", "-", os.path.realpath(fixture)))
os.rename(proj, slugged)
proj = slugged
p = subprocess.run([sys.executable, TOOL, "STORY-002", "--session", sid], capture_output=True, text=True,
                   cwd=os.path.realpath(fixture),
                   env={**{k: v for k, v in os.environ.items() if k != "CLAUDE_CODE_SESSION_ID"}, "CLAUDE_CONFIG_DIR": cfg})
c.expect(p.stdout.startswith("COST: STORY-002 · 3 subagent runs"),
         "an id under two project dirs → the one slugged from the cwd", p.stdout)

c.exit()
