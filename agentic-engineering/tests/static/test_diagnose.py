#!/usr/bin/env python3
"""scripts/transcript-digest.py — the deterministic half of /diagnose.

Done-when for P2-c: run against a transcript where the review agents were
dispatched one by one, it names that deviation and quotes the lines."""
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT  # noqa: E402

c = Check("diagnose digest")
TOOL = os.path.join(PLUGIN_ROOT, "scripts", "transcript-digest.py")
FIX = os.path.join(PLUGIN_ROOT, "tests", "fixtures", "transcripts")


def run(*args, env=None):
    e = dict(os.environ)
    e.update(env or {})
    return subprocess.run([sys.executable, TOOL, *args], capture_output=True, text=True, env=e)


# --- the Done-when case -------------------------------------------------------
p = run("--check", os.path.join(FIX, "review-sequential.jsonl"))
dev = [l for l in p.stdout.splitlines() if "DEVIATION dispatch" in l and "sequential" in l]
c.expect(p.returncode == 0 and dev, "sequential review: DEVIATION names sequential dispatch", p.stdout[-600:])
if dev:
    for ln in ("L14 ae-red", "L16 ae-req", "L18 ae-test", "L20 ae-doc", "L22 ae-sec", "L24 ae-edge", "L26 ae-lean"):
        if ln not in dev[0]:
            c.fail(f"deviation quotes {ln}", dev[0])
            break
    else:
        c.ok("deviation cites every reviewer's transcript line (L14 … L26)")
c.expect("7 reviewers dispatched across 7 assistant messages" in p.stdout, "deviation counts 7 reviewers across 7 messages")

for f in ("review-parallel.jsonl", "review-parallel.stream.jsonl"):
    p = run("--check", os.path.join(FIX, f))
    c.expect(p.returncode == 0 and "DEVIATION" not in p.stdout, f"{f}: batched review → no deviation", p.stdout[-400:])
    c.expect("7 agent(s)" in p.stdout, f"{f}: DISPATCH shows one 7-agent message")

p = run(os.path.join(FIX, "review-sequential.jsonl"))
c.expect("L1 /agentic-engineering:ship --auto" in p.stdout, "COMMANDS shows the typed command with its args")
c.expect("L7 Write focus.md" in p.stdout, "PLAN WRITES shows the focus.md write")
c.expect("CHECKS" not in p.stdout, "no CHECKS section without --check")


# --- synthetic edge cases -------------------------------------------------------
def write(lines):
    fd, path = tempfile.mkstemp(suffix=".jsonl")
    with os.fdopen(fd, "w") as f:
        for d in lines:
            f.write(json.dumps(d) + "\n")
    return path


def asst(mid, block, **kw):
    d = {"type": "assistant", "message": {"id": mid, "role": "assistant", "content": [block]}}
    d.update(kw)
    return d


def tool(mid, tid, name, inp, **kw):
    return asst(mid, {"type": "tool_use", "id": tid, "name": name, "input": inp}, **kw)


def result(tid, body):
    return {"type": "user", "message": {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tid, "content": body}]}}


MARK = "TOOL-RESULT-BODY-MUST-NOT-LEAK-7f3a"
bare = write([
    {"type": "user", "message": {"role": "user", "content": "<command-name>/agentic-engineering:review</command-name>"}},
    tool("m1", "t1", "Read", {"file_path": "/p/skills/agentic-engineering/commands/review.md"}),
    result("t1", MARK * 50),
    tool("m2", "t2", "Agent", {"subagent_type": "ae-red", "prompt": "x"}),
    tool("m2", "t3", "Agent", {"subagent_type": "agentic-engineering:ae-sec", "prompt": "x"}),
    result("t2", MARK), result("t3", MARK),
    tool("m3", "t4", "Bash", {"command": "npm test 2>&1 | tail -5"}), result("t4", MARK),
    tool("m4", "t5", "Bash", {"command": "git commit -m \"fix(x): y\""}), result("t5", MARK),
    {"type": "system", "subtype": "compact_boundary"},
    tool("m5", "t6", "AskUserQuestion", {"questions": [{"question": "Ship it?", "options": []}]}),
    tool("sub", "t7", "Agent", {"subagent_type": "ae-lean"}, isSidechain=True),
])
p = run("--check", bare)
c.expect("bare subagent_type 'ae-red' at L4" in p.stdout, "bare 'ae-red' dispatch flagged with its line", p.stdout[-500:])
c.expect("ae-lean" not in p.stdout, "sidechain (subagent) lines ignored")
c.expect(MARK not in p.stdout, "tool-result bodies never printed")
c.expect("L8 npm test" in p.stdout, "TEST RUNS lists the test command")
c.expect("L10 fix(x): y" in p.stdout, "COMMITS lists the commit message")
c.expect("COMPACTIONS (1)" in p.stdout and "L12" in p.stdout, "COMPACTIONS lists the boundary line")
c.expect("L13 AskUserQuestion: Ship it?" in p.stdout, "GATES lists the question")
c.expect("no .agentic/focus.md PLAN write" not in p.stdout, "/review alone is not flagged for a missing PLAN")

