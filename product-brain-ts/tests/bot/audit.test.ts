import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditLog } from "../../src/bot/audit.js";

let dir: string;
let a: AuditLog;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-audit-"));
  a = new AuditLog(path.join(dir, "audit.sqlite"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("AuditLog", () => {
  const sample = (over: Partial<Parameters<typeof a.append>[0]> = {}) => ({
    id: "run-1",
    timestamp: 1_700_000_000,
    trigger: "comment:/brain groom",
    ticketId: "AHA-1",
    command: "groom",
    requester: "alice@example.com",
    inputHash: "abc123",
    outputSummary: "ok",
    model: "haiku",
    costUsd: 0.05,
    ...over,
  });

  it("appends and tails", () => {
    a.append(sample({ id: "r1", timestamp: 1 }));
    a.append(sample({ id: "r2", timestamp: 2 }));
    a.append(sample({ id: "r3", timestamp: 3 }));
    const tail = a.tail(2);
    expect(tail.length).toBe(2);
    expect(tail[0]!.id).toBe("r3");
    expect(tail[1]!.id).toBe("r2");
  });

  it("lastForTicket returns most recent", () => {
    a.append(sample({ id: "r1", timestamp: 1, ticketId: "AHA-1" }));
    a.append(sample({ id: "r2", timestamp: 2, ticketId: "AHA-1" }));
    a.append(sample({ id: "r3", timestamp: 3, ticketId: "AHA-2" }));
    const last = a.lastForTicket("AHA-1", "groom");
    expect(last!.id).toBe("r2");
  });

  it("lastForTicket returns null when none match", () => {
    a.append(sample({ ticketId: "AHA-OTHER" }));
    expect(a.lastForTicket("AHA-MISSING", "groom")).toBeNull();
  });

  it("preserves cost and error fields", () => {
    a.append(sample({ id: "r1", costUsd: 0.234, error: null }));
    a.append(sample({ id: "r2", error: "boom", costUsd: null }));
    const tail = a.tail();
    const r1 = tail.find((t) => t.id === "r1")!;
    const r2 = tail.find((t) => t.id === "r2")!;
    expect(r1.costUsd).toBe(0.234);
    expect(r2.error).toBe("boom");
  });
});
