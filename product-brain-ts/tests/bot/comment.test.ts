import { describe, expect, it } from "vitest";
import { buildComment, contentHash, locateExisting } from "../../src/bot/comment.js";
import type { Comment } from "../../src/models.js";

describe("buildComment", () => {
  const baseOpts = {
    body: "## Plan\n\nDo the thing.",
    command: "groom",
    trigger: "comment:/brain groom",
    requester: "alice@example.com",
    runId: "run-123",
    runAt: new Date("2026-04-25T14:32:00Z"),
  };

  it("includes the stable header", () => {
    const out = buildComment(baseOpts);
    expect(out).toContain("🧠 **product-brain**");
    expect(out).toContain("· groom ·");
    expect(out).toContain("run 2026-04-25 14:32");
  });

  it("includes body trimmed", () => {
    const out = buildComment(baseOpts);
    expect(out).toContain("## Plan");
    expect(out).toContain("Do the thing.");
  });

  it("renders changeNote when provided", () => {
    const out = buildComment({ ...baseOpts, changeNote: "Inputs changed." });
    expect(out).toContain("_Inputs changed._");
  });

  it("includes auditUrl in footer when provided", () => {
    const out = buildComment({ ...baseOpts, auditUrl: "https://audit/run/abc" });
    expect(out).toContain("[Audit log](https://audit/run/abc)");
  });

  it("always emits run_id", () => {
    const out = buildComment(baseOpts);
    expect(out).toContain("run_id=run-123");
  });
});

describe("locateExisting", () => {
  const mk = (body: string): Comment => ({
    id: "c1",
    ticketId: "AHA-1",
    author: "u",
    body,
    createdAt: new Date(),
  });

  it("finds bot comment by command marker", () => {
    const found = locateExisting(
      [
        mk("regular comment"),
        mk("🧠 **product-brain** · groom · run 2026-04-25 12:00\n\n## Body"),
        mk("🧠 **product-brain** · edges · run ..."),
      ],
      "groom",
    );
    expect(found).not.toBeNull();
    expect(found!.body).toContain("· groom ·");
  });

  it("returns null when no matching command", () => {
    expect(locateExisting([mk("🧠 **product-brain** · edges · run ...")], "groom")).toBeNull();
  });

  it("returns null for empty list", () => {
    expect(locateExisting([], "groom")).toBeNull();
  });
});

describe("contentHash", () => {
  it("returns 16-char hex", () => {
    const h = contentHash("anything");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic for same inputs", () => {
    expect(contentHash("a", "b")).toBe(contentHash("a", "b"));
  });

  it("differs for different inputs", () => {
    expect(contentHash("a")).not.toBe(contentHash("b"));
    expect(contentHash("a", "b")).not.toBe(contentHash("ab"));
  });
});