chain = write([{"type": "user", "message": {"role": "user", "content": "<command-name>/agentic-engineering:fix</command-name>"}}])
p = run("--check", chain)
c.expect("DEVIATION progress" in p.stdout, "chain command with no PLAN write flagged")

# /fix Phase 3: RED must be a real dispatch before the fix( commit.
FIX_CMD = {"type": "user", "message": {"role": "user", "content": "<command-name>/agentic-engineering:fix</command-name>"}}
FIX_READ = tool("m0", "t0", "Read", {"file_path": "/p/skills/agentic-engineering/commands/fix.md"})
PLAN = tool("m1", "t1", "Write", {"file_path": "/w/.agentic/focus.md", "content": "# PLAN\n- [ ] Diagnose\n"})
COMMIT = tool("m9", "t9", "Bash", {"command": "git commit -m \"fix(math): add adds\""})
RED = tool("m5", "t5", "Agent", {"subagent_type": "agentic-engineering:ae-red", "prompt": "Mode: fix review"})

p = run("--check", write([FIX_CMD, FIX_READ, PLAN, COMMIT]))
c.expect("DEVIATION review" in p.stdout and "ae-red" in p.stdout,
         "/fix committed with no ae-red dispatch → DEVIATION review", p.stdout[-400:])
p = run("--check", write([FIX_READ, PLAN, COMMIT]))
c.expect("DEVIATION review" in p.stdout, "headless /fix (body read, no command line) also flagged")
p = run("--check", write([FIX_CMD, FIX_READ, PLAN, RED, result("t5", "RED — Fix review: clean"), COMMIT]))
c.expect("DEVIATION review" not in p.stdout, "/fix with ae-red dispatched → no review deviation", p.stdout[-400:])
p = run("--check", write([FIX_CMD, FIX_READ, PLAN]))
c.expect("DEVIATION review" not in p.stdout, "/fix stopped before its commit → no review deviation")

# Story chains: source and tests are ae-impl's to write, never the main thread's.
SHIP_CMD = {"type": "user", "message": {"role": "user", "content": "<command-name>/agentic-engineering:ship</command-name>"}}
SRC = tool("m6", "t6", "Write", {"file_path": "/w/src/math.js", "content": "export const x = 1;"})
TST = tool("m7", "t7", "Edit", {"file_path": "/w/test/math.test.js", "old_string": "a", "new_string": "b"})
DOCS = tool("m8", "t8", "Edit", {"file_path": "/w/docs/features/main/STORIES.md", "old_string": "[ ]", "new_string": "[x]"})
IMPL = tool("m5", "t5", "Agent", {"subagent_type": "agentic-engineering:ae-impl", "prompt": "brief: .agentic/briefs/STORY-001.md", "model": "sonnet"})
p = run("--check", write([SHIP_CMD, PLAN, SRC, TST, DOCS]))
c.expect("DEVIATION build" in p.stdout and "2 source/test edit(s)" in p.stdout,
         "/ship editing src/ and test/ in the main thread with no ae-impl → DEVIATION build", p.stdout[-500:])
c.expect("SOURCE EDITS (main thread) (2)" in p.stdout and "/w/src/math.js" in p.stdout,
         "SOURCE EDITS lists the main-thread code writes, not the docs edit", p.stdout[-500:])
p = run("--check", write([SHIP_CMD, PLAN, IMPL, result("t5", "IMPL — STORY-001 [build]: DONE"), DOCS]))
c.expect("DEVIATION build" not in p.stdout, "/ship that dispatched ae-impl and only ticked docs → no build deviation", p.stdout[-400:])
p = run("--check", write([SHIP_CMD, PLAN, DOCS, tool("m9", "t9", "Write", {"file_path": "/w/.agentic/briefs/STORY-001.md", "content": "x"})]))
c.expect("DEVIATION build" not in p.stdout, "docs and brief writes are the orchestrator's — no build deviation")
p = run("--check", write([FIX_CMD, FIX_READ, PLAN, SRC, RED, result("t5", "RED — Fix review: clean"), COMMIT]))
c.expect("DEVIATION build" not in p.stdout, "/fix writes its fix in the main thread by design — no build deviation")

# The approved plan is committed as a record before the build; the brief alone is gitignored.
REC_BASH = tool("m4", "t4", "Bash", {"command": "git add docs/features/main/plans/STORY-001-plan.md && "
                                                 "git commit -q -m \"docs(main): STORY-001 — plan\" -- docs/features/main/plans/STORY-001-plan.md"})
REC_WRITE = tool("m4", "t4", "Write", {"file_path": "/w/docs/features/main/plans/STORY-001-plan.md", "content": "# Plan"})
ROUND = tool("m5", "t5", "Agent", {"subagent_type": "agentic-engineering:ae-impl",
                                   "prompt": "brief: .agentic/briefs/STORY-001.md\nmode: fix-round\nround: 1"})
p = run("--check", write([SHIP_CMD, PLAN, IMPL, result("t5", "IMPL — STORY-001 [build]: DONE")]))
c.expect("DEVIATION plan" in p.stdout and "STORY-001 built at L3" in p.stdout,
         "/ship built STORY-001 with no plan record → DEVIATION plan naming story and line", p.stdout[-500:])
