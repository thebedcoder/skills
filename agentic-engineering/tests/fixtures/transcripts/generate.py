#!/usr/bin/env python3
"""Regenerate the synthetic transcript fixtures (deterministic).

Shape follows a real Claude Code 2.1.286 on-disk session file: one JSON object per
line, one content block per line, parallel tool calls on separate lines sharing
one message.id, tool results as user lines. Only the fields the tools read are
kept; usage blocks and request ids are dropped.

  review-parallel.jsonl    /ship --auto, seven reviewers in ONE assistant message
  review-sequential.jsonl  /ship --auto, seven reviewers dispatched one per message
                           (the deviation commands/review.md forbids)
  review-parallel.stream.jsonl
                           the parallel run in `claude -p --output-format stream-json`
                           shape, plus a SUBAGENT-thread line (parent_tool_use_id set)
                           that dispatches an agent — main-thread filters must skip it
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
CWD = "/work/fixture"
SID = "00000000-0000-4000-8000-000000000001"
ROOT = "/plugins/agentic-engineering"
REVIEWERS = ["ae-red", "ae-req", "ae-test", "ae-doc", "ae-sec", "ae-edge", "ae-lean"]


class T:
    def __init__(self):
        self.lines, self.n, self.parent = [], 0, None

    def _base(self, kind):
        self.n += 1
        u = f"00000000-0000-4000-9000-{self.n:012d}"
        d = {"parentUuid": self.parent, "isSidechain": False, "type": kind, "uuid": u,
             "timestamp": f"2026-09-30T10:{self.n // 60:02d}:{self.n % 60:02d}.000Z",
             "userType": "external", "cwd": CWD, "sessionId": SID, "version": "2.1.286",
             "gitBranch": "feat/multiply"}
        self.parent = u
        return d

    def user(self, content, meta=False):
        d = self._base("user")
        d["message"] = {"role": "user", "content": content}
        if meta:
            d["isMeta"] = True
        self.lines.append(d)

    def assistant(self, mid, block):
        d = self._base("assistant")
        d["message"] = {"model": "claude-sonnet-5-5", "id": mid, "type": "message",
                        "role": "assistant", "content": [block]}
        self.lines.append(d)

    def tool(self, mid, tid, name, inp):
        self.assistant(mid, {"type": "tool_use", "id": tid, "name": name, "input": inp})

    def result(self, tid, text):
        self.user([{"tool_use_id": tid, "type": "tool_result", "content": text}])

    def write(self, name):
        with open(os.path.join(HERE, name), "w", encoding="utf-8") as f:
            for d in self.lines:
                f.write(json.dumps(d, ensure_ascii=False) + "\n")


def prelude(t):
    t.user("<command-message>agentic-engineering:ship</command-message>\n"
           "<command-name>/agentic-engineering:ship</command-name>\n<command-args>--auto</command-args>")
    t.user([{"type": "text", "text": f"Read `{ROOT}/skills/agentic-engineering/commands/ship.md` — that file "
             "holds the real instructions; this wrapper holds none.\n\nFollow it. Arguments: --auto"}], meta=True)
    t.tool("msg_A", "toolu_A1", "Read", {"file_path": f"{ROOT}/skills/agentic-engineering/commands/ship.md"})
    t.result("toolu_A1", "(ship.md body)")
    t.tool("msg_B", "toolu_B1", "Read", {"file_path": f"{ROOT}/skills/agentic-engineering/shared/preamble.md"})
    t.result("toolu_B1", "(preamble body)")
    t.tool("msg_C", "toolu_C1", "Write", {"file_path": f"{CWD}/.agentic/focus.md", "content":
           "# CURRENT\ntitle: STORY-001 — Multiply\nset_by: /ship (auto)\n\n# PLAN\n"
           "- [x] Implement STORY-001 backend + tests\n- [ ] Backend review — 7-agent batch\n"})
    t.result("toolu_C1", "File written")
    t.tool("msg_D", "toolu_D1", "Read", {"file_path": f"{ROOT}/skills/agentic-engineering/commands/review.md"})
    t.result("toolu_D1", "(review.md body)")
    t.tool("msg_E", "toolu_E1", "Bash", {"command": "mkdir -p .agentic/review && git diff \"$BASE\"...HEAD > "
                                          ".agentic/review/STORY-001.diff"})
    t.result("toolu_E1", "")


def dispatch_input(agent):
    return {"description": f"{agent} review", "subagent_type": f"agentic-engineering:{agent}",
            "prompt": f"Review STORY-001. Diff: .agentic/review/STORY-001.diff. Plugin root: {ROOT}. "
                      "Do NOT write, edit, or create any file in the repository."}


def epilogue(t, mid):
    t.assistant(mid, {"type": "text", "text": "━━━ REVIEW: STORY-001 ━━━\n\nBlockers: none\n"})
    t.tool("msg_Z", "toolu_Z1", "Bash", {"command": "git commit -m \"docs(main): STORY-001 — review\""})
    t.result("toolu_Z1", "[feat/multiply abc1234] docs(main): STORY-001 — review")


# Parallel: seven Agent tool_use lines share msg_F.
t = T()
prelude(t)
t.assistant("msg_F", {"type": "text", "text": "Dispatching the 7-agent batch."})
for i, a in enumerate(REVIEWERS):
    t.tool("msg_F", f"toolu_F{i}", "Agent", dispatch_input(a))
for i, a in enumerate(REVIEWERS):
    t.result(f"toolu_F{i}", f"{a.upper()} — clean")
epilogue(t, "msg_G")
t.write("review-parallel.jsonl")

# Sequential: one Agent per assistant message, waiting for each result.
t = T()
prelude(t)
for i, a in enumerate(REVIEWERS):
    mid = f"msg_S{i}"
    if i == 0:
        t.assistant(mid, {"type": "text", "text": "Starting with RED, then the others one at a time."})
    t.tool(mid, f"toolu_S{i}", "Agent", dispatch_input(a))
    t.result(f"toolu_S{i}", f"{a.upper()} — clean")
epilogue(t, "msg_G")
t.write("review-sequential.jsonl")

# stream-json variant of the parallel run.
t = T()
prelude(t)
t.assistant("msg_F", {"type": "text", "text": "Dispatching the 7-agent batch."})
for i, a in enumerate(REVIEWERS):
    t.tool("msg_F", f"toolu_F{i}", "Agent", dispatch_input(a))
for i, a in enumerate(REVIEWERS):
    t.result(f"toolu_F{i}", f"{a.upper()} — clean")
epilogue(t, "msg_G")
stream = [{"type": "system", "subtype": "init", "session_id": SID, "cwd": CWD}]
for d in t.lines:
    stream.append({"type": d["type"], "message": d["message"], "parent_tool_use_id": None, "session_id": SID})
# A subagent's own line: must never count as a main-thread dispatch.
stream.insert(20, {"type": "assistant", "parent_tool_use_id": "toolu_F0", "session_id": SID,
                   "message": {"id": "msg_SUB", "role": "assistant", "content": [
                       {"type": "tool_use", "id": "toolu_SUB", "name": "Agent",
                        "input": {"subagent_type": "agentic-engineering:ae-red", "prompt": "nested"}}]}})
stream.append({"type": "result", "subtype": "success", "num_turns": 9, "total_cost_usd": 0.5,
               "result": "━━━ REVIEW: STORY-001 ━━━", "modelUsage": {}})
with open(os.path.join(HERE, "review-parallel.stream.jsonl"), "w", encoding="utf-8") as f:
    for d in stream:
        f.write(json.dumps(d, ensure_ascii=False) + "\n")
