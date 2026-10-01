#!/usr/bin/env python3
"""No hardcoded ~/.claude paths in shipped content.

The plugin lives in ~/.claude/plugins/cache/<owner>/<plugin>/<version>/, so a
~/.claude/skills/… or ~/.claude/agents/… path resolves to nothing. The only
legitimate reference to the config dir is ${CLAUDE_CONFIG_DIR:-$HOME/.claude},
used to find session transcripts — it honours a relocated config dir."""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from check import Check, rel, shipped_files  # noqa: E402

c = Check("no hardcoded ~/.claude paths")

TILDE = re.compile(r"~/\.claude")
HOME = re.compile(r"(?<!CLAUDE_CONFIG_DIR:-)(\$HOME|\$\{HOME\})/\.claude")

hits = []
for path in shipped_files():
    for n, line in enumerate(open(path, encoding="utf-8", errors="replace"), 1):
        if TILDE.search(line) or HOME.search(line):
            hits.append(f"{rel(path)}:{n}: {line.strip()[:120]}")

c.expect(not hits, "shipped content has no ~/.claude or bare $HOME/.claude literal", "\n".join(hits))
c.exit()
