import { describe, expect, it } from "vitest";
import { clusterHotspots } from "../../src/blocks/hotspot.js";
import type { TicketRecord } from "../../src/models.js";

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
        authors: ["alice"],
      }),
      baseRec({
        ticket: "AHA-2",
        files: [
          { path: "auth/login.ts", change: "modified", loc_added: 8, loc_removed: 2 },
          { path: "auth/two_factor.ts", change: "modified", loc_added: 12, loc_removed: 4 },
        ],
        lastCommit: new Date(),
        durationDays: 3,
        authors: ["bob"],
      }),
    ];
    const clusters = clusterHotspots(records);
    expect(clusters.length).toBeGreaterThan(0);
    const cluster = clusters[0]!;
    expect(cluster.files).toContain("auth/login.ts");
    expect(cluster.files).toContain("auth/two_factor.ts");
    expect(cluster.owners.length).toBeGreaterThan(0);
  });

  it("weights recent commits more heavily", () => {
    const now = new Date("2026-04-01T00:00:00Z");
    const recentRec = baseRec({
      ticket: "AHA-RECENT",
      files: [{ path: "recent/file.ts", change: "modified" }],
      lastCommit: new Date("2026-03-25T00:00:00Z"),
    });
    const oldRec = baseRec({
      ticket: "AHA-OLD",
      files: [{ path: "old/file.ts", change: "modified" }],
      lastCommit: new Date("2024-01-01T00:00:00Z"),
    });
    const clusters = clusterHotspots([recentRec, oldRec], { now });
    // recent should be cluster seed (higher weight)
    expect(clusters[0]!.files[0]).toBe("recent/file.ts");
  });

  it("excludes mega-files above the threshold", () => {
    // create one file that touches every record (mega-file noise)
    const records: TicketRecord[] = [];
    for (let i = 0; i < 10; i++) {
      records.push(
        baseRec({
          ticket: `AHA-${i}`,
          files: [
            { path: "utils.ts", change: "modified" },
            { path: `feature-${i}/code.ts`, change: "added" },
          ],
          lastCommit: new Date(),
        }),
      );
    }
    const clusters = clusterHotspots(records, { megaFileThreshold: 0.85 });
    const allFiles = clusters.flatMap((c) => c.files);
    expect(allFiles).not.toContain("utils.ts");
  });
});
