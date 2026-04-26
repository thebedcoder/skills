import { describe, expect, it } from "vitest";
import { dedupEdgeCases, stabilitySignals, validateCitations } from "../../src/blocks/edge-mine.js";
import type { EdgeCaseBullet, RunResult, TestCase, TicketRecord } from "../../src/models.js";

const baseRec = (over: Partial<TicketRecord>): TicketRecord => ({
  ticket: "AHA-1",
  title: "",
  type: "feature",
  status: "shipped",
  shas: ["abc1234"],
  prs: [],
  authors: [],
  files: [],
  symbols: [],
  relatedTickets: [],
  revertedBy: [],
  linkedBugs: [],
  locAdded: 0,
  locRemoved: 0,
  durationDays: 0,
  manualSections: [],
  whatShipped: "",
  keyDecisions: [],
  edgeCasesHandled: [],
  knownGaps: [],
  testCases: [],
  qaEdges: [],
  stabilitySignals: [],
  coverageGaps: [],
  manualBody: "",
  repo: "backend",
  ...over,
});

describe("stabilitySignals", () => {
  it("flags cases with 3+ failures in run history", () => {
    const cases: TestCase[] = [
      { id: "TR-C-1", title: "flaky case", preconditions: "", steps: [], expected: "", automation: "automated", type: "functional", suite: "", linkedTickets: [], recentFailures: 0, url: "" },
    ];
    const runs: RunResult[] = [
      { caseId: "TR-C-1", status: "failed", runId: "1", comment: "" },
      { caseId: "TR-C-1", status: "failed", runId: "2", comment: "" },
      { caseId: "TR-C-1", status: "blocked", runId: "3", comment: "" },
    ];
    const out = stabilitySignals(cases, runs);
    expect(out.length).toBe(1);
    expect(out[0]).toContain("TR-C-1");
    expect(out[0]).toContain("3 failures/blocks");
  });

  it("ignores cases with fewer than 3 failures", () => {
    const cases: TestCase[] = [
      { id: "TR-C-1", title: "ok case", preconditions: "", steps: [], expected: "", automation: "automated", type: "functional", suite: "", linkedTickets: [], recentFailures: 0, url: "" },
    ];
    const runs: RunResult[] = [
      { caseId: "TR-C-1", status: "failed", runId: "1", comment: "" },
      { caseId: "TR-C-1", status: "passed", runId: "2", comment: "" },
    ];
    expect(stabilitySignals(cases, runs)).toEqual([]);
  });

  it("falls back to recentFailures field when no run history", () => {
    const cases: TestCase[] = [
      { id: "TR-C-2", title: "another flaky case", preconditions: "", steps: [], expected: "", automation: "manual", type: "functional", suite: "", linkedTickets: [], recentFailures: 4, url: "" },
    ];
    const out = stabilitySignals(cases, []);
    expect(out.length).toBe(1);
    expect(out[0]).toContain("4 recent failures");
  });
});

describe("dedupEdgeCases", () => {
  const bullet = (text: string, source: string): EdgeCaseBullet => ({ text, source });

  it("returns empty for no records", () => {
    expect(dedupEdgeCases([])).toEqual([]);
  });

  it("groups bullets by token Jaccard similarity", () => {
    const records = [
      baseRec({ ticket: "AHA-1", edgeCasesHandled: [bullet("Rate limit reset requests per email", "pr#1")] }),
      baseRec({ ticket: "AHA-2", edgeCasesHandled: [bullet("Rate-limit reset request frequency per email address", "pr#2")] }),
      baseRec({ ticket: "AHA-3", edgeCasesHandled: [bullet("Hash tokens at rest using sha256", "pr#3")] }),
    ];
    const groups = dedupEdgeCases(records);
    expect(groups.length).toBe(2);
    expect(groups[0]!.tickets.length).toBeGreaterThanOrEqual(2);
    expect(groups[0]!.frequency).toMatch(/\d+\/\d+ records/);
  });

  it("sorts by ticket count descending", () => {
    const records = [
      baseRec({ ticket: "AHA-1", edgeCasesHandled: [bullet("Common case here always", "pr#1")] }),
      baseRec({ ticket: "AHA-2", edgeCasesHandled: [bullet("Common case here always", "pr#2")] }),
      baseRec({ ticket: "AHA-3", edgeCasesHandled: [bullet("Common case here always", "pr#3")] }),
      baseRec({ ticket: "AHA-4", edgeCasesHandled: [bullet("Unique distinct entirely different", "pr#4")] }),
    ];
    const groups = dedupEdgeCases(records);
    expect(groups[0]!.tickets.length).toBe(3);
  });
});

describe("validateCitations", () => {
  it("validates pr#N citation against known PR numbers", () => {
    const bullets: EdgeCaseBullet[] = [
      { text: "edge a", source: "pr#789 review @bob" },
      { text: "edge b", source: "pr#999 review @carol" },
    ];
    const { kept, dropped } = validateCitations(bullets, "/tmp/nonexistent", new Set([789]));
    expect(kept.length).toBe(1);
    expect(kept[0]!.source).toContain("pr#789");
    expect(dropped).toBe(1);
  });

  it("validates TR-C-NNNN against known case IDs", () => {
    const bullets: EdgeCaseBullet[] = [
      { text: "qa edge", source: "TR-C-4521 (manual, passed)" },
      { text: "stale qa", source: "TR-C-9999" },
    ];
    const { kept, dropped } = validateCitations(bullets, "/tmp/nonexistent", new Set(), new Set(["TR-C-4521"]));
    expect(kept.length).toBe(1);
    expect(dropped).toBe(1);
  });

  it("drops bullets with unrecognized citation format", () => {
    const bullets: EdgeCaseBullet[] = [
      { text: "no source", source: "just some text" },
    ];
    const { kept, dropped } = validateCitations(bullets, "/tmp/nonexistent", new Set());
    expect(kept).toEqual([]);
    expect(dropped).toBe(1);
  });
});
