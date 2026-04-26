import { describe, expect, it } from "vitest";
import { detectGaps } from "../../src/blocks/coverage-gap.js";
import type { EdgeCaseBullet, TestCase } from "../../src/models.js";

const tcase = (over: Partial<TestCase>): TestCase => ({
  id: "TR-C-1",
  title: "",
  preconditions: "",
  steps: [],
  expected: "",
  automation: "manual",
  type: "functional",
  suite: "",
  linkedTickets: [],
  recentFailures: 0,
  url: "",
  ...over,
});

describe("detectGaps", () => {
  it("returns empty when no code edges", async () => {
    expect(await detectGaps([], [tcase({ id: "TR-C-1", title: "anything" })])).toEqual([]);
  });

  it("returns empty when every edge has a heuristic match", async () => {
    const edges: EdgeCaseBullet[] = [
      { text: "Rate limit reset requests per email", source: "pr#1" },
    ];
    const cases = [
      tcase({ id: "TR-C-1", title: "Reset endpoint enforces rate limit per email" }),
    ];
    expect(await detectGaps(edges, cases)).toEqual([]);
  });

  it("flags edges with no matching case (heuristic mode)", async () => {
    const edges: EdgeCaseBullet[] = [
      { text: "Hash reset tokens at rest with sha256 salt", source: "pr#1" },
    ];
    const cases = [
      tcase({ id: "TR-C-1", title: "Login form rejects empty email" }),
    ];
    const gaps = await detectGaps(edges, cases);
    expect(gaps.length).toBe(1);
    expect(gaps[0]!.edge).toContain("Hash reset tokens");
    expect(gaps[0]!.edgeSource).toBe("pr#1");
    expect(gaps[0]!.rationale).toMatch(/heuristic/);
  });

  it("falls back to heuristic gaps when LLM call throws", async () => {
    const edges: EdgeCaseBullet[] = [
      { text: "Rotate TOTP secret on enrollment", source: "pr#2" },
    ];
    const cases = [tcase({ id: "TR-C-1", title: "Login form rejects empty email" })];
    const gaps = await detectGaps(edges, cases, async () => {
      throw new Error("LLM unavailable");
    });
    expect(gaps.length).toBe(1);
    expect(gaps[0]!.edge).toContain("Rotate TOTP secret");
  });

  it("uses LLM-refined gaps when call returns valid JSON", async () => {
    const edges: EdgeCaseBullet[] = [
      { text: "Token replay prevention", source: "pr#3" },
    ];
    const cases = [tcase({ id: "TR-C-1", title: "Login form rejects empty email" })];
    const gaps = await detectGaps(edges, cases, async () =>
      JSON.stringify({
        gaps: [{ edge: "Token replay prevention", edge_source: "pr#3", rationale: "LLM-confirmed" }],
      }),
    );
    expect(gaps.length).toBe(1);
    expect(gaps[0]!.rationale).toBe("LLM-confirmed");
  });
});
