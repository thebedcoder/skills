#!/usr/bin/env python3
"""The behavioral harness's own assertions work — on fixtures, no API key.

A transcript check that always passes is worse than none: it turns a regression
green. Each assertion is run against a fixture where it must pass AND one where
it must fail."""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, PLUGIN_ROOT  # noqa: E402

c = Check("transcript lib (harness self-test)")
TOOL = os.path.join(PLUGIN_ROOT, "tests", "lib", "transcript.py")
FIX = os.path.join(PLUGIN_ROOT, "tests", "fixtures", "transcripts")
ALL7 = "ae-red,ae-req,ae-test,ae-doc,ae-sec,ae-edge,ae-lean"


def run(*args):
    return subprocess.run([sys.executable, TOOL, *args], capture_output=True, text=True)


par, seq, stream = (os.path.join(FIX, f) for f in
                    ("review-parallel.jsonl", "review-sequential.jsonl", "review-parallel.stream.jsonl"))

p = run("batch", par, ALL7)
c.expect(p.returncode == 0, "batch: seven reviewers in one message → pass (on-disk shape)", p.stdout)
p = run("batch", stream, ALL7)
c.expect(p.returncode == 0, "batch: same run in stream-json shape → pass", p.stdout)
p = run("batch", seq, ALL7)
c.expect(p.returncode == 1 and "NOT BATCHED" in p.stdout, "batch: one reviewer per message → fail", p.stdout)
p = run("batch", par, ALL7 + ",ae-ux")
c.expect(p.returncode == 1, "batch: an agent never dispatched → fail", p.stdout)

p = run("dispatches", stream)
c.expect("toolu_SUB" not in p.stdout and p.stdout.count("agentic-engineering:ae-red") == 1,
         "subagent-thread lines (parent_tool_use_id) are not main-thread dispatches", p.stdout[:400])

p = run("routed-to", seq, "ship")
c.expect(p.returncode == 0, "routed-to: typed /agentic-engineering:ship and body read → ship", p.stdout)
p = run("routed-to", seq, "fix")
c.expect(p.returncode == 1, "routed-to: no /fix evidence → fail", p.stdout)

p = run("text", stream)
c.expect("REVIEW: STORY-001" in p.stdout, "text: includes result text", p.stdout[:200])

c.exit()