p = run("--check", write([SHIP_CMD, PLAN, REC_BASH, IMPL]))
c.expect("DEVIATION plan" not in p.stdout, "record written and committed through Bash → no plan deviation", p.stdout[-400:])
p = run("--check", write([SHIP_CMD, PLAN, REC_WRITE, IMPL]))
c.expect("DEVIATION plan" not in p.stdout, "record written with Write → no plan deviation")
p = run("--check", write([SHIP_CMD, PLAN, ROUND]))
c.expect("DEVIATION plan" not in p.stdout, "a fix round is not a build → no plan deviation")
p = run("--check", write([PLAN, IMPL]))
c.expect("DEVIATION plan" not in p.stdout, "ae-impl outside a story chain → no plan deviation")

# Parallel builds: an isolated implementer must be pinned to the feature branch.
ISO = tool("m5", "t5", "Agent", {"subagent_type": "agentic-engineering:ae-impl", "isolation": "worktree",
                                 "prompt": "brief: /w/.agentic/briefs/STORY-002.md\nmode: build"})
ISO_PIN = tool("m5", "t6", "Agent", {"subagent_type": "agentic-engineering:ae-impl", "isolation": "worktree",
                                     "prompt": "brief: /w/.agentic/briefs/STORY-003.md\nmode: build\npin: 1a2b3c feat/x-story-003"})
p = run("--check", write([SHIP_CMD, PLAN, ISO, ISO_PIN]))
c.expect("DEVIATION base" in p.stdout and "L3" in p.stdout and "L4" not in p.stdout.split("DEVIATION base")[1].split("\n")[0],
         "isolated ae-impl with no pin: → DEVIATION base citing only that line", p.stdout[-500:])
p = run("--check", write([SHIP_CMD, PLAN, ISO_PIN]))
c.expect("DEVIATION base" not in p.stdout, "isolated ae-impl with pin: → no base deviation")

# One huge line must not flood the digest.
huge = write([{"type": "user", "message": {"role": "user", "content": "x" * 2_000_000}},
              tool("m1", "t1", "Bash", {"command": "pytest " + "y" * 100_000})])
p = run(huge)
c.expect(p.returncode == 0 and len(p.stdout) < 5000, f"2 MB line → bounded digest ({len(p.stdout)} chars)")

# --- session discovery ------------------------------------------------------------
cfg = tempfile.mkdtemp()
proj = tempfile.mkdtemp()
slug = "".join(ch if ch.isalnum() else "-" for ch in os.path.realpath(proj))
os.makedirs(os.path.join(cfg, "projects", slug))
sid = "11111111-2222-4333-8444-555555555555"
dst = os.path.join(cfg, "projects", slug, f"{sid}.jsonl")
with open(os.path.join(FIX, "review-sequential.jsonl")) as src, open(dst, "w") as out:
    out.write(src.read())
p = run("--find", "--project-dir", proj, env={"CLAUDE_CONFIG_DIR": cfg})
c.expect(sid in p.stdout and "/agentic-engineering:ship" in p.stdout, "--find lists the project's session with its first prompt", p.stdout)
p = run("--locate", sid, env={"CLAUDE_CONFIG_DIR": cfg})
c.expect(p.stdout.strip() == os.path.realpath(dst), "--locate resolves an id under CLAUDE_CONFIG_DIR", p.stdout + p.stderr)
p = run("--check", sid, env={"CLAUDE_CONFIG_DIR": cfg})
c.expect("DEVIATION dispatch" in p.stdout, "digest accepts a session id")

# --- scrub -------------------------------------------------------------------------
fd, sf = tempfile.mkstemp(suffix=".md")
secret_text = (
    "mail alice.smith@example.com about /home/alice/work/app and /Users/bob/x and /root/.claude/projects\n"
    "key sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx and ghp_abcdefghijklmnopqrstuvwxyz0123\n"
    "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456\n"
    "OPENAI_API_KEY=abcdef123456 host 10.1.2.3 remote git@github.com:acme/secret-repo.git\n"
    "keep: session 11111111-2222-4333-8444-555555555555 model claude-sonnet-5-5 L14 /agentic-engineering:ship\n")
with os.fdopen(fd, "w") as f:
    f.write(secret_text)
p = run("--scrub-file", sf)
out = open(sf).read()
leaks = [s for s in ("alice.smith@example.com", "/home/alice", "/Users/bob", "/root/", "sk-ant-api03", "ghp_abc",
                     "abcdefghijklmnopqrstuvwxyz123456", "abcdef123456", "10.1.2.3", "acme/secret-repo") if s in out]
c.expect(not leaks, "scrub removes email, home paths, keys, bearer, env secret, IP, remote", f"leaked: {leaks}\n{out}")
c.expect("11111111-2222-4333-8444-555555555555" in out and "L14 /agentic-engineering:ship" in out and "claude-sonnet-5-5" in out,
         "scrub keeps session ids, line refs, command and model names", out)
c.expect(p.stdout.startswith("SCRUBBED"), "scrub prints its counts", p.stdout)

c.exit()
