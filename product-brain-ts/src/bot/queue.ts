import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

export interface Job {
  id: string;
  ticketId: string;
  command: string;
  trigger: string;
  requester: string;
  createdAt: number;
  payload: Record<string, unknown>;
}

const SCHEMA = `
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
`;

interface JobRow {
  id: string;
  ticket_id: string;
  command: string;
  trigger: string;
  requester: string;
  payload: string;
  created_at: number;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    command: row.command,
    trigger: row.trigger,
    requester: row.requester,
    createdAt: row.created_at,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
  };
}

export class Queue {
  private readonly db: Database.Database;

  constructor(public readonly path: string) {
    this.db = new Database(path);
    this.db.exec(SCHEMA);
  }

  enqueue(
    ticketId: string,
    command: string,
    trigger: string,
    requester: string,
    payload: Record<string, unknown> = {},
  ): string {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO jobs (id, ticket_id, command, trigger, requester, payload, created_at, state) VALUES (?,?,?,?,?,?,?, 'pending')",
      )
      .run(id, ticketId, command, trigger, requester, JSON.stringify(payload), Date.now() / 1000);
    return id;
  }

  claimNext(claimTimeoutS = 300): Job | null {
    const now = Date.now() / 1000;
    const tx = this.db.transaction(() => {
      const row = this.db
        .prepare<[number], JobRow>(
          "SELECT id, ticket_id, command, trigger, requester, payload, created_at FROM jobs " +
            "WHERE state='pending' OR (state='claimed' AND claimed_at < ?) " +
            "ORDER BY created_at LIMIT 1",
        )
        .get(now - claimTimeoutS);
      if (!row) return null;
      this.db.prepare("UPDATE jobs SET state='claimed', claimed_at=? WHERE id=?").run(now, row.id);
      return rowToJob(row);
    });
    return tx();
  }

  complete(jobId: string): void {
    this.db.prepare("UPDATE jobs SET state='done', completed_at=? WHERE id=?").run(Date.now() / 1000, jobId);
  }

  fail(jobId: string, error: string): void {
    this.db
      .prepare(
        "UPDATE jobs SET state='failed', completed_at=?, payload=json_set(payload, '$.error', ?) WHERE id=?",
      )
      .run(Date.now() / 1000, error, jobId);
  }

  depth(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const state of ["pending", "claimed", "done", "failed"]) {
      const row = this.db
        .prepare<[string], { count: number }>("SELECT count(*) as count FROM jobs WHERE state=?")
        .get(state);
      out[state] = row?.count ?? 0;
    }
    return out;
  }

  recentForTicket(ticketId: string, command: string, sinceTs: number): Job | null {
    const row = this.db
      .prepare<[string, string, number], JobRow>(
        "SELECT id, ticket_id, command, trigger, requester, payload, created_at " +
          "FROM jobs WHERE ticket_id=? AND command=? AND created_at >= ? " +
          "ORDER BY created_at DESC LIMIT 1",
      )
      .get(ticketId, command, sinceTs);
    return row ? rowToJob(row) : null;
  }
}
