import { describe, expect, it } from "vitest";
import { dedupEdgeCases, stabilitySignals } from "../src/blocks/edge-mine.js";
import { estimateEffort } from "../src/blocks/estimate.js";
import { clusterHotspots } from "../src/blocks/hotspot.js";
import type { EdgeCaseBullet, RunResult, TestCase, Ticket, TicketRecord } from "../src/models.js";

const baseRec = (over: Partial<TicketRecord>): TicketRecord => ({
  ticket: "AHA-1",
  title: "",
  type: "feature",
  status: "shipped",
  shas: ["abc123"],
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

describe("clusterHotspots", () => {
  it("returns empty for empty input", () => {
    expect(clusterHotspots([])).toEqual([]);
  });

  it("clusters files that change together", () => {
    const records = [
      baseRec({
        ticket: "AHA-1",
        files: [
          { path: "auth/login.ts", change: "modified", loc_added: 10, loc_removed: 0 },
          { path: "auth/two_factor.ts", change: "added", loc_added: 50, loc_removed: 0 },
        ],
        lastCommit: new Date(),
        durationDays: 5,
      }),
      baseRec({
        ticket: "AHA-2",
        files: [
          { path: "auth/login.ts", change: "modified", loc_added: 8, loc_removed: 2 },
          { path: "auth/two_factor.ts", change: "modified", loc_added: 12, loc_removed: 4 },
        ],
        lastCommit: new Date(),
        durationDays: 3,
      }),
    ];
    const clusters = clusterHotspots(records);
    expect(clusters.length).toBeGreaterThan(0);
    const cluster = clusters[0]!;
    expect(cluster.files).toContain("auth/login.ts");
    expect(cluster.files).toContain("auth/two_factor.ts");
  });
});

describe("estimateEffort", () => {
  const ticket: Ticket = {
    id: "AHA-9",
    title: "new",
    description: "",
    type: "feature",
    status: "draft",
    labels: [],
    childrenIds: [],
    url: "",
    raw: {},
  };

  it("returns low confidence with no candidates", () => {
    const e = estimateEffort(ticket, [], { unit: "days", reference_window_days: 90, min_similarity: 0.4, min_references_for_medium: 4, min_references_for_high: 6 });
    expect(e.confidence).toBe("low");
    expect(e.references).toEqual([]);
  });

  it("computes weighted estimate from similar tickets", () => {
    const candidates = [
      baseRec({
        ticket: "AHA-1",
        title: "2FA",
        files: [
          { path: "auth/login.ts", change: "modified", loc_added: 100, loc_removed: 0 },
          { path: "auth/two_factor.ts", change: "added", loc_added: 200, loc_removed: 0 },
        ],
        durationDays: 5,
        locAdded: 300,
      }),
    ];
    const targetFiles = new Set(["auth/login.ts", "auth/two_factor.ts"]);
    const e = estimateEffort(ticket, candidates, { unit: "days", reference_window_days: 90, min_similarity: 0.4, min_references_for_medium: 4, min_references_for_high: 6 }, { targetFiles });
    expect(e.references.length).toBe(1);
    expect(e.low).toBeGreaterThan(0);
    expect(e.references[0]!.similarity).toBeGreaterThan(0.5);
  });
});

describe("stabilitySignals", () => {
  it("flags cases with 3+ failures in window", () => {
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
});

describe("dedupEdgeCases", () => {
  it("groups bullets by token similarity", () => {
    const bullet = (text: string, source: string): EdgeCaseBullet => ({ text, source });
    const records = [
      baseRec({ ticket: "AHA-1", edgeCasesHandled: [bullet("Rate limit reset requests per email", "pr#1")] }),
      baseRec({ ticket: "AHA-2", edgeCasesHandled: [bullet("Rate-limit reset request frequency per email address", "pr#2")] }),
      baseRec({ ticket: "AHA-3", edgeCasesHandled: [bullet("Hash tokens at rest using sha256", "pr#3")] }),
    ];
    const groups = dedupEdgeCases(records);
    expect(groups.length).toBe(2);
    expect(groups[0]!.tickets.length).toBeGreaterThanOrEqual(2);
  });
});
