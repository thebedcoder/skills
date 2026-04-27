import { describe, expect, it } from "vitest";
import type { EstimateConfig } from "../../src/config.js";
import { estimateEffort, similarity } from "../../src/blocks/estimate.js";
import type { Ticket, TicketRecord } from "../../src/models.js";

const cfg: EstimateConfig = {
  unit: "days",
  reference_window_days: 90,
  min_similarity: 0.4,
  min_references_for_medium: 4,
  min_references_for_high: 6,
};

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

describe("estimateEffort", () => {
  it("returns low confidence with no candidates", () => {
    const e = estimateEffort(ticket, [], cfg);
    expect(e.confidence).toBe("low");
    expect(e.references).toEqual([]);
    expect(e.low).toBe(0);
    expect(e.high).toBe(0);
  });

  it("filters candidates below min_similarity", () => {
    const candidates = [
      baseRec({
        ticket: "AHA-FAR",
        files: [{ path: "unrelated/x.ts", change: "modified" }],
        durationDays: 5,
      }),
    ];
    const e = estimateEffort(ticket, candidates, cfg, { targetFiles: new Set(["auth/login.ts"]) });
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
    const e = estimateEffort(ticket, candidates, cfg, { targetFiles });
    expect(e.references.length).toBe(1);
    expect(e.references[0]!.similarity).toBeGreaterThan(0.5);
    expect(e.low).toBeGreaterThan(0);
    expect(e.high).toBeGreaterThanOrEqual(e.low);
  });

  it("escalates to high confidence when refs cap meets threshold", () => {
    const looseCfg = { ...cfg, min_references_for_high: 5 };
    const candidates = Array.from({ length: 7 }, (_, i) =>
      baseRec({
        ticket: `AHA-${i}`,
        files: [
          { path: "auth/login.ts", change: "modified" },
          { path: "auth/two_factor.ts", change: "modified" },
          { path: "auth/totp.ts", change: "modified" },
        ],
        durationDays: 5,
      }),
    );
    const targetFiles = new Set(["auth/login.ts", "auth/two_factor.ts", "auth/totp.ts"]);
    const e = estimateEffort(ticket, candidates, looseCfg, { targetFiles });
    expect(e.confidence).toBe("high");
    expect(e.references.length).toBeLessThanOrEqual(5);
  });

  it("prefers PR open→merge over commit duration when available", () => {
    const candidates = [
      baseRec({
        ticket: "AHA-PR",
        files: [{ path: "auth/login.ts", change: "modified" }],
        durationDays: 30,
        prOpenToMergeDays: 2,
      }),
    ];
    const e = estimateEffort(ticket, candidates, cfg, { targetFiles: new Set(["auth/login.ts"]) });
    expect(e.references[0]!.days).toBe(2);
  });
});

describe("similarity", () => {
  it("returns the type-match weight (0.1) when only type matches", () => {
    const rec = baseRec({});
    expect(similarity(new Set(), new Set(), new Set(), "feature", rec)).toBeCloseTo(0.1);
  });

  it("returns 0 when no dimension matches", () => {
    const rec = baseRec({ type: "bug" });
    expect(similarity(new Set(), new Set(), new Set(), "feature", rec)).toBe(0);
  });

  it("rewards file overlap heavily", () => {
    const rec = baseRec({
      files: [
        { path: "a.ts", change: "modified" },
        { path: "b.ts", change: "modified" },
      ],
      type: "feature",
    });
    const sim = similarity(new Set(["a.ts", "b.ts"]), new Set(), new Set(), "feature", rec);
    expect(sim).toBeGreaterThan(0.5);
  });
});
