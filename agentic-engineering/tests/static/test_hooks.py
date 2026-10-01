#!/usr/bin/env python3
"""hooks/hooks.json is valid and the SessionStart script emits exactly one valid
JSON object under every project shape it can meet.

The hook's output is parsed by Claude Code; invalid JSON means the context is
dropped with no visible error, so every hostile input gets a case here."""
import json
import os
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT  # noqa: E402

c = Check("hooks")

hooks_json = os.path.join(PLUGIN_ROOT, "hooks", "hooks.json")
script = os.path.join(PLUGIN_ROOT, "hooks", "session-start.sh")

# --- registration ------------------------------------------------------------
try:
    reg = json.load(open(hooks_json, encoding="utf-8"))
    c.ok("hooks/hooks.json is valid JSON")
except Exception as e:  # noqa: BLE001
    c.fail("hooks/hooks.json is valid JSON", e)
    c.exit()

entries = reg.get("hooks", {}).get("SessionStart")
c.expect(isinstance(entries, list) and entries, "hooks.json registers SessionStart")
for entry in entries or []:
    matchers = set(str(entry.get("matcher", "")).split("|"))
    c.expect({"startup", "clear", "compact"} <= matchers,
             f"SessionStart matcher covers startup|clear|compact ({entry.get('matcher')})")
    for h in entry.get("hooks", []):
        cmd = h.get("command", "")
        c.expect(h.get("type") == "command", "hook type is command")
        c.expect("${CLAUDE_PLUGIN_ROOT}/hooks/" in cmd, "hook command resolves through ${CLAUDE_PLUGIN_ROOT}")
        target = cmd.split("${CLAUDE_PLUGIN_ROOT}/", 1)[-1].split('"')[0].split()[0]
        c.expect(os.path.isfile(os.path.join(PLUGIN_ROOT, target)), f"hook script {target} exists")
unknown = set(reg.get("hooks", {})) - {"SessionStart"}
c.expect(not unknown, "no hook events beyond SessionStart", str(unknown))


# --- behaviour ---------------------------------------------------------------
def run(project, payload="{}", extra_env=None, use_project_env=True):
    env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": tempfile.mkdtemp()}
    if use_project_env:
        env["CLAUDE_PROJECT_DIR"] = project
    env.update(extra_env or {})
    t0 = time.time()
    p = subprocess.run(["bash", script], input=payload.encode("utf-8", "surrogateescape"),
                       capture_output=True, env=env, cwd=project, timeout=20)
    return p, time.time() - t0


def context_of(label, p, elapsed):
    problems = []
    if p.returncode != 0:
        problems.append(f"exit {p.returncode}")
    if p.stderr:
        problems.append(f"stderr: {p.stderr[:200]!r}")
    if elapsed > 2:
        problems.append(f"took {elapsed:.1f}s")
    try:
        out = p.stdout.decode("utf-8")
        payload = json.loads(out)
    except Exception as e:  # noqa: BLE001
        c.fail(f"{label}: stdout is one valid UTF-8 JSON object", f"{e}\n{p.stdout[:300]!r}")
        return None
    if list(payload) != ["hookSpecificOutput"]:
        problems.append(f"top-level keys {list(payload)} — only hookSpecificOutput is consumed")
    hso = payload.get("hookSpecificOutput", {})
    if hso.get("hookEventName") != "SessionStart":
        problems.append(f"hookEventName {hso.get('hookEventName')!r}")
    ctx = hso.get("additionalContext")
    if not isinstance(ctx, str) or not ctx.strip():
        problems.append("additionalContext empty")
        ctx = ""
    if len(ctx.splitlines()) > 40:
        problems.append(f"{len(ctx.splitlines())} lines > 40")
    if out.count("\n") > 1:
        problems.append("more than one line of stdout")
    c.expect(not problems, f"{label}: valid single-field JSON, ≤40 lines, exit 0, quiet", "\n".join(problems))
    return ctx


