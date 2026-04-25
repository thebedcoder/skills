from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class FileChange:
    path: str
    change: str
    loc_added: int = 0
    loc_removed: int = 0


@dataclass
class Commit:
    sha: str
    author: str
    author_email: str
    date: datetime
    subject: str
    body: str
    parents: list[str] = field(default_factory=list)
    files: list[FileChange] = field(default_factory=list)
    tickets: list[str] = field(default_factory=list)


@dataclass
class PRComment:
    author: str
    body: str
    file: Optional[str] = None
    line: Optional[int] = None
    sha: Optional[str] = None


@dataclass
class PullRequest:
    number: int
    title: str
    body: str
    labels: list[str] = field(default_factory=list)
    opened_at: Optional[datetime] = None
    merged_at: Optional[datetime] = None
    review_comments: list[PRComment] = field(default_factory=list)


@dataclass
class Ticket:
    id: str
    title: str = ""
    description: str = ""
    type: str = "unknown"
    status: str = ""
    labels: list[str] = field(default_factory=list)
    parent_id: Optional[str] = None
    children_ids: list[str] = field(default_factory=list)
    url: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    raw: dict = field(default_factory=dict)


@dataclass
class TicketDraft:
    title: str
    description: str
    type: str = "feature"
    parent_id: Optional[str] = None
    labels: list[str] = field(default_factory=list)
    status: Optional[str] = None


@dataclass
class Comment:
    id: str
    ticket_id: str
    author: str
    body: str
    created_at: datetime


@dataclass
class WebhookEvent:
    kind: str
    ticket_id: Optional[str] = None
    comment: Optional[Comment] = None
    prev_status: Optional[str] = None
    new_status: Optional[str] = None
    raw: dict = field(default_factory=dict)


@dataclass
class EdgeCaseBullet:
    text: str
    source: str
    source_ticket: Optional[str] = None


@dataclass
class TicketRecord:
    ticket: str
    title: str = ""
    type: str = "unknown"
    status: str = "in_progress"
    first_commit: Optional[datetime] = None
    last_commit: Optional[datetime] = None
    shas: list[str] = field(default_factory=list)
    prs: list[int] = field(default_factory=list)
    authors: list[str] = field(default_factory=list)
    files: list[FileChange] = field(default_factory=list)
    symbols: list[str] = field(default_factory=list)
    related_tickets: list[str] = field(default_factory=list)
    reverted_by: list[str] = field(default_factory=list)
    linked_bugs: list[str] = field(default_factory=list)
    loc_added: int = 0
    loc_removed: int = 0
    duration_days: float = 0.0
    pr_open_to_merge_days: Optional[float] = None
    manual_sections: list[str] = field(default_factory=list)
    what_shipped: str = ""
    key_decisions: list[str] = field(default_factory=list)
    edge_cases_handled: list[EdgeCaseBullet] = field(default_factory=list)
    known_gaps: list[EdgeCaseBullet] = field(default_factory=list)
    manual_body: str = ""
    repo: str = ""


@dataclass
class Manifest:
    repo: str
    ticket_regex: str = r"AHA-\d+"
    workflow: str = "squash"
    languages: list[str] = field(default_factory=list)
    entry_points: list[str] = field(default_factory=list)
    owners_file: str = "CODEOWNERS"
    ignore_paths: list[str] = field(default_factory=list)
    mega_file_threshold: float = 0.95
    last_indexed_sha: str = ""
    index_cutoff_date: str = ""
    body: str = ""
