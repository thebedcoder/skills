import Database from "better-sqlite3";

interface RawAuditRow {
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
}

export interface AuditRow {
  id: string;
  timestamp: number;
  trigger: string;
  ticketId: string;
  command: string;
  requester: string;
  inputHash: string | null;
  outputSummary: string | null;
  model: string | null;
  costUsd: number | null;
  error: string | null;
}

export interface DashboardStats {
  totalRuns: number;
  totalCost: number;
  distinctTickets: number;
  distinctRequesters: number;
  errorCount: number;
  byCommand: Array<{ command: string; count: number; cost: number }>;
  byRequester: Array<{ requester: string; count: number; cost: number }>;
  byDay: Array<{ day: string; count: number; cost: number }>;
}

export interface AuditFilter {
  ticketId?: string;
  command?: string;
  requester?: string;
  status?: "all" | "ok" | "error";
  sinceTs?: number;
  untilTs?: number;
  limit?: number;
  offset?: number;
}

function rowToAudit(row: RawAuditRow): AuditRow {
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
  };
}

export class AdminDb {
  private readonly audit: Database.Database;
  private readonly queue: Database.Database;

  constructor(public readonly auditPath: string, public readonly queuePath: string) {
    this.audit = new Database(auditPath);
    this.audit.exec(`CREATE TABLE IF NOT EXISTS runs (
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
    );`);
    this.queue = new Database(queuePath);
    this.queue.exec(`CREATE TABLE IF NOT EXISTS jobs (
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
    );`);
  }

  dashboard(sinceTs: number): DashboardStats {
    const totals = this.audit
      .prepare<[number], { runs: number; cost: number; tickets: number; requesters: number; errors: number }>(
        "SELECT count(*) as runs, coalesce(sum(cost_usd),0) as cost, " +
          "count(distinct ticket_id) as tickets, count(distinct requester) as requesters, " +
          "sum(case when error is not null and error != '' then 1 else 0 end) as errors " +
          "FROM runs WHERE timestamp >= ?",
      )
      .get(sinceTs);

    const byCommand = this.audit
      .prepare<[number], { command: string; count: number; cost: number }>(
        "SELECT command, count(*) as count, coalesce(sum(cost_usd),0) as cost " +
          "FROM runs WHERE timestamp >= ? GROUP BY command ORDER BY count DESC LIMIT 10",
      )
      .all(sinceTs);

    const byRequester = this.audit
      .prepare<[number], { requester: string; count: number; cost: number }>(
        "SELECT requester, count(*) as count, coalesce(sum(cost_usd),0) as cost " +
          "FROM runs WHERE timestamp >= ? GROUP BY requester ORDER BY count DESC LIMIT 10",
      )
      .all(sinceTs);

    const byDay = this.audit
      .prepare<[number], { day: string; count: number; cost: number }>(
        "SELECT date(timestamp, 'unixepoch') as day, count(*) as count, coalesce(sum(cost_usd),0) as cost " +
          "FROM runs WHERE timestamp >= ? GROUP BY day ORDER BY day",
      )
      .all(sinceTs);

    return {
      totalRuns: totals?.runs ?? 0,
      totalCost: totals?.cost ?? 0,
      distinctTickets: totals?.tickets ?? 0,
      distinctRequesters: totals?.requesters ?? 0,
      errorCount: totals?.errors ?? 0,
      byCommand,
      byRequester,
      byDay,
    };
  }

  audits(filter: AuditFilter): { rows: AuditRow[]; total: number } {
    const wheres: string[] = ["1=1"];
    const params: Array<string | number> = [];
    if (filter.ticketId) {
      wheres.push("ticket_id LIKE ?");
      params.push(`%${filter.ticketId}%`);
    }
    if (filter.command) {
      wheres.push("command = ?");
      params.push(filter.command);
    }
    if (filter.requester) {
      wheres.push("requester LIKE ?");
      params.push(`%${filter.requester}%`);
    }
    if (filter.status === "error") wheres.push("error is not null and error != ''");
    else if (filter.status === "ok") wheres.push("(error is null or error = '')");
    if (filter.sinceTs) {
      wheres.push("timestamp >= ?");
      params.push(filter.sinceTs);
    }
    if (filter.untilTs) {
      wheres.push("timestamp < ?");
      params.push(filter.untilTs);
    }
    const where = wheres.join(" AND ");
    const limit = Math.min(filter.limit ?? 50, 500);
    const offset = filter.offset ?? 0;

    const rows = this.audit
      .prepare<unknown[], RawAuditRow>(
        `SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error ` +
          `FROM runs WHERE ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);

    const totalRow = this.audit
      .prepare<unknown[], { count: number }>(`SELECT count(*) as count FROM runs WHERE ${where}`)
      .get(...params);

    return { rows: rows.map(rowToAudit), total: totalRow?.count ?? 0 };
  }

  auditById(id: string): AuditRow | null {
    const row = this.audit
      .prepare<[string], RawAuditRow>(
        "SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error " +
          "FROM runs WHERE id = ?",
      )
      .get(id);
    return row ? rowToAudit(row) : null;
  }

  queueDepth(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const state of ["pending", "claimed", "done", "failed"]) {
      const row = this.queue
        .prepare<[string], { count: number }>("SELECT count(*) as count FROM jobs WHERE state = ?")
        .get(state);
      out[state] = row?.count ?? 0;
    }
    return out;
  }

  queuePending(limit = 50): Array<{
    id: string;
    ticketId: string;
    command: string;
    trigger: string;
    requester: string;
    createdAt: number;
  }> {
    const rows = this.queue
      .prepare<[number], {
        id: string;
        ticket_id: string;
        command: string;
        trigger: string;
        requester: string;
        created_at: number;
      }>(
        "SELECT id, ticket_id, command, trigger, requester, created_at " +
          "FROM jobs WHERE state = 'pending' OR state = 'claimed' " +
          "ORDER BY created_at ASC LIMIT ?",
      )
      .all(limit);
    return rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      command: r.command,
      trigger: r.trigger,
      requester: r.requester,
      createdAt: r.created_at,
    }));
  }

  queueFailed(limit = 50): Array<{
    id: string;
    ticketId: string;
    command: string;
    requester: string;
    createdAt: number;
    error: string;
  }> {
    const rows = this.queue
      .prepare<[number], {
        id: string;
        ticket_id: string;
        command: string;
        requester: string;
        created_at: number;
        payload: string;
      }>(
        "SELECT id, ticket_id, command, requester, created_at, payload " +
          "FROM jobs WHERE state = 'failed' ORDER BY created_at DESC LIMIT ?",
      )
      .all(limit);
    return rows.map((r) => {
      let error = "";
      try {
        error = String((JSON.parse(r.payload) as { error?: unknown })["error"] ?? "");
      } catch {
        error = "";
      }
      return {
        id: r.id,
        ticketId: r.ticket_id,
        command: r.command,
        requester: r.requester,
        createdAt: r.created_at,
        error,
      };
    });
  }

  lastSourceMergeForRepo(repoName: string): AuditRow | null {
    const row = this.audit
      .prepare<[string], RawAuditRow>(
        "SELECT id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error " +
          "FROM runs WHERE command = 'source-merge' AND ticket_id = ? ORDER BY timestamp DESC LIMIT 1",
      )
      .get(`source:${repoName}`);
    return row ? rowToAudit(row) : null;
  }
}
