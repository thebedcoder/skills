from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import closing
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class Job:
    id: str
    ticket_id: str
    command: str
    trigger: str
    requester: str
    created_at: float
    payload: dict = field(default_factory=dict)


_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    command TEXT NOT NULL,
    trigger TEXT NOT NULL,
    requester TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at REAL NOT NULL,
    claimed_at REAL,
    completed_at REAL,
    state TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_ticket ON jobs(ticket_id);
"""


class Queue:
    def __init__(self, path: str | Path):
        self.path = str(path)
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)
            db.commit()

    def _conn(self):
        return sqlite3.connect(self.path, isolation_level=None)

    def enqueue(self, ticket_id: str, command: str, trigger: str, requester: str, payload: Optional[dict] = None) -> str:
        job_id = str(uuid.uuid4())
        with closing(self._conn()) as db:
            db.execute(
                "INSERT INTO jobs (id, ticket_id, command, trigger, requester, payload, created_at, state) VALUES (?,?,?,?,?,?,?, 'pending')",
                (job_id, ticket_id, command, trigger, requester, json.dumps(payload or {}), time.time()),
            )
        return job_id

    def claim_next(self, claim_timeout_s: float = 300) -> Optional[Job]:
        now = time.time()
        with closing(self._conn()) as db:
            db.execute("BEGIN IMMEDIATE")
            cur = db.execute(
                "SELECT id, ticket_id, command, trigger, requester, payload, created_at FROM jobs "
                "WHERE state='pending' OR (state='claimed' AND claimed_at < ?) "
                "ORDER BY created_at LIMIT 1",
                (now - claim_timeout_s,),
            )
            row = cur.fetchone()
            if not row:
                db.execute("ROLLBACK")
                return None
            db.execute("UPDATE jobs SET state='claimed', claimed_at=? WHERE id=?", (now, row[0]))
            db.execute("COMMIT")
            return Job(
                id=row[0], ticket_id=row[1], command=row[2], trigger=row[3],
                requester=row[4], payload=json.loads(row[5]), created_at=row[6],
            )

    def complete(self, job_id: str) -> None:
        with closing(self._conn()) as db:
            db.execute("UPDATE jobs SET state='done', completed_at=? WHERE id=?", (time.time(), job_id))

    def fail(self, job_id: str, error: str) -> None:
        with closing(self._conn()) as db:
            db.execute(
                "UPDATE jobs SET state='failed', completed_at=?, payload=json_set(payload, '$.error', ?) WHERE id=?",
                (time.time(), error, job_id),
            )

    def depth(self) -> dict:
        with closing(self._conn()) as db:
            out = {}
            for state in ("pending", "claimed", "done", "failed"):
                cur = db.execute("SELECT count(*) FROM jobs WHERE state=?", (state,))
                out[state] = cur.fetchone()[0]
            return out

    def recent_for_ticket(self, ticket_id: str, command: str, since_ts: float) -> Optional[Job]:
        with closing(self._conn()) as db:
            cur = db.execute(
                "SELECT id, ticket_id, command, trigger, requester, payload, created_at "
                "FROM jobs WHERE ticket_id=? AND command=? AND created_at >= ? "
                "ORDER BY created_at DESC LIMIT 1",
                (ticket_id, command, since_ts),
            )
            row = cur.fetchone()
            if not row:
                return None
            return Job(
                id=row[0], ticket_id=row[1], command=row[2], trigger=row[3],
                requester=row[4], payload=json.loads(row[5]), created_at=row[6],
            )