def project(index=None, memory=False, constitution=False, focus=None):
    d = tempfile.mkdtemp()
    if index is not None:
        os.makedirs(os.path.join(d, "docs"))
        open(os.path.join(d, "docs", "INDEX.md"), "w").write(index)
        if memory:
            open(os.path.join(d, "docs", "MEMORY.md"), "w").write("# Memory\n")
        if constitution:
            open(os.path.join(d, "docs", "CONSTITUTION.md"), "w").write("# Constitution\n")
    if focus is not None:
        os.makedirs(os.path.join(d, ".agentic"))
        with open(os.path.join(d, ".agentic", "focus.md"), "wb") as f:
            f.write(focus if isinstance(focus, bytes) else focus.encode())
    return d


ROUTES = ["/fix", "/note", "/improve", "/feature", "/status"]
INDEX = "---\nmode: lite   # lite | full\n---\n# Index\n"
FOCUS = ("# CURRENT\ntitle: STORY-003 — Export CSV\nfeature: export\nsince: 2026-09-30 10:00\n"
         "set_by: /ship\nnote: phase: reviewing\n\n# PLAN\n- [x] Implement\n- [ ] Backend review — 7-agent batch\n"
         "- [ ] Frontend\n\n# NEXT\n1. later\n")

# 1. Not scaffolded: router only.
d = project()
ctx = context_of("plain repo", *run(d, '{"source":"startup"}'))
if ctx is not None:
    c.expect(all(r in ctx for r in ROUTES), "plain repo: router names all five routes")
    c.expect("not set up" in ctx, "plain repo: marked 'not set up here'")
    c.expect("Active task" not in ctx and "read in full" not in ctx,
             "plain repo: no project-state lines (router only)")

# 2. Scaffolded, no focus.
d = project(INDEX, memory=True, constitution=True)
ctx = context_of("scaffolded, no focus", *run(d, '{"source":"startup"}'))
if ctx is not None:
    c.expect("docs/INDEX.md" in ctx and "docs/MEMORY.md" in ctx and "docs/CONSTITUTION.md" in ctx,
             "scaffolded: names INDEX, MEMORY, CONSTITUTION to read")
    c.expect("mode: lite" in ctx, "scaffolded: reports mode from INDEX frontmatter")
    c.expect("Active task" not in ctx, "scaffolded, no focus: no Active task line")

# 3. Scaffolded without MEMORY.md: only names files that exist.
d = project(INDEX)
ctx = context_of("scaffolded, no MEMORY.md", *run(d))
if ctx is not None:
    c.expect("docs/MEMORY.md" not in ctx, "missing MEMORY.md is not named")

# 4. Active focus.
d = project(INDEX, memory=True, focus=FOCUS)
ctx = context_of("active focus", *run(d, '{"source":"startup"}'))
if ctx is not None:
    c.expect("STORY-003 — Export CSV" in ctx, "active focus: title inlined")
    c.expect("PLAN 1/3 done" in ctx and "Backend review" in ctx, "active focus: PLAN progress + next step")
    c.expect("compacted" not in ctx, "startup source: no compaction line")

# 5. Compact source.
ctx = context_of("compact source", *run(d, '{"source":"compact","session_id":"x"}'))
if ctx is not None:
    c.expect("compacted" in ctx and "STORY-003" in ctx, "compact: focus re-injected with compaction note")

# 6. Project dir from payload cwd when CLAUDE_PROJECT_DIR is unset.
other = tempfile.mkdtemp()
p, el = run(other, json.dumps({"source": "startup", "cwd": d}), use_project_env=False)
ctx = context_of("cwd from payload", p, el)
if ctx is not None:
    c.expect("STORY-003" in ctx, "project resolved from payload cwd")

# 7. Hostile focus title: quotes, backslashes, tabs, control bytes, long, multibyte.
hostile = ("# CURRENT\ntitle: \"quoted\" \\back\\slash \ttab \x01\x1b[31mred\x7f "
           + "é" * 200 + " {\"json\": true}\n# PLAN\n- [ ] step \"two\"\n").encode("utf-8")
d = project(INDEX, focus=hostile)
ctx = context_of("hostile focus title", *run(d))
if ctx is not None:
    c.expect("\x1b" not in ctx and "\x01" not in ctx, "control bytes stripped")
    c.expect('"quoted"' in ctx and "\\back\\slash" in ctx, "quotes and backslashes survive escaping")

# 8. Invalid UTF-8 in focus.
d = project(INDEX, focus=b"# CURRENT\ntitle: bad \xff\xfe bytes\n")
context_of("invalid UTF-8 in focus", *run(d))

