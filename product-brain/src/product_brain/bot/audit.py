from __future__ import annotations

import json
import sqlite3
import time
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    timestamp REAL NOT NULL,
    trigger TEXT NOT NULL,
    ticket_id TEXT NOT NULL,
    command TEXT NOT NULL,
    requester TEXT NOT NULL,
    input_hash TEXT,
    output_summary TEXT,
    model TEXT,
    cost_usd REAL,
    error TEXT,
    raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_ticket ON runs(ticket_id, timestamp);
"""


@dataclass
class AuditEntry:
    id: str
    timestamp: float
    trigger: str
    ticket_id: str
    command: str
    requester: str
    input_hash: Optional[str] = None
    output_summary: Optional[str] = None
    model: Optional[str] = None
    cost_usd: Optional[float] = None
    error: Optional[str] = None
    raw: Optional[dict] = None


class AuditLog:
    def __init__(self, path: str | Path):
        self.path = str(path)
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)
            db.commit()

    def append(self, entry: AuditEntry) -> None:
        with closing(sqlite3.connect(self.path, isolation_level=None)) as db:
            db.execute(
                "INSERT INTO runs (id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error, raw) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    entry.id, entry.timestamp, entry.trigger, entry.ticket_id, entry.command,
                    entry.requester, entry.input_hash, entry.output_summary, entry.model,
                    entry.cost_usd, entry.error, json.dumps(entry.raw or {}),
                ),
            )

    def last_for_ticket(self, ticket_id: str, command: str) -> Optional[AuditEntry]:
        with closing(sqlite3.connect(self.path)) as db:
            cur = db.execute(
                "SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error, raw "
                "FROM runs WHERE ticket_id=? AND command=? ORDER BY timestamp DESC LIMIT 1",
                (ticket_id, command),
            )
            row = cur.fetchone()
            if not row:
                return None
            return AuditEntry(
                id=row[0], timestamp=row[1], trigger=row[2], ticket_id=row[3],
                command=row[4], requester=row[5], input_hash=row[6],
                output_summary=row[7], model=row[8], cost_usd=row[9],
                error=row[10], raw=json.loads(row[11] or "{}"),
            )

    def tail(self, limit: int = 50) -> list[AuditEntry]:
        with closing(sqlite3.connect(self.path)) as db:
            cur = db.execute(
                "SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error, raw "
                "FROM runs ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
            return [
                AuditEntry(
                    id=r[0], timestamp=r[1], trigger=r[2], ticket_id=r[3],
                    command=r[4], requester=r[5], input_hash=r[6],
                    output_summary=r[7], model=r[8], cost_usd=r[9],
                    error=r[10], raw=json.loads(r[11] or "{}"),
                )
                for r in cur.fetchall()
            ]
