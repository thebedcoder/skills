import Database from "better-sqlite3";

export interface AuditEntry {
  id: string;
  timestamp: number;
  trigger: string;
  ticketId: string;
  command: string;
  requester: string;
  inputHash?: string | null;
  outputSummary?: string | null;
  model?: string | null;
  costUsd?: number | null;
  error?: string | null;
  raw?: Record<string, unknown> | null;
}

const SCHEMA = `
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
`;

interface RunRow {
  id: string;
  timestamp: number;
  trigger: string;
  ticket_id: string;
  command: string;
  requester: string;
  input_hash: string | null;
  output_summary: string | null;
  model: string | null;
  cost_usd: number | null;
  error: string | null;
  raw: string | null;
}

function rowToEntry(row: RunRow): AuditEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    trigger: row.trigger,
    ticketId: row.ticket_id,
    command: row.command,
    requester: row.requester,
    inputHash: row.input_hash,
    outputSummary: row.output_summary,
    model: row.model,
    costUsd: row.cost_usd,
    error: row.error,
    raw: row.raw ? (JSON.parse(row.raw) as Record<string, unknown>) : null,
  };
}

export class AuditLog {
  private readonly db: Database.Database;

  constructor(public readonly path: string) {
    this.db = new Database(path);
    this.db.exec(SCHEMA);
  }

  append(entry: AuditEntry): void {
    this.db
      .prepare(
        "INSERT INTO runs (id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error, raw) " +
          "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        entry.id,
        entry.timestamp,
        entry.trigger,
        entry.ticketId,
        entry.command,
        entry.requester,
        entry.inputHash ?? null,
        entry.outputSummary ?? null,
        entry.model ?? null,
        entry.costUsd ?? null,
        entry.error ?? null,
        JSON.stringify(entry.raw ?? {}),
      );
  }

  lastForTicket(ticketId: string, command: string): AuditEntry | null {
    const row = this.db
      .prepare<[string, string], RunRow>(
        "SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error, raw " +
          "FROM runs WHERE ticket_id=? AND command=? ORDER BY timestamp DESC LIMIT 1",
      )
      .get(ticketId, command);
    return row ? rowToEntry(row) : null;
  }

  tail(limit = 50): AuditEntry[] {
    const rows = this.db
      .prepare<[number], RunRow>(
        "SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error, raw " +
          "FROM runs ORDER BY timestamp DESC LIMIT ?",
      )
      .all(limit);
    return rows.map(rowToEntry);
  }
}
