#!/usr/bin/env python3
"""Query and assert on a Claude Code transcript.

Reads both shapes Claude Code produces:
  - `claude -p --output-format stream-json --verbose` output
  - on-disk session files (<config>/projects/<slug>/<session-id>.jsonl)
Both carry {type: assistant|user, message: {id, content: [...]}}. Parallel tool
calls arrive as separate lines that share one assistant `message.id`, so a
"single message" means "one message.id", never "one line".

Main-thread only: lines with a non-null parent_tool_use_id (stream-json) or
isSidechain true (on-disk) belong to subagents and are skipped.

Usage:
  transcript.py summary FILE
  transcript.py routed-to FILE COMMAND          exit 0 if the run entered /COMMAND
  transcript.py batch FILE AGENT[,AGENT...]     exit 0 if one message dispatched all
  transcript.py dispatches FILE                 print dispatch groups (JSON)
  transcript.py text FILE                       print main-thread assistant text
  transcript.py hook-events FILE                print SessionStart hook names seen
  transcript.py tools FILE NAME[,NAME...]       print main-thread calls to those tools
                                                (line + JSON input); exit 1 if none
"""
import json
import re
import sys

NS = "agentic-engineering"


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
                continue
    return rows


def main_thread(rows):
    for n, d in rows:
        if d.get("parent_tool_use_id") or d.get("isSidechain"):
            continue
        yield n, d


def blocks(rows, kind):
    """(line, message_id, block) for every content block of `kind` on the main thread."""
    for n, d in main_thread(rows):
        if d.get("type") != kind:
            continue
        msg = d.get("message") or {}
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for b in content:
            if isinstance(b, dict):
                yield n, msg.get("id"), b


def tool_uses(rows, names=None):
    for n, mid, b in blocks(rows, "assistant"):
        if b.get("type") == "tool_use" and (names is None or b.get("name") in names):
            yield n, mid, b


def dispatch_groups(rows):
    groups = {}
    order = []
    for n, mid, b in tool_uses(rows, {"Agent", "Task"}):
        key = mid or f"line{n}"
        if key not in groups:
            groups[key] = {"message_id": mid, "lines": [], "agents": []}
            order.append(key)
        groups[key]["lines"].append(n)
        groups[key]["agents"].append((b.get("input") or {}).get("subagent_type", "?"))
    return [groups[k] for k in order]


def assistant_text(rows):
    out = []
    for _n, _mid, b in blocks(rows, "assistant"):
        if b.get("type") == "text":
            out.append(b.get("text", ""))
    for _n, d in rows:
        if d.get("type") == "result" and isinstance(d.get("result"), str):
            out.append(d["result"])
    return "\n".join(out)


def routed_to(rows, command):
    evidence = []
    for n, _mid, b in tool_uses(rows):
        inp = b.get("input") or {}
        name = b.get("name")
        if name in ("Skill", "SlashCommand"):
            skill = str(inp.get("skill") or inp.get("command") or "")
            args = str(inp.get("args") or "")
            if skill in (f"{NS}:{command}", f"/{NS}:{command}", f"/{command}", command) or (
                skill == NS and re.search(rf"(^|\W)/?{re.escape(command)}(\W|$)", args)
            ):
                evidence.append(f"line {n}: {name} {skill} {args[:60]}")
        elif name == "Read":
            p = str(inp.get("file_path", ""))
            if p.endswith(f"/skills/{NS}/commands/{command}.md"):
                evidence.append(f"line {n}: Read {p}")
    # A user-typed /agentic-engineering:<cmd> shows up as the expanded wrapper text.
    for n, d in main_thread(rows):
        if d.get("type") == "user":
            c = (d.get("message") or {}).get("content")
            s = c if isinstance(c, str) else json.dumps(c) if c else ""
            if f"<command-name>/{NS}:{command}</command-name>" in s:
                evidence.append(f"line {n}: user invoked /{NS}:{command}")
    return evidence


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    cmd, path = argv[1], argv[2]
    rows = load(path)

    if cmd == "summary":
        groups = dispatch_groups(rows)
        tools = {}
        for _n, _mid, b in tool_uses(rows):
            tools[b.get("name")] = tools.get(b.get("name"), 0) + 1
        print(json.dumps({"lines": len(rows), "tool_uses": tools,
                          "dispatch_groups": [g["agents"] for g in groups]}, indent=1))
        return 0

    if cmd == "routed-to":
        ev = routed_to(rows, argv[3])
        for e in ev:
            print(e)
        if not ev:
            skills = [f"{b.get('name')} {json.dumps(b.get('input'))[:80]}"
                      for _n, _m, b in tool_uses(rows, {"Skill", "SlashCommand"})]
            print(f"no evidence of /{argv[3]}; Skill calls seen: {skills or 'none'}")
        return 0 if ev else 1

    if cmd == "batch":
        want = [a if ":" in a else f"{NS}:{a}" for a in argv[3].split(",")]
        groups = dispatch_groups(rows)
        for g in groups:
            print(f"message {g['message_id']} lines {g['lines'][0]}-{g['lines'][-1]}: {', '.join(g['agents'])}")
        hit = [g for g in groups if set(want) <= set(g["agents"])]
        if hit:
            print(f"OK: all {len(want)} dispatched in message {hit[0]['message_id']}")
            return 0
        seen = {a for g in groups for a in g["agents"]}
        print(f"NOT BATCHED: wanted {len(want)} in one message; missing overall: "
              f"{sorted(set(want) - seen) or 'none'}; groups: {len(groups)}")
        return 1

    if cmd == "dispatches":
        print(json.dumps(dispatch_groups(rows), indent=1))
        return 0

    if cmd == "text":
        print(assistant_text(rows))
        return 0

    if cmd == "tools":
        names = set(argv[3].split(","))
        found = 0
        for n, _mid, b in tool_uses(rows, names):
            found += 1
            print(f"L{n} {b.get('name')} {json.dumps(b.get('input'), ensure_ascii=False)}")
        return 0 if found else 1

    if cmd == "hook-events":
        for n, d in rows:
            if d.get("type") == "system" and d.get("subtype") in ("hook_started", "hook_response"):
                print(f"line {n}: {d.get('subtype')} {d.get('hook_name')}")
        return 0

    print(f"unknown command {cmd}")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
