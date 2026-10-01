#!/usr/bin/env python3
"""transcript-digest.py — line-cited digest of a Claude Code session, for /diagnose.

  transcript-digest.py [--check] <session.jsonl | session-id>
      Digest: commands invoked, plugin files read, Agent dispatches grouped by
      assistant message, questions/gates, PLAN writes, test runs, commits,
      compactions, subagent transcripts. Never prints tool-result bodies; every
      field is truncated. --check adds mechanical DEVIATION lines for the
      agentic-engineering contracts a transcript can prove on its own.

  transcript-digest.py --find [--project-dir DIR] [--limit N]
      This project's sessions, newest first: id, mtime, lines, size, first prompt.

  transcript-digest.py --locate <session-id>
      Absolute path of that session's transcript.

  transcript-digest.py --scrub-file <file> [<file> ...]
      Redact in place: emails, home paths, secrets, IPs, git remotes. Prints counts.

Reads on-disk session files (${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/<slug>/<id>.jsonl,
subagents under <id>/subagents/) and `claude -p --output-format stream-json` output.
Both carry {type, message: {id, content: [...]}}; parallel tool calls are separate
lines sharing one message.id. Line numbers are 1-based file lines. Read-only.
"""
import glob
import json
import os
import re
import sys

NS = "agentic-engineering"
REVIEWERS = {f"{NS}:{a}" for a in ("ae-red", "ae-req", "ae-test", "ae-doc", "ae-sec", "ae-edge", "ae-lean")}
TEST_RE = re.compile(r"(^|[\s;&|(])(npm (run )?test|yarn test|pnpm test|npx (vitest|jest)|vitest|jest|pytest|"
                     r"go test|cargo test|flutter test|dart test|mvn test|gradle\w* test|swift test|"
                     r"node --test|bun test|evidence\.sh run)")
GATE_TEXT_RE = re.compile(r"(Human checkpoint|HARD-PAUSE|SKIPPED:|DECISION:|RULING:|PAUSED)")
# Paths a story chain's main thread may write: docs, working state, changelogs.
# Anything else is source or tests — ae-impl's job (shared/story-flow.md).
DOC_PATH_RE = re.compile(r"(^|/)(docs|app-docs|\.agentic|\.claude)/|\.md$|(^|/)\.gitignore$")
MAX = 160


def config_dir():
    return os.environ.get("CLAUDE_CONFIG_DIR") or os.path.join(os.path.expanduser("~"), ".claude")


def project_slug(path):
    return re.sub(r"[^A-Za-z0-9]", "-", os.path.realpath(path))


def short(s, n=MAX):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def load(path):
    rows = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append((n, json.loads(line)))
            except json.JSONDecodeError:
                rows.append((n, {"type": "_unparseable"}))
    return rows


def main_thread(rows):
    for n, d in rows:
        if d.get("parent_tool_use_id") or d.get("isSidechain"):
            continue
        yield n, d


def content_blocks(d):
    c = (d.get("message") or {}).get("content")
    if isinstance(c, list):
        return [b for b in c if isinstance(b, dict)]
    if isinstance(c, str):
        return [{"type": "text", "text": c}]
    return []


def first_prompt(rows):
    for n, d in main_thread(rows):
        if d.get("type") == "user" and not d.get("isMeta"):
            for b in content_blocks(d):
                if b.get("type") == "text":
                    t = b.get("text", "")
                    m = re.search(r"<command-name>(/[^<]+)</command-name>", t)
                    if m:  # a typed slash command: show it as typed
                        a = re.search(r"<command-args>(.*?)</command-args>", t, re.S)
                        return n, f"{m.group(1)} {a.group(1) if a else ''}".strip()
                    return n, t
    return None, ""


