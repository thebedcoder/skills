from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


_BRAIN_RE = re.compile(r"(?:^|\n)\s*/brain(?:\s+(\S+))?(?:\s+(.*))?")

VALID_COMMANDS = {
    "groom", "estimate", "edges", "related",
    "draft-tickets", "refresh", "explain", "on", "off",
}


@dataclass
class BrainCommand:
    command: str
    args: str = ""


def parse_brain_command(comment_body: str) -> Optional[BrainCommand]:
    if not comment_body:
        return None
    m = _BRAIN_RE.search(comment_body)
    if not m:
        return None
    cmd = (m.group(1) or "groom").lower().strip()
    args = (m.group(2) or "").strip()
    if cmd not in VALID_COMMANDS:
        return None
    return BrainCommand(command=cmd, args=args)
