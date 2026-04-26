from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Optional

from ..models import Comment


COMMENT_HEADER_PREFIX = "🧠 **product-brain**"


def _header(command: str, run_at: datetime) -> str:
    return f"{COMMENT_HEADER_PREFIX} · {command} · run {run_at.strftime('%Y-%m-%d %H:%M')}"


def build_comment(
    body: str,
    command: str,
    trigger: str,
    requester: str,
    run_id: str,
    audit_url: Optional[str] = None,
    change_note: Optional[str] = None,
    run_at: Optional[datetime] = None,
) -> str:
    run_at = run_at or datetime.now(timezone.utc)
    parts = [_header(command, run_at)]
    if change_note:
        parts.append(f"_{change_note}_")
    parts.append("")
    parts.append(body.strip())
    parts.append("")
    parts.append("---")
    footer = (
        f"<sub>Trigger: {trigger} by {requester} · "
        f"Re-run with `/brain refresh` · Disable with label `brain:off`"
    )
    if audit_url:
        footer += f" · [Audit log]({audit_url})"
    footer += f" · run_id={run_id}</sub>"
    parts.append(footer)
    return "\n".join(parts)


def locate_existing(comments: list[Comment], command: str) -> Optional[Comment]:
    for c in comments:
        if c.body.startswith(COMMENT_HEADER_PREFIX) and f"· {command} ·" in c.body:
            return c
    return None


def content_hash(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8", errors="replace"))
        h.update(b"\x00")
    return h.hexdigest()[:16]
