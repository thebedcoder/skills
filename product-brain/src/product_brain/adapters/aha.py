from __future__ import annotations

import hmac
import hashlib
import json
from datetime import datetime
from typing import Optional

import httpx

from ..models import Comment, Ticket, TicketDraft, WebhookEvent
from .base import PMAdapter


_TYPE_MAP = {
    "feature": "feature",
    "requirement": "feature",
    "idea": "spike",
    "epic": "epic",
}


def _parse_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


class AhaAdapter(PMAdapter):
    def __init__(self, config):
        super().__init__(config)
        self.base = f"https://{config.aha.subdomain}.aha.io/api/v1"
        self._client = httpx.Client(
            headers={
                "Authorization": f"Bearer {config.aha_api_key()}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )

    def _get(self, path: str, **params) -> dict:
        r = self._client.get(f"{self.base}{path}", params=params)
        r.raise_for_status()
        return r.json()

    def _post(self, path: str, payload: dict) -> dict:
        r = self._client.post(f"{self.base}{path}", json=payload)
        r.raise_for_status()
        return r.json()

    def _put(self, path: str, payload: dict) -> dict:
        r = self._client.put(f"{self.base}{path}", json=payload)
        r.raise_for_status()
        return r.json()

    def _to_ticket(self, raw: dict) -> Ticket:
        feature = raw.get("feature", raw)
        kind_raw = feature.get("type", "feature").lower() if isinstance(feature.get("type"), str) else "feature"
        return Ticket(
            id=feature["reference_num"],
            title=feature.get("name", ""),
            description=feature.get("description", {}).get("body", "") if isinstance(feature.get("description"), dict) else (feature.get("description") or ""),
            type=_TYPE_MAP.get(kind_raw, "unknown"),
            status=feature.get("workflow_status", {}).get("name", "") if isinstance(feature.get("workflow_status"), dict) else "",
            labels=[t["name"] for t in feature.get("tags", [])] if isinstance(feature.get("tags"), list) else [],
            parent_id=feature.get("master_feature", {}).get("reference_num") if isinstance(feature.get("master_feature"), dict) else None,
            url=feature.get("url", ""),
            created_at=_parse_dt(feature.get("created_at")),
            updated_at=_parse_dt(feature.get("updated_at")),
            raw=feature,
        )

    def fetch_ticket(self, ticket_id: str) -> Ticket:
        return self._to_ticket(self._get(f"/features/{ticket_id}"))

    def search_tickets(
        self,
        keywords: Optional[str] = None,
        labels: Optional[list[str]] = None,
        parent_id: Optional[str] = None,
        type: Optional[str] = None,
        limit: int = 30,
    ) -> list[Ticket]:
        params: dict = {"per_page": min(limit, 200)}
        if keywords:
            params["q"] = keywords
        if labels:
            params["tag"] = ",".join(labels)
        path = "/features"
        if parent_id:
            path = f"/features/{parent_id}/features"
        data = self._get(path, **params)
        items = data.get("features", [])[:limit]
        return [self._to_ticket({"feature": f}) for f in items]

    def list_siblings(self, ticket_id: str, limit: int = 30) -> list[Ticket]:
        ticket = self.fetch_ticket(ticket_id)
        if not ticket.parent_id:
            return []
        return [
            t for t in self.search_tickets(parent_id=ticket.parent_id, limit=limit)
            if t.id != ticket_id
        ]

    def create_ticket(self, draft: TicketDraft) -> Ticket:
        payload: dict = {
            "feature": {
                "name": draft.title,
                "description": draft.description,
                "tag_list": ",".join(draft.labels),
            }
        }
        if draft.status:
            payload["feature"]["workflow_status"] = draft.status
        if draft.parent_id:
            data = self._post(f"/features/{draft.parent_id}/features", payload)
        else:
            data = self._post("/features", payload)
        return self._to_ticket(data)

    def link_tickets(self, parent_id: str, child_ids: list[str]) -> None:
        for child in child_ids:
            self._put(f"/features/{child}", {"feature": {"master_feature": parent_id}})

    def post_comment(self, ticket_id: str, body: str) -> Comment:
        data = self._post(
            f"/features/{ticket_id}/comments",
            {"comment": {"body": body}},
        )
        c = data.get("comment", {})
        return Comment(
            id=str(c.get("id", "")),
            ticket_id=ticket_id,
            author=c.get("user", {}).get("email", ""),
            body=c.get("body", ""),
            created_at=_parse_dt(c.get("created_at")) or datetime.utcnow(),
        )

    def edit_comment(self, ticket_id: str, comment_id: str, body: str) -> Comment:
        data = self._put(
            f"/comments/{comment_id}",
            {"comment": {"body": body}},
        )
        c = data.get("comment", {})
        return Comment(
            id=str(c.get("id", comment_id)),
            ticket_id=ticket_id,
            author=c.get("user", {}).get("email", ""),
            body=c.get("body", body),
            created_at=_parse_dt(c.get("created_at")) or datetime.utcnow(),
        )

    def list_comments(self, ticket_id: str) -> list[Comment]:
        data = self._get(f"/features/{ticket_id}/comments")
        out: list[Comment] = []
        for c in data.get("comments", []):
            out.append(Comment(
                id=str(c.get("id", "")),
                ticket_id=ticket_id,
                author=c.get("user", {}).get("email", ""),
                body=c.get("body", ""),
                created_at=_parse_dt(c.get("created_at")) or datetime.utcnow(),
            ))
        return out

    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        import os
        secret = os.environ.get(self.config.bot.webhook_signing_secret_env, "")
        if not secret:
            return False
        sent = headers.get("X-Aha-Signature") or headers.get("x-aha-signature") or ""
        mac = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(sent, mac)

    def parse_webhook(self, body: bytes) -> WebhookEvent:
        payload = json.loads(body)
        event = payload.get("event", "")
        if event == "comment.create" or event == "comment.created":
            c = payload.get("comment", {})
            ticket = payload.get("audit", {}).get("auditable_type", "") + ":" + str(payload.get("audit", {}).get("auditable_id", ""))
            ref = payload.get("feature", {}).get("reference_num") or payload.get("audit", {}).get("description", "").split()[-1] if payload.get("feature") else None
            return WebhookEvent(
                kind="comment_created",
                ticket_id=ref,
                comment=Comment(
                    id=str(c.get("id", "")),
                    ticket_id=ref or "",
                    author=c.get("user", {}).get("email", ""),
                    body=c.get("body", ""),
                    created_at=_parse_dt(c.get("created_at")) or datetime.utcnow(),
                ),
                raw=payload,
            )
        if event == "feature.update" or event == "feature.updated":
            f = payload.get("feature", {})
            changes = payload.get("changes", {})
            status_change = changes.get("workflow_status", {})
            return WebhookEvent(
                kind="ticket_status_changed",
                ticket_id=f.get("reference_num"),
                prev_status=status_change.get("from"),
                new_status=status_change.get("to"),
                raw=payload,
            )
        return WebhookEvent(kind="unknown", raw=payload)
