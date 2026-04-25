from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Request

from ..adapters import get as get_adapter
from ..config import Config
from .commands import parse_brain_command
from .queue import Queue


def build_app(config: Config, queue: Optional[Queue] = None) -> FastAPI:
    app = FastAPI(title="product-brain bot")
    queue = queue or Queue(config.queue.path)
    adapter = get_adapter(config.pm_adapter, config)

    @app.get("/healthz")
    def healthz():
        return {"ok": True, "queue": queue.depth()}

    @app.post("/webhook/aha")
    async def webhook_aha(request: Request):
        body = await request.body()
        if not adapter.verify_webhook(dict(request.headers), body):
            raise HTTPException(status_code=401, detail="invalid signature")

        event = adapter.parse_webhook(body)

        if event.kind == "comment_created" and event.comment:
            author = event.comment.author
            if author not in config.bot.allowed_users:
                return {"status": "ignored", "reason": "author not allowed"}
            cmd = parse_brain_command(event.comment.body)
            if not cmd:
                return {"status": "ignored", "reason": "no /brain command"}
            if not event.ticket_id:
                return {"status": "ignored", "reason": "no ticket id"}
            queue.enqueue(
                ticket_id=event.ticket_id,
                command=cmd.command,
                trigger=f"comment:/brain {cmd.command}",
                requester=author,
                payload={"args": cmd.args},
            )
            return {"status": "queued", "command": cmd.command}

        if event.kind == "ticket_status_changed" and event.ticket_id:
            ticket = adapter.fetch_ticket(event.ticket_id)
            if config.bot.opt_in_label not in ticket.labels:
                return {"status": "ignored", "reason": "no opt-in label"}
            if config.bot.kill_switch_label in ticket.labels:
                return {"status": "ignored", "reason": "kill switch on"}
            queue.enqueue(
                ticket_id=event.ticket_id,
                command="groom",
                trigger=f"status:{event.prev_status}->{event.new_status}",
                requester="system",
                payload={"auto": True},
            )
            return {"status": "queued", "command": "groom"}

        return {"status": "ignored", "kind": event.kind}

    return app
