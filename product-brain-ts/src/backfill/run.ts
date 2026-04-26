// Port target: ../product-brain/src/product_brain/backfill/run.py
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { getPmAdapter, getTestAdapter } from "../adapters/index.js";
import { detectGaps } from "../blocks/coverage-gap.js";
import { minePerTicket } from "../blocks/edge-mine.js";
import type { Config } from "../config.js";
import type { Commit, FileChange, Manifest, RunResult, TestCase, TicketRecord } from "../models.js";
import { readManifest, readRecords } from "../records/read.js";
import { writeManifest, writeRecord } from "../records/write.js";
import { diffStat, groupByTicket, parseGitLog } from "./git-log.js";
import { enrich } from "./pr-enrichment.js";
import { llmCallFactory } from "./summarize.js";

function headSha(repo: string): string {
  return execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function aggregateFiles(commits: Commit[], repoPath: string): FileChange[] {
  const byPath = new Map<string, FileChange>();
  for (const c of commits) {
    const stats = diffStat(repoPath, c.sha);
    for (const f of c.files) {
      const [added, removed] = stats.get(f.path) ?? [0, 0];
      const existing = byPath.get(f.path);
      if (existing) {
        existing.loc_added = (existing.loc_added ?? 0) + added;
        existing.loc_removed = (existing.loc_removed ?? 0) + removed;
        if (f.change === "added" && existing.change !== "added") existing.change = "modified";
        else if (f.change === "deleted") existing.change = "deleted";
      } else {
        byPath.set(f.path, {
          path: f.path,
          change: f.change,
          loc_added: added,
          loc_removed: removed,
        });
      }
    }
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function computeRelated(
  target: string,
  targetFiles: Set<string>,
  allRecords: Map<string, Set<string>>,
  minOverlap = 2,
  topK = 8,
): string[] {
  const scored: Array<[number, string]> = [];
  for (const [tid, files] of allRecords) {
    if (tid === target) continue;
    let overlap = 0;
    for (const f of targetFiles) if (files.has(f)) overlap += 1;
    if (overlap >= minOverlap) scored.push([overlap, tid]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, topK).map(([, tid]) => tid);
}

export interface BackfillResult {
  repo: string;
  written: number;
  created: number;
  bullets_dropped: number;
  head: string;
}

export async function backfillRepo(
  config: Config,
  repoName: string,
  opts: { since?: string; force?: boolean; skipLlm?: boolean } = {},
): Promise<BackfillResult> {
  const repoCfg = config.repo(repoName);
  const sourcePath = repoCfg.path;
  const brainRoot = config.brainRoot;
  const manifest: Manifest =
    readManifest(brainRoot, repoName) ??
    {
      repo: repoName,
      ticketRegex: config.ticketRegex,
      workflow: "squash",
      languages: [],
      entryPoints: [],
      ownersFile: "CODEOWNERS",
      ignorePaths: [],
      megaFileThreshold: 0.95,
      lastIndexedSha: "",
      indexCutoffDate: "",
      body: "",
    };
  const ticketRegex = manifest.ticketRegex || config.ticketRegex;
  const workflow = manifest.workflow || config.backfill.workflow;

  let since = opts.since;
  if (!since && !opts.force && manifest.lastIndexedSha) since = manifest.lastIndexedSha;

  const commits = parseGitLog(sourcePath, ticketRegex, workflow, since);
  const byTicket = groupByTicket(commits);

  const adapter = getPmAdapter(config.pmAdapter, config);
  const testAdapter = getTestAdapter(config.testAdapter, config);
  const llmCall = opts.skipLlm ? null : llmCallFactory(config, config.llm.model_summarize);

  const existing = readRecords(brainRoot, repoName);
  const allFiles = new Map<string, Set<string>>();
  for (const [tid, rec] of Object.entries(existing)) {
    allFiles.set(tid, new Set(rec.files.map((f) => f.path)));
  }

  let written = 0;
  let created = 0;
  let bulletsDropped = 0;

  for (const [ticketId, ticketCommits] of byTicket) {
    const files = aggregateFiles(ticketCommits, sourcePath);
    const lastSha = ticketCommits[ticketCommits.length - 1]?.sha ?? "";
    const prev = existing[ticketId];
    if (!opts.force && prev && prev.shas.length && prev.shas[prev.shas.length - 1] === lastSha) {
      continue;
    }

    const prs = await enrich(
      sourcePath,
      ticketId,
      ticketCommits,
      config.githubToken(),
      config.backfill.pr_enrichment,
    );

    let ticketMeta = null;
    try {
      ticketMeta = await adapter.fetchTicket(ticketId);
    } catch {
      // adapter unreachable; proceed with empty meta
    }

    let testCases: TestCase[] = [];
    let runHistory: RunResult[] = [];
    if (testAdapter) {
      try {
        testCases = await testAdapter.fetchCasesForTicket(ticketId);
        for (const c of testCases) {
          const runs = await testAdapter.fetchRunHistory(c.id);
          runHistory.push(...runs);
          c.recentFailures = runs.filter((r) => r.status === "failed" || r.status === "blocked").length;
          if (runs.length) {
            const last = runs.reduce((a, b) =>
              (a.timestamp?.getTime() ?? 0) > (b.timestamp?.getTime() ?? 0) ? a : b,
            );
            c.lastStatus = last.status as TestCase["lastStatus"];
            c.lastRun = last.timestamp;
          }
        }
      } catch {
        testCases = [];
        runHistory = [];
      }
    }

    const firstDt = ticketCommits[0]?.date ?? new Date();
    const lastDt = ticketCommits[ticketCommits.length - 1]?.date ?? firstDt;
    const duration = (lastDt.getTime() - firstDt.getTime()) / 86_400_000;
    const firstPR = prs[0];
    const prOpenToMerge = firstPR?.openedAt && firstPR?.mergedAt
      ? (firstPR.mergedAt.getTime() - firstPR.openedAt.getTime()) / 86_400_000
      : undefined;

    const record: TicketRecord = {
      ticket: ticketId,
      title: ticketMeta?.title ?? "",
      type: ticketMeta?.type ?? "unknown",
      status: prs.some((p) => p.mergedAt) ? "shipped" : "in_progress",
      firstCommit: firstDt,
      lastCommit: lastDt,
      shas: ticketCommits.map((c) => c.sha),
      prs: prs.map((p) => p.number),
      authors: [...new Set(ticketCommits.map((c) => c.author))].sort(),
      files,
      symbols: [],
      relatedTickets: [],
      revertedBy: [],
      linkedBugs: [],
      locAdded: files.reduce((a, f) => a + (f.loc_added ?? 0), 0),
      locRemoved: files.reduce((a, f) => a + (f.loc_removed ?? 0), 0),
      durationDays: Math.round(duration * 100) / 100,
      prOpenToMergeDays: prOpenToMerge != null ? Math.round(prOpenToMerge * 100) / 100 : undefined,
      manualSections: ["Edge cases (manual)"],
      whatShipped: "",
      keyDecisions: [],
      edgeCasesHandled: [],
      knownGaps: [],
      testCases,
      qaEdges: [],
      stabilitySignals: [],
      coverageGaps: [],
      manualBody: prev?.manualBody ?? "",
      repo: repoName,
    };

    if (llmCall) {
      const { result, dropped } = await minePerTicket(
        sourcePath,
        ticketCommits,
        prs,
        ticketMeta?.description ?? "",
        llmCall,
        { testCases, runHistory },
      );
      record.whatShipped = result.what_shipped;
      record.keyDecisions = result.key_decisions;
      record.edgeCasesHandled = result.edge_cases_handled;
      record.knownGaps = result.known_gaps;
      record.qaEdges = result.qa_edges;
      record.stabilitySignals = result.stability_signals;
      if (testCases.length && record.edgeCasesHandled.length) {
        record.coverageGaps = await detectGaps(record.edgeCasesHandled, testCases, llmCall);
      }
      bulletsDropped += dropped;
    }

    allFiles.set(ticketId, new Set(files.map((f) => f.path)));
    writeRecord(brainRoot, record);
    if (prev) written += 1;
    else created += 1;
  }

  for (const [ticketId, filesSet] of allFiles) {
    const recPath = path.join(brainRoot, "repos", repoName, "tickets", `${ticketId}.md`);
    if (!existsSync(recPath)) continue;
    const recs = readRecords(brainRoot, repoName, [ticketId]);
    const rec = recs[ticketId];
    if (!rec) continue;
    const related = computeRelated(ticketId, filesSet, allFiles);
    if (JSON.stringify(related) !== JSON.stringify(rec.relatedTickets)) {
      rec.relatedTickets = related;
      writeRecord(brainRoot, rec);
    }
  }

  manifest.lastIndexedSha = headSha(sourcePath);
  manifest.repo = repoName;
  writeManifest(brainRoot, manifest);

  return {
    repo: repoName,
    written,
    created,
    bullets_dropped: bulletsDropped,
    head: manifest.lastIndexedSha,
  };
}
