from __future__ import annotations

import time
import traceback
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional

from ..adapters import get as get_adapter
from ..config import Config
from ..models import TicketDraft
from ..planner import run_command
from .audit import AuditEntry, AuditLog
from .comment import build_comment, content_hash, locate_existing
from .cooldown import in_quiet_hours, within_cooldown
from .queue import Job, Queue


def _process_job(job: Job, config: Config, queue: Queue, audit: AuditLog) -> None:
    adapter = get_adapter(config.pm_adapter, config)
    now = datetime.now(timezone.utc)

    is_auto = job.trigger.startswith("status:") or job.trigger.startswith("auto:")
    is_manual = job.trigger.startswith("comment:") or job.requester != "system"

    last = audit.last_for_ticket(job.ticket_id, job.command)
    if is_auto:
        if last and within_cooldown(last.timestamp, now, config.bot.cooldown_hours):
            queue.complete(job.id)
            return
        if in_quiet_hours(now, config.bot.quiet_hours_utc):
            queue.complete(job.id)
            return

    body, summary, model, cost = run_command(config, job.command, job.ticket_id, args=job.payload.get("args", ""))

    h = content_hash(body)
    if last and last.input_hash == h:
        queue.complete(job.id)
        audit.append(AuditEntry(
            id=str(uuid.uuid4()), timestamp=time.time(), trigger=job.trigger,
            ticket_id=job.ticket_id, command=job.command, requester=job.requester,
            input_hash=h, output_summary="(skipped: unchanged)", model=model, cost_usd=0.0,
        ))
        return

    change_note: Optional[str] = None
    if last and last.input_hash and last.input_hash != h:
        change_note = "Inputs changed since last run."

    run_id = str(uuid.uuid4())
    full_body = build_comment(
        body=body,
        command=job.command,
        trigger=job.trigger,
        requester=job.requester,
        run_id=run_id,
        change_note=change_note,
        run_at=now,
    )

    if job.command == "draft-tickets":
        adapter.post_comment(job.ticket_id, full_body)
        for draft in _extract_drafts(body):
            adapter.create_ticket(TicketDraft(
                title=draft["title"],
                description=draft["description"],
                parent_id=job.ticket_id,
                status=config.bot.draft_status,
            ))
    else:
        comments = adapter.list_comments(job.ticket_id)
        existing = locate_existing(comments, job.command)
        if existing:
            adapter.edit_comment(job.ticket_id, existing.id, full_body)
        else:
            adapter.post_comment(job.ticket_id, full_body)

    audit.append(AuditEntry(
        id=run_id, timestamp=time.time(), trigger=job.trigger,
        ticket_id=job.ticket_id, command=job.command, requester=job.requester,
        input_hash=h, output_summary=summary, model=model, cost_usd=cost,
    ))
    queue.complete(job.id)


def _extract_drafts(body: str) -> list[dict]:
    out: list[dict] = []
    in_section = False
    current: dict = {}
    lines = body.splitlines()
    for line in lines:
        if line.strip().startswith("## Draft sub-tickets"):
            in_section = True
            continue
        if not in_section:
            continue
        if line.startswith("### "):
            if current:
                out.append(current)
            current = {"title": line[4:].strip(), "description": ""}
        elif current:
            current["description"] += line + "\n"
    if current:
        out.append(current)
    return out


def run_worker(config: Config, poll_seconds: float = 2.0):
    queue = Queue(config.queue.path)
    audit = AuditLog(config.audit.path)
    while True:
        job = queue.claim_next()
        if not job:
            time.sleep(poll_seconds)
            continue
        try:
            _process_job(job, config, queue, audit)
        except Exception as e:
            queue.fail(job.id, f"{e}\n{traceback.format_exc()}")
            audit.append(AuditEntry(
                id=str(uuid.uuid4()), timestamp=time.time(), trigger=job.trigger,
                ticket_id=job.ticket_id, command=job.command, requester=job.requester,
                error=str(e),
            ))
