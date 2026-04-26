import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminDb } from "../../src/admin/db.js";

let dir: string;
let auditPath: string;
let queuePath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-admin-db-"));
  auditPath = path.join(dir, "audit.sqlite");
  queuePath = path.join(dir, "queue.sqlite");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seedAudit(): void {
  const db = new Database(auditPath);
  db.exec(`CREATE TABLE runs (
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
  const now = Date.now() / 1000;
  const insert = db.prepare(
    "INSERT INTO runs (id, timestamp, trigger, ticket_id, command, requester, cost_usd, error) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  insert.run("r1", now - 86400, "comment:/brain groom", "AHA-1", "groom", "alice@x.com", 0.10, null);
  insert.run("r2", now - 3600, "comment:/brain edges", "AHA-1", "edges", "bob@x.com", 0.02, null);
  insert.run("r3", now - 1800, "comment:/brain groom", "AHA-2", "groom", "alice@x.com", 0.15, "boom");
  insert.run("r4", now - 60, "source-merge:backend", "source:backend", "source-merge", "ci", 0, null);
  db.close();
}

function seedQueue(): void {
  const db = new Database(queuePath);
  db.exec(`CREATE TABLE jobs (
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
  const now = Date.now() / 1000;
  const insert = db.prepare(
    "INSERT INTO jobs (id, ticket_id, command, trigger, requester, payload, created_at, state) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  insert.run("j1", "AHA-3", "groom", "comment:/brain groom", "alice", "{}", now - 30, "pending");
  insert.run("j2", "AHA-4", "edges", "comment:/brain edges", "bob", "{}", now - 600, "claimed");
  insert.run("j3", "AHA-5", "groom", "comment:/brain groom", "alice", '{"error":"timeout from upstream"}', now - 7200, "failed");
  db.close();
}

describe("AdminDb.dashboard", () => {
  it("aggregates runs in window", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    const stats = db.dashboard(since);
    expect(stats.totalRuns).toBe(4);
    expect(stats.totalCost).toBeCloseTo(0.27);
    expect(stats.distinctTickets).toBe(3);   // AHA-1, AHA-2, source:backend
    expect(stats.errorCount).toBe(1);
    expect(stats.byCommand.find((c) => c.command === "groom")?.count).toBe(2);
  });

  it("returns zeros when no audit rows", () => {
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const stats = db.dashboard(Math.floor(Date.now() / 1000) - 86400);
    expect(stats.totalRuns).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.byCommand).toEqual([]);
  });
});

describe("AdminDb.audits", () => {
  it("filters by ticket id substring", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const { rows, total } = db.audits({ ticketId: "AHA-1" });
    expect(total).toBe(2);
    expect(rows.every((r) => r.ticketId.includes("AHA-1"))).toBe(true);
  });

  it("filters by command", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const { rows } = db.audits({ command: "edges" });
    expect(rows.length).toBe(1);
    expect(rows[0]!.command).toBe("edges");
  });

  it("filters by status=error", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const { rows } = db.audits({ status: "error" });
    expect(rows.length).toBe(1);
    expect(rows[0]!.error).toBe("boom");
  });

  it("orders by timestamp desc", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const { rows } = db.audits({});
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.timestamp).toBeLessThanOrEqual(rows[i - 1]!.timestamp);
    }
  });
});

describe("AdminDb.queue", () => {
  it("queueDepth reports per-state counts", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const d = db.queueDepth();
    expect(d.pending).toBe(1);
    expect(d.claimed).toBe(1);
    expect(d.failed).toBe(1);
  });

  it("queuePending returns pending+claimed jobs", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const list = db.queuePending();
    expect(list.length).toBe(2);
    expect(list.map((j) => j.ticketId).sort()).toEqual(["AHA-3", "AHA-4"]);
  });

  it("queueFailed returns failed jobs with parsed error", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const list = db.queueFailed();
    expect(list.length).toBe(1);
    expect(list[0]!.error).toContain("timeout from upstream");
  });
});

describe("AdminDb.lastSourceMergeForRepo", () => {
  it("finds source-merge entry by ticket_id key", () => {
    seedAudit();
    seedQueue();
    const db = new AdminDb(auditPath, queuePath);
    const last = db.lastSourceMergeForRepo("backend");
    expect(last).not.toBeNull();
    expect(last!.command).toBe("source-merge");
  });
});