def digest(path, check=False):
    rows = load(path)
    out = []
    size = os.path.getsize(path)
    meta = next((d for _n, d in rows if d.get("cwd") and (d.get("sessionId") or d.get("session_id"))),
                next((d for _n, d in rows if d.get("sessionId") or d.get("session_id")), {}))
    stamps = [d.get("timestamp") for _n, d in rows if d.get("timestamp")]
    out.append(f"SESSION {meta.get('sessionId') or meta.get('session_id') or '?'}")
    out.append(f"  file {path} · {len(rows)} lines · {size:,} bytes · version {meta.get('version', '?')}")
    out.append(f"  cwd {meta.get('cwd', '?')} · {stamps[0] if stamps else '?'} → {stamps[-1] if stamps else '?'}")
    fn, fp = first_prompt(rows)
    out.append(f"  first prompt L{fn}: {short(fp, 200)}")

    commands, reads, gates, plan, tests, commits, compactions, autolog, texts = [], [], [], [], [], [], [], [], []
    source_edits = []
    groups, order = {}, []
    tool_results = {}
    for n, d in rows:
        if d.get("type") == "user":
            for b in content_blocks(d):
                if b.get("type") == "tool_result":
                    tool_results[b.get("tool_use_id")] = (n, bool(b.get("is_error")))
    for n, d in main_thread(rows):
        t = d.get("type")
        if t == "system" and d.get("subtype") == "compact_boundary" or d.get("isCompactSummary"):
            compactions.append(f"L{n}")
        if t == "user":
            for b in content_blocks(d):
                txt = b.get("text", "") if b.get("type") == "text" else ""
                m = re.search(r"<command-name>(/[^<]+)</command-name>", txt)
                if m:
                    a = re.search(r"<command-args>(.*?)</command-args>", txt, re.S)
                    commands.append(f"L{n} {m.group(1)} {short(a.group(1) if a else '', 80)}".rstrip())
            continue
        if t != "assistant":
            continue
        mid = (d.get("message") or {}).get("id") or f"line{n}"
        for b in content_blocks(d):
            if b.get("type") == "text":
                for line in b.get("text", "").splitlines():
                    if GATE_TEXT_RE.search(line):
                        gates.append(f"L{n} text: {short(line, 140)}")
                texts.append(n)
                continue
            if b.get("type") != "tool_use":
                continue
            name, inp = b.get("name"), b.get("input") or {}
            res = tool_results.get(b.get("id"))
            err = " (error)" if res and res[1] else ""
            if name in ("Agent", "Task"):
                if mid not in groups:
                    groups[mid] = {"lines": [], "agents": []}
                    order.append(mid)
                groups[mid]["lines"].append(n)
                groups[mid]["agents"].append(str(inp.get("subagent_type", "?")))
            elif name in ("Skill", "SlashCommand"):
                commands.append(f"L{n} {name} {inp.get('skill') or inp.get('command')} {short(inp.get('args', ''), 60)}".rstrip())
            elif name == "Read":
                p = str(inp.get("file_path", ""))
                if f"/skills/{NS}/" in p or "/agents/ae-" in p or "/references/ae-" in p or "/.agentic/" in p:
                    reads.append(f"L{n} {short(p, 140)}")
            elif name == "AskUserQuestion":
                qs = inp.get("questions") or []
                q = qs[0].get("question") if qs and isinstance(qs[0], dict) else inp
                gates.append(f"L{n} AskUserQuestion: {short(q, 140)}")
            elif name in ("Write", "Edit", "MultiEdit"):
                p = str(inp.get("file_path", ""))
                if p.endswith(".agentic/focus.md"):
                    body = str(inp.get("content") or inp.get("new_string") or "")
                    done = len(re.findall(r"(?m)^\s*- \[[xX]\]", body))
                    open_ = len(re.findall(r"(?m)^\s*- \[ \]", body))
                    plan.append(f"L{n} {name} focus.md" + (f" — PLAN {done} done / {open_} open" if done + open_ else ""))
                elif p.endswith(".agentic/auto-log.md"):
                    autolog.append(f"L{n} {name} auto-log.md")
                elif p and not DOC_PATH_RE.search(p):
                    source_edits.append(f"L{n} {name} {short(p, 120)}")
            elif name == "Bash":
                cmd = str(inp.get("command", ""))
                if TEST_RE.search(cmd):
                    tests.append(f"L{n} {short(cmd, 120)}{err}")
                m = re.search(r"git commit[^\n]*?-m\s+(\"[^\"]*\"|'[^']*'|\S+)", cmd)
                if m:
                    commits.append(f"L{n} {short(m.group(1).strip(chr(34) + chr(39)), 120)}{err}")
                if ".agentic/focus.md" in cmd and re.search(r">\s*\.agentic/focus\.md|tee", cmd):
                    plan.append(f"L{n} Bash writes focus.md")
                if ".agentic/auto-log.md" in cmd and ">>" in cmd:
                    autolog.append(f"L{n} Bash appends auto-log.md")

    def section(title, items):
        out.append(title + (f" ({len(items)})" if items else " — none"))
        out.extend("  " + i for i in items[:60])
        if len(items) > 60:
            out.append(f"  … +{len(items) - 60} more")

    section("COMMANDS", commands)
    section("PLUGIN FILES READ", reads)
    disp = []
    for mid in order:
        g = groups[mid]
        span = f"L{g['lines'][0]}" + (f"-L{g['lines'][-1]}" if len(g["lines"]) > 1 else "")
        disp.append(f"{span} message {mid}: {len(g['agents'])} agent(s) — {', '.join(a.replace(NS + ':', '') for a in g['agents'])}")
    section("DISPATCH (grouped by assistant message)", disp)
    section("GATES / AUTO LINES", gates)
    section("PLAN WRITES", plan)
    section("AUTO-LOG WRITES", autolog)
    section("TEST RUNS", tests)
    section("COMMITS", commits)
    section("SOURCE EDITS (main thread)", source_edits)
    section("COMPACTIONS", compactions)

    sub_dir = os.path.join(os.path.splitext(path)[0], "subagents")
    subs = []
    for mf in sorted(glob.glob(os.path.join(sub_dir, "*.meta.json"))):
        try:
            m = json.load(open(mf, encoding="utf-8"))
        except Exception:  # noqa: BLE001
            m = {}
        jf = mf.replace(".meta.json", ".jsonl")
        n_lines = sum(1 for _ in open(jf, encoding="utf-8", errors="replace")) if os.path.exists(jf) else 0
        subs.append(f"{m.get('agentType') or m.get('subagent_type') or '?'} — {jf} ({n_lines} lines)")
    section("SUBAGENT TRANSCRIPTS", subs)

    if check:
        out.append("CHECKS")
        devs = deviations(order, groups, commands, plan, reads, commits, source_edits)
        out.extend(devs or ["  no mechanical deviations — compare the digest with the command contract"])
    return "\n".join(out)


