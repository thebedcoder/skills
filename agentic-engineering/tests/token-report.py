#!/usr/bin/env python3
"""Token report for agentic-engineering — modeled on superpowers'
tests/claude-code/analyze-token-usage.py.

Two views:

  token-report.py static [--json] [COMMAND ...]
      Estimated context each command loads into the MAIN conversation: wrapper +
      SKILL.md + command body + shared blocks + nested command bodies it runs, per
      tests/load-manifest.json. Subagent files are listed separately — they load
      into the subagent's own context, not the caller's. Estimate = bytes / 4.

  token-report.py transcript FILE.jsonl [FILE.jsonl ...]
      Real usage from `claude -p --output-format stream-json --verbose` output:
      cost, turns, per-model tokens (result.modelUsage), and per-subagent usage
      (system task_started / task_notification events).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN_ROOT = os.path.dirname(HERE)
MANIFEST = os.path.join(HERE, "load-manifest.json")


def est_tokens(nbytes):
    return (nbytes + 3) // 4


def file_stats(relpath):
    p = os.path.join(PLUGIN_ROOT, relpath)
    data = open(p, "rb").read()
    return {"file": relpath, "bytes": len(data), "lines": data.count(b"\n"), "tokens": est_tokens(len(data))}


def load_manifest():
    return json.load(open(MANIFEST, encoding="utf-8"))


def command_load(name, manifest):
    entry = manifest["commands"].get(name)
    base = manifest["always"]
    wrapper = f"commands/{name}.md"
    body = f"skills/agentic-engineering/commands/{name}.md"
    if entry is None:
        # Default: wrapper + router + own body + the shared blocks it names.
        text = open(os.path.join(PLUGIN_ROOT, body), encoding="utf-8").read()
        main = [wrapper] + base + [body]
        for shared in sorted(os.listdir(os.path.join(PLUGIN_ROOT, "skills/agentic-engineering/shared"))):
            if f"shared/{shared}" in text:
                main.append(f"skills/agentic-engineering/shared/{shared}")
        return main, []
    main = [wrapper] + base + entry.get("main", [body])
    return main, entry.get("subagents", [])


def static(argv):
    as_json = "--json" in argv
    names = [a for a in argv if not a.startswith("--")]
    manifest = load_manifest()
    if not names:
        names = sorted(f[:-3] for f in os.listdir(os.path.join(PLUGIN_ROOT, "commands")) if f.endswith(".md"))
    rows = []
    for n in names:
        main, subs = command_load(n, manifest)
        stats = [file_stats(f) for f in main]
        sub_stats = [file_stats(f) for f in subs]
        rows.append({
            "command": n,
            "files": stats,
            "main_bytes": sum(s["bytes"] for s in stats),
            "main_lines": sum(s["lines"] for s in stats),
            "main_tokens": sum(s["tokens"] for s in stats),
            "subagent_tokens": sum(s["tokens"] for s in sub_stats),
            "subagent_files": [s["file"] for s in sub_stats],
        })
    if as_json:
        print(json.dumps(rows, indent=1))
        return 0
    print("STATIC LOAD ESTIMATE (main context; tokens ≈ bytes/4)")
    print("-" * 78)
    print(f"{'command':<12} {'files':>5} {'lines':>7} {'bytes':>9} {'~tokens':>9}   {'subagents ~tok':>14}")
    print("-" * 78)
    for r in rows:
        print(f"/{r['command']:<11} {len(r['files']):>5} {r['main_lines']:>7} {r['main_bytes']:>9,} "
              f"{r['main_tokens']:>9,}   {r['subagent_tokens']:>14,}")
    if len(rows) <= 3:
        for r in rows:
            print(f"\n/{r['command']} loads:")
            for s in r["files"]:
                print(f"  {s['tokens']:>7,}  {s['file']}")
    return 0


def transcript(paths):
    grand_cost = 0.0
    for path in paths:
        rows = []
        for line in open(path, encoding="utf-8", errors="replace"):
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass
        result = next((d for d in reversed(rows) if d.get("type") == "result"), None)
        started = {d.get("tool_use_id"): d for d in rows
                   if d.get("type") == "system" and d.get("subtype") == "task_started"}
        done = [d for d in rows if d.get("type") == "system" and d.get("subtype") == "task_notification"]
        print("=" * 78)
        print(f"TOKEN USAGE — {os.path.relpath(path)}")
        print("=" * 78)
        if result is None:
            print("  no result event (run aborted or timed out)")
            continue
        cost = float(result.get("total_cost_usd") or 0)
        grand_cost += cost
        print(f"  status: {result.get('subtype')}  turns: {result.get('num_turns')}  "
              f"duration: {(result.get('duration_ms') or 0) / 1000:.0f}s  cost: ${cost:.3f}")
        print(f"  {'model':<34} {'input':>9} {'output':>9} {'cache rd':>11} {'cache wr':>10} {'cost':>8}")
        for model, u in (result.get("modelUsage") or {}).items():
            print(f"  {model:<34} {u.get('inputTokens', 0):>9,} {u.get('outputTokens', 0):>9,} "
                  f"{u.get('cacheReadInputTokens', 0):>11,} {u.get('cacheCreationInputTokens', 0):>10,} "
                  f"${u.get('costUSD', 0):>7.3f}")
        if done:
            print(f"  {'subagent':<34} {'tokens':>9} {'tools':>6} {'secs':>6}")
            for d in done:
                s = started.get(d.get("tool_use_id"), {})
                u = d.get("usage") or {}
                label = s.get("subagent_type") or s.get("description") or d.get("task_id")
                print(f"  {str(label)[:34]:<34} {u.get('total_tokens', 0):>9,} {u.get('tool_uses', 0):>6} "
                      f"{(u.get('duration_ms') or 0) / 1000:>6.0f}")
    if len(paths) > 1:
        print(f"\nTOTAL COST: ${grand_cost:.3f}")
    return 0


def main(argv):
    if len(argv) < 2 or argv[1] not in ("static", "transcript"):
        print(__doc__)
        return 2
    if argv[1] == "static":
        return static(argv[2:])
    return transcript(argv[2:])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