# 9. CURRENT without title: no task line.
d = project(INDEX, focus="# CURRENT\nsince: 2026-01-01\n# NEXT\n1. x\n")
ctx = context_of("CURRENT without title", *run(d))
if ctx is not None:
    c.expect("Active task" not in ctx, "no title → no Active task line")

# 9b. Fields written without the `# CURRENT` heading still name the task.
d = project(INDEX, focus="title: fixing: rounding\nset_by: /fix\n\n# PLAN\n- [ ] Diagnose\n")
ctx = context_of("CURRENT heading missing", *run(d))
if ctx is not None:
    c.expect("fixing: rounding" in ctx and "PLAN 0/1" in ctx, "header-less CURRENT: task and PLAN still reported")

# 10. Empty and garbage stdin.
d = project(INDEX, focus=FOCUS)
context_of("empty stdin", *run(d, ""))
context_of("garbage stdin", *run(d, "not json {{{"))

# 12–16. Worktrees, read from files only.
import shutil  # noqa: E402

if shutil.which("git"):
    genv = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@example.invalid",
                GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@example.invalid")
    m = project(INDEX)
    def git(*a, cwd=m):
        subprocess.run(["git", *a], cwd=cwd, env=genv, check=True, capture_output=True)
    git("init", "-q", "-b", "main"); git("add", "-A"); git("commit", "-qm", "init")
    wt = os.path.join(m, ".claude", "worktrees", "fix-a")
    git("worktree", "add", "-q", "-b", "fix/a", wt, "main")
    ctx = context_of("linked task worktree", *run(wt, '{"source":"startup"}'))
    if ctx is not None:
        c.expect("In a worktree: branch fix/a" in ctx and os.path.realpath(m) in ctx,
                 "linked worktree: names its branch and the main folder")
    ctx = context_of("main folder with a worktree", *run(m, '{"source":"startup"}'))
    if ctx is not None:
        c.expect("Worktrees: 1 under .claude/worktrees/" in ctx and "/worktree" in ctx,
                 "main folder: counts worktrees, points at /worktree")
        c.expect("In a worktree" not in ctx, "main folder: no in-worktree line")
    os.makedirs(os.path.join(wt, ".agentic"))
    open(os.path.join(wt, ".agentic", "focus.md"), "w").write(
        f"# CURRENT\ntitle: STORY-003 — Export CSV\nworktree_of: {m}\n")
    ctx = context_of("story worktree", *run(wt))
    if ctx is not None:
        c.expect("worktree of:" in ctx and "In a worktree" not in ctx,
                 "story worktree: worktree_of line only, no duplicate in-worktree line")
else:
    c.expect(True, "git missing — real-worktree hook cases skipped")

# Relative gitdir (worktree.useRelativePaths), no git needed.
m = project(INDEX)
wt = os.path.join(m, ".claude", "worktrees", "improve-x")
os.makedirs(os.path.join(m, ".git", "worktrees", "improve-x"))
open(os.path.join(m, ".git", "worktrees", "improve-x", "HEAD"), "w").write("ref: refs/heads/improve/x\n")
os.makedirs(os.path.join(wt, "docs"))
open(os.path.join(wt, "docs", "INDEX.md"), "w").write(INDEX)
open(os.path.join(wt, ".git"), "w").write("gitdir: ../../../.git/worktrees/improve-x\n")
ctx = context_of("relative gitdir", *run(wt))
if ctx is not None:
    c.expect("branch improve/x" in ctx and os.path.realpath(m) in ctx, "relative gitdir: branch and main folder resolved")

# A submodule's .git file is not a worktree.
d = project(INDEX)
open(os.path.join(d, ".git"), "w").write("gitdir: ../.git/modules/lib\n")
ctx = context_of("submodule .git file", *run(d))
if ctx is not None:
    c.expect("In a worktree" not in ctx, "submodule: no worktree line")

# 11. Opt-out.
p, _ = run(d, "{}", {"AGENTIC_SESSION_HOOK": "0"})
c.expect(p.returncode == 0 and p.stdout == b"", "AGENTIC_SESSION_HOOK=0 emits nothing")

c.exit()