def deviations(order, groups, commands, plan, reads=(), commits=(), source_edits=()):
    devs = []
    # Review rounds: a maximal run of reviewer-dispatching messages in which no
    # reviewer repeats. Plan pre-review (red+sec), Phase 2 (7) and Phase 4 (6) each
    # repeat a reviewer, so each starts its own round. A round spread over more than
    # one message is sequential dispatch.
    rounds, cur, seen = [], [], set()
    for mid in order:
        revs = [a for a in groups[mid]["agents"] if a in REVIEWERS]
        if not revs:
            continue
        if seen & set(revs):
            rounds.append(cur)
            cur, seen = [], set()
        cur.append(mid)
        seen |= set(revs)
    if cur:
        rounds.append(cur)
    for r in rounds:
        if len(r) > 1:
            where = " · ".join(
                f"L{groups[m]['lines'][0]} {', '.join(a.replace(NS + ':', '') for a in groups[m]['agents'] if a in REVIEWERS)}"
                for m in r)
            n_rev = sum(len([a for a in groups[m]["agents"] if a in REVIEWERS]) for m in r)
            devs.append(f"  DEVIATION dispatch: {n_rev} reviewers dispatched across {len(r)} assistant messages "
                        f"(sequential) — contract: one message, all reviewers (commands/review.md Constraints). {where}")
    for mid in order:
        for a, ln in zip(groups[mid]["agents"], groups[mid]["lines"]):
            if re.fullmatch(r"ae-[a-z]+", a):
                devs.append(f"  DEVIATION dispatch: bare subagent_type '{a}' at L{ln} — must be '{NS}:{a}'; "
                            "a bare name fails and the model role-plays the reviewer inline (SKILL.md Agent Roster)")
    # /fix reached its commit (Phase 4 comes after review) without a real RED: the
    # review was written inline by the session that wrote the fix.
    ran_fix = any(re.search(rf"\b{NS}:fix\b|\s/fix\b", c) for c in commands) or \
        any(re.search(r"/commands/fix\.md$", r) for r in reads)
    fix_commit = next((c for c in commits if re.match(r"L\d+ fix(\(|:)", c)), None)
    dispatched = {a for mid in order for a in groups[mid]["agents"]}
    if ran_fix and fix_commit and f"{NS}:ae-red" not in dispatched:
        devs.append(f"  DEVIATION review: /fix committed ({short(fix_commit, 60)}) with no {NS}:ae-red dispatch — "
                    "Phase 3 RED review was skipped or written inline (commands/fix.md Phase 3)")
    # A story chain wrote source or tests in the main thread and never dispatched the
    # implementer: the build was done inline, by the session that also plans and
    # verifies it — the context and the separation the subagent exists for, both lost.
    story_chain = any(re.search(rf"\b{NS}:(ship|ship-all|implement|frontend)\b", c) for c in commands) or \
        any(re.search(r"/commands/(ship|ship-all|implement|frontend)\.md$", r) for r in reads)
    if story_chain and source_edits and f"{NS}:ae-impl" not in dispatched:
        devs.append(f"  DEVIATION build: {len(source_edits)} source/test edit(s) in the main thread "
                    f"({short(source_edits[0], 60)}) with no {NS}:ae-impl dispatch — story code is built by "
                    "the implementer subagent, never inline (shared/story-flow.md §2)")
    chain = [c for c in commands if re.search(rf"/?{NS}:(ship|fix|improve|feature|ship-all|plan-all|doc-all)\b", c)]
    if chain and not plan:
        devs.append(f"  DEVIATION progress: chain command ({short(chain[0], 60)}) but no .agentic/focus.md PLAN write "
                    "(SKILL.md Progress Tracking) — unless nested under a parent that owns PLAN")
    return devs


