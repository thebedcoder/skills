import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Queue } from "../../src/bot/queue.js";

let dir: string;
let q: Queue;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-queue-"));
  q = new Queue(path.join(dir, "queue.sqlite"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("Queue", () => {
  it("enqueues a job and returns an id", () => {
    const id = q.enqueue("AHA-1", "groom", "test", "alice", { foo: "bar" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("claimNext returns null when empty", () => {
    expect(q.claimNext()).toBeNull();
  });

  it("claimNext returns oldest pending job and marks claimed", () => {
    q.enqueue("AHA-1", "groom", "t1", "alice", {});
    q.enqueue("AHA-2", "edges", "t2", "bob", {});
    const first = q.claimNext();
    expect(first).not.toBeNull();
    expect(first!.ticketId).toBe("AHA-1");
    expect(first!.command).toBe("groom");
    const second = q.claimNext();
    expect(second!.ticketId).toBe("AHA-2");
    expect(q.claimNext()).toBeNull();
  });

  it("complete moves a job out of pending", () => {
    const id = q.enqueue("AHA-1", "groom", "t", "alice", {});
    const job = q.claimNext()!;
    expect(job.id).toBe(id);
    q.complete(job.id);
    expect(q.depth().done).toBe(1);
  });

  it("fail marks a job as failed", () => {
    q.enqueue("AHA-1", "groom", "t", "alice", {});
    const job = q.claimNext()!;
    q.fail(job.id, "boom");
    expect(q.depth().failed).toBe(1);
  });

  it("depth reports counts per state", () => {
    q.enqueue("a", "groom", "t", "u", {});
    q.enqueue("b", "groom", "t", "u", {});
    const j = q.claimNext()!;
    q.complete(j.id);
    const d = q.depth();
    expect(d.pending).toBe(1);   // second job still unclaimed
    expect(d.claimed).toBe(0);
    expect(d.done).toBe(1);
  });

  it("recentForTicket finds latest job within window", () => {
    q.enqueue("AHA-1", "groom", "t", "u", {});
    const recent = q.recentForTicket("AHA-1", "groom", 0);
    expect(recent).not.toBeNull();
    expect(recent!.ticketId).toBe("AHA-1");
  });

  it("recentForTicket returns null when nothing in window", () => {
    q.enqueue("AHA-1", "groom", "t", "u", {});
    const future = Date.now() / 1000 + 3600;
    expect(q.recentForTicket("AHA-1", "groom", future)).toBeNull();
  });

  it("preserves payload through round-trip", () => {
    q.enqueue("AHA-1", "groom", "t", "u", { repo: "backend", since: "abc" });
    const job = q.claimNext()!;
    expect(job.payload).toEqual({ repo: "backend", since: "abc" });
  });
});
