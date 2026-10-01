#!/usr/bin/env python3
"""story-cost.py — measured subagent cost of one story, from this session's transcripts.

  story-cost.py <STORY-ID> [--session <id | path.jsonl>]

Finds the session transcript (--session, else $CLAUDE_CODE_SESSION_ID, which Claude
Code sets for every Bash call), reads its subagent transcripts
(<session>/subagents/agent-*.jsonl + .meta.json), and keeps the runs whose prompt
names this story FIRST among story ids — planner, pre-review, implementer, fix
rounds, reviewers, UX and SCRIBE all lead with the story or its brief, diff or
report path, while a planner in a parallel group also names its peers further on —
then sums each run's token usage per agent and model. Prints a Markdown table for the story's `### Cost`
section in PROGRESS.md.

Tokens, not dollars: prices change and differ by model and provider; tokens per
model are the measurement. The main session's own orchestration is not attributed
per story.

No session or no subagent transcripts (claude.ai, another harness, a cleaned-up
config dir) → prints `COST: unavailable — <why>` and exits 0: the caller records
nothing rather than a guess.
"""
import collections
import glob
import json
import os
import re
import sys


def config_dir():
    return os.environ.get("CLAUDE_CONFIG_DIR") or os.path.join(os.path.expanduser("~"), ".claude")


def unavailable(why):
    print(f"COST: unavailable — {why}")
    sys.exit(0)


def session_path(arg):
    sid = arg or os.environ.get("CLAUDE_CODE_SESSION_ID", "")
    if sid.endswith(".jsonl") and os.path.isfile(sid):
        return sid
    if not sid:
        unavailable("no session id (pass --session, or run inside Claude Code)")
    hits = glob.glob(os.path.join(config_dir(), "projects", "*", f"{sid}.jsonl"))
    if not hits:
        unavailable(f"no transcript for session {sid}")
    # One id can sit under several project dirs (a child `claude -p` that inherited
    # its parent's id). Prefer this project's dir — the cwd or one of its parents,
    # slugged as Claude Code slugs them — then one with subagent runs, then newest.
    here, ours = os.path.abspath(os.getcwd()), set()
    while True:
        ours.add(re.sub(r"[^A-Za-z0-9]", "-", here))
        if os.path.dirname(here) == here:
            break
        here = os.path.dirname(here)

    def rank(h):
        return (os.path.basename(os.path.dirname(h)) in ours,
                os.path.isdir(os.path.join(h[:-len(".jsonl")], "subagents")),
                os.path.getmtime(h))
    return max(hits, key=rank)


def first_prompt(rows):
    for d in rows:
        if d.get("type") != "user":
            continue
        c = (d.get("message") or {}).get("content")
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            return " ".join(b.get("text", "") for b in c if isinstance(b, dict) and b.get("type") == "text")
    return ""


def load(path):
    rows = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def run_usage(rows):
    """Usage of one subagent run. A message split over several lines (thinking,
    text, tool_use) repeats its usage on each, and only the last line carries the
    final output count — so take each message id once, at its largest value."""
    per, models = {}, collections.Counter()
    keys = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")
    for d in rows:
        if d.get("type") != "assistant":
            continue
        m = d.get("message") or {}
        u = m.get("usage")
        mid = m.get("id")
        if not u:
            continue
        if mid not in per:
            per[mid] = collections.Counter()
            if m.get("model"):
                models[m["model"]] += 1
        for k in keys:
            per[mid][k] = max(per[mid][k], int(u.get(k) or 0))
    tot = collections.Counter()
    for u in per.values():
        tot.update(u)
    model = models.most_common(1)[0][0] if models else "?"
    return model, tot


def main(argv):
    args = argv[1:]
    session = None
    if "--session" in args:
        i = args.index("--session")
        session = args[i + 1] if i + 1 < len(args) else ""
        del args[i:i + 2]
    if len(args) != 1:
        print(__doc__.strip().splitlines()[2].strip(), file=sys.stderr)
        return 2
    story = args[0]
    prefix = story.rsplit("-", 1)[0] + "-" if "-" in story else story
    ids = re.compile(rf"(?<![A-Za-z0-9-]){re.escape(prefix)}\d+(?![0-9])")
    path = session_path(session)
    sub = os.path.join(os.path.splitext(path)[0], "subagents")
    runs = sorted(glob.glob(os.path.join(sub, "agent-*.jsonl")))
    if not runs:
        unavailable("no subagent transcripts for this session")
    agg = collections.OrderedDict()
    for r in runs:
        rows = load(r)
        first = ids.search(first_prompt(rows))
        if not first or first.group(0) != story:
            continue
        meta = {}
        try:
            meta = json.load(open(r[:-len(".jsonl")] + ".meta.json", encoding="utf-8"))
        except (OSError, ValueError):
            pass
        agent = str(meta.get("agentType") or "?").split(":")[-1]
        model, tot = run_usage(rows)
        key = (agent, model)
        a = agg.setdefault(key, collections.Counter())
        a["runs"] += 1
        a.update(tot)
    if not agg:
        unavailable(f"no subagent run in this session names {story}")
    total = collections.Counter()
    for a in agg.values():
        total.update(a)
    all_tokens = sum(total[k] for k in ("input_tokens", "output_tokens", "cache_read_input_tokens",
                                        "cache_creation_input_tokens"))
    print(f"COST: {story} · {total['runs']} subagent runs · {all_tokens:,} tokens")
    print("| Agent | Runs | Model | Input | Output | Cache read | Cache write |")
    print("|-------|------|-------|-------|--------|------------|-------------|")
    order = sorted(agg.items(), key=lambda kv: -sum(kv[1][k] for k in ("output_tokens", "input_tokens")))
    for (agent, model), a in order:
        print(f"| {agent} | {a['runs']} | {model} | {a['input_tokens']:,} | {a['output_tokens']:,} | "
              f"{a['cache_read_input_tokens']:,} | {a['cache_creation_input_tokens']:,} |")
    print(f"| total | {total['runs']} | — | {total['input_tokens']:,} | {total['output_tokens']:,} | "
          f"{total['cache_read_input_tokens']:,} | {total['cache_creation_input_tokens']:,} |")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