def find(project_dir, limit):
    d = os.path.join(config_dir(), "projects", project_slug(project_dir))
    files = sorted(glob.glob(os.path.join(d, "*.jsonl")), key=os.path.getmtime, reverse=True)
    if not files:
        print(f"no sessions under {d}")
        return 1
    import time
    for f in files[:limit]:
        rows = load(f)
        n, p = first_prompt(rows)
        when = time.strftime("%Y-%m-%d %H:%M", time.localtime(os.path.getmtime(f)))
        print(f"{os.path.basename(f)[:-6]}  {when}  {len(rows):>6} lines  {os.path.getsize(f):>10,} B  {short(p, 90)}")
    return 0


def locate(sid):
    hits = glob.glob(os.path.join(config_dir(), "projects", "*", f"{sid}.jsonl"))
    if not hits:
        print(f"no transcript for session {sid} under {os.path.join(config_dir(), 'projects')}", file=sys.stderr)
        return None
    return os.path.realpath(hits[0])


# Order matters: a git remote (git@host:owner/repo) looks like an email to the
# email pattern, so remotes go first.
SCRUB = [
    ("REMOTE", re.compile(r"(git@[A-Za-z0-9.-]+:[\w.-]+/[\w.-]+|https?://[A-Za-z0-9.-]+/[\w.-]+/[\w.-]+\.git\b)")),
    ("EMAIL", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")),
    ("SECRET", re.compile(r"\b(sk-[A-Za-z0-9_-]{16,}|sk-ant-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|"
                          r"github_pat_[A-Za-z0-9_]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|"
                          r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})")),
    ("SECRET", re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/-]{16,}=*")),
    ("SECRET", re.compile(r"(?i)\b([A-Z0-9_]*(?:API_?KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Z0-9_]*\s*[=:]\s*)"
                          r"(['\"]?)[^\s'\"]{6,}\2")),
    ("IP", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
]
HOME_RE = re.compile(r"(/home/[^/\s\"']+|/Users/[^/\s\"']+|/root)(?=/|\b)|[A-Za-z]:\\\\?Users\\\\?[^\\\s\"']+")


def scrub_text(text, counts):
    def home(_m):
        counts["HOME"] = counts.get("HOME", 0) + 1
        return "~"
    text = HOME_RE.sub(home, text)
    for label, rx in SCRUB:
        def rep(m, label=label):
            counts[label] = counts.get(label, 0) + 1
            if label == "SECRET" and m.lastindex and m.group(1) and not m.group(0).startswith(("sk-", "gh", "xox", "AKIA", "eyJ", "github_pat")):
                return m.group(1) + f"<{label}>"
            return f"<{label}>"
        text = rx.sub(rep, text)
    return text


def main(argv):
    args = argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return 0 if args else 2
    if args[0] == "--find":
        pd, limit = os.getcwd(), 10
        if "--project-dir" in args:
            pd = args[args.index("--project-dir") + 1]
        if "--limit" in args:
            limit = int(args[args.index("--limit") + 1])
        return find(pd, limit)
    if args[0] == "--locate":
        p = locate(args[1])
        if p:
            print(p)
        return 0 if p else 1
    if args[0] == "--scrub-file":
        for f in args[1:]:
            counts = {}
            text = open(f, encoding="utf-8", errors="replace").read()
            open(f, "w", encoding="utf-8").write(scrub_text(text, counts))
            print(f"SCRUBBED {f}: " + (", ".join(f"{k} {v}" for k, v in sorted(counts.items())) or "nothing found"))
        return 0
    check = "--check" in args
    rest = [a for a in args if a != "--check"]
    if not rest:
        print(__doc__)
        return 2
    target = rest[0]
    path = target if os.path.isfile(target) else locate(target)
    if not path:
        return 1
    print(digest(os.path.realpath(path), check=check))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
