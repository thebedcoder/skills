from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from ..models import Ticket, TicketDraft, Comment, WebhookEvent


class PMAdapter(ABC):
    """Abstract project-management tool interface.

    Concrete adapters wrap Aha, Linear, Jira, etc. The orchestrator never
    accesses tool-native concepts; everything goes through this interface.
    """

    def __init__(self, config):
        self.config = config

    @abstractmethod
    def fetch_ticket(self, ticket_id: str) -> Ticket: ...

    @abstractmethod
    def search_tickets(
        self,
        keywords: Optional[str] = None,
        labels: Optional[list[str]] = None,
        parent_id: Optional[str] = None,
        type: Optional[str] = None,
        limit: int = 30,
    ) -> list[Ticket]: ...

    @abstractmethod
    def list_siblings(self, ticket_id: str, limit: int = 30) -> list[Ticket]: ...

    @abstractmethod
    def create_ticket(self, draft: TicketDraft) -> Ticket: ...

    @abstractmethod
    def link_tickets(self, parent_id: str, child_ids: list[str]) -> None: ...

    @abstractmethod
    def post_comment(self, ticket_id: str, body: str) -> Comment: ...

    @abstractmethod
    def edit_comment(self, ticket_id: str, comment_id: str, body: str) -> Comment: ...

    @abstractmethod
    def list_comments(self, ticket_id: str) -> list[Comment]: ...

    @abstractmethod
    def verify_webhook(self, headers: dict, body: bytes) -> bool: ...

    @abstractmethod
    def parse_webhook(self, body: bytes) -> WebhookEvent: ...
