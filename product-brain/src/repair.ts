import { existsSync } from "node:fs";
import path from "node:path";
import { getTestAdapter } from "./adapters/index.js";
import { detectGaps } from "./blocks/coverage-gap.js";
import { stabilitySignals, validateCitations } from "./blocks/edge-mine.js";
import type { Config } from "./config.js";
import type { RunResult } from "./models.js";
import { readRecords } from "./records/read.js";
import { writeRecord } from "./records/write.js";

export interface RepairResult {
  repo: string;
  tickets: number;
  bullets_dropped: number;
  files_marked_deleted: number;
  stale_gaps_tagged: number;
  stability_refreshed: number;
}

function headExists(repo: string, p: string): boolean {
  return existsSync(path.join(repo, p));
}

export async function repairRepo(config: Config, repoName: string): Promise<RepairResult> {
  const repoCfg = config.repo(repoName);
  const sourcePath = repoCfg.path;
  const brainRoot = config.brainRoot;
  const records = readRecords(brainRoot, repoName);
  const testAdapter = getTestAdapter(config.testAdapter, config);

  let bulletsDropped = 0;
  let filesMarkedDeleted = 0;
  let staleTagged = 0;
  let stabilityRefreshed = 0;

  const prNumbersSeen = new Set<number>();
  const caseIdsSeen = new Set<string>();
  for (const r of Object.values(records)) {
    for (const n of r.prs) prNumbersSeen.add(n);
    for (const c of r.testCases) caseIdsSeen.add(c.id);
  }

  for (const rec of Object.values(records)) {
    const e = validateCitations(rec.edgeCasesHandled, sourcePath, prNumbersSeen, caseIdsSeen);
    const g = validateCitations(rec.knownGaps, sourcePath, prNumbersSeen, caseIdsSeen);
    const q = validateCitations(rec.qaEdges, sourcePath, prNumbersSeen, caseIdsSeen);
    bulletsDropped += e.dropped + g.dropped + q.dropped;

    if (testAdapter && rec.testCases.length) {
      try {
        const freshRuns: RunResult[] = [];
        for (const c of rec.testCases) {
          const runs = await testAdapter.fetchRunHistory(c.id);
          freshRuns.push(...runs);
          c.recentFailures = runs.filter((r) => r.status === "failed" || r.status === "blocked").length;
        }
        rec.stabilitySignals = stabilitySignals(rec.testCases, freshRuns);
        stabilityRefreshed += 1;
        if (rec.edgeCasesHandled.length) {
          rec.coverageGaps = await detectGaps(rec.edgeCasesHandled, rec.testCases);
        }
      } catch {
        // adapter unreachable; preserve existing data
      }
    }

    for (const f of rec.files) {
      if (f.change !== "deleted" && !headExists(sourcePath, f.path)) {
        f.change = "deleted";
        filesMarkedDeleted += 1;
      }
    }

    const newGaps = g.kept.map((b) => {
      if (b.source.includes("TODO") && b.source.includes(":")) {
        const filePath = b.source.split(":")[0] ?? "";
        if (!headExists(sourcePath, filePath)) {
          staleTagged += 1;
          return { ...b, text: `[stale] ${b.text}` };
        }
      }
      return b;
    });

    rec.edgeCasesHandled = e.kept;
    rec.knownGaps = newGaps;
    rec.qaEdges = q.kept;
    writeRecord(brainRoot, rec);
  }

  return {
    repo: repoName,
    tickets: Object.keys(records).length,
    bullets_dropped: bulletsDropped,
    files_marked_deleted: filesMarkedDeleted,
    stale_gaps_tagged: staleTagged,
    stability_refreshed: stabilityRefreshed,
  };
}
