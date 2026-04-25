# PM adapter interface

Product Brain treats the project-management tool as pluggable. The orchestrator only ever talks to a `PMAdapter` instance; concrete adapters wrap Aha, Linear, Jira, etc.

## Interface

`src/product_brain/adapters/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Ticket:
    id: str                          # e.g. "AHA-1234"
    title: str
    description: str
    type: str                        # feature | bug | chore | spike | epic | unknown
    status: str                      # tool-native status string
    labels: list[str] = field(default_factory=list)
    parent_id: Optional[str] = None
    children_ids: list[str] = field(default_factory=list)
    url: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    raw: dict = field(default_factory=dict)   # tool-specific payload, opaque to the planner

@dataclass
class TicketDraft:
    title: str
    description: str
    type: str = "feature"
    parent_id: Optional[str] = None
    labels: list[str] = field(default_factory=list)
    status: Optional[str] = None     # adapter may override with config.bot.draft_status

@dataclass
class Comment:
    id: str
    ticket_id: str
    author: str                      # email or handle the adapter normalizes to
    body: str
    created_at: datetime

class PMAdapter(ABC):
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
    def parse_webhook(self, body: bytes) -> "WebhookEvent": ...
```

`WebhookEvent` is a simple struct: `{kind, ticket_id, comment, prev_status, new_status}`.

## Aha implementation

`src/product_brain/adapters/aha.py` ships out of the box. Notes:

- **Endpoint**: `https://<subdomain>.aha.io/api/v1/`
- **Auth**: bearer token (`Authorization: Bearer $AHA_API_KEY`)
- **Ticket type mapping**: Aha uses Features/Requirements/Ideas. Adapter normalizes:
  - feature → `feature`
  - requirement → `feature` (still "thing to build")
  - idea → `spike`
  - bug (when typed via custom field) → `bug`
- **Status mapping**: tool-native string passed through. Use `raw.workflow_status` to access.
- **Comments**: Aha calls them "comments"; behaves as expected.
- **Webhook signing**: HMAC-SHA256 in `X-Aha-Signature`.

## Adding a new adapter (e.g. Linear)

1. Create `src/product_brain/adapters/linear.py`.
2. Subclass `PMAdapter`, implement all abstract methods.
3. Register in `adapters/__init__.py`:
   ```python
   from .linear import LinearAdapter
   ADAPTERS["linear"] = LinearAdapter
   ```
4. Set `pm_adapter: linear` in `config.yaml` and add a `linear:` config block.

The orchestrator never touches Linear-specific concepts; everything goes through the abstract interface.

## What the abstract interface deliberately does not include

- **Ticket size estimation**: the PM tool's "story points" field is unreliable across teams; we estimate from git churn instead.
- **Workflow transitions**: bot only creates drafts in a single configured `draft_status`; never promotes through workflow states.
- **User assignment**: bot never assigns owners; that's a human decision.
- **Custom fields**: accessed through `Ticket.raw` if needed by adapter-specific logic, but the planner doesn't depend on them.

## Webhook handling

The bot's webhook endpoint:
1. Reads `Content-Type` and signature header.
2. Calls `adapter.verify_webhook(headers, body)`. False → 401.
3. Calls `adapter.parse_webhook(body)` → `WebhookEvent`.
4. Routes by `event.kind`:
   - `comment_created`: parse for `/brain <cmd>` from `event.comment.author`.
   - `ticket_status_changed`: queue `/brain groom` if config + label conditions match.
   - `ticket_created`: ignored by default (too noisy).

See [bot.md](bot.md) for full bot dynamics.
