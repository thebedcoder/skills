// Port target: ../product-brain/src/product_brain/index/write.py
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { EdgeCaseBullet, Manifest, TicketRecord } from "../models.js";

const MANUAL_SENTINEL = "<!-- manual: do not overwrite below this line -->";

function toIso(dt: Date | string | undefined): string {
  if (!dt) return "";
  if (dt instanceof Date) return dt.toISOString();
  return String(dt);
}

function frontMatterDict(r: TicketRecord): Record<string, unknown> {
  return {
    ticket: r.ticket,
    title: r.title,
    type: r.type,
    status: r.status,
    first_commit: toIso(r.firstCommit),
    last_commit: toIso(r.lastCommit),
    shas: r.shas,
    prs: r.prs,
    authors: r.authors,
    files: r.files.map((f) => ({
      path: f.path,
      change: f.change,
      loc_added: f.loc_added ?? 0,
      loc_removed: f.loc_removed ?? 0,
    })),
    symbols: r.symbols,
    related_tickets: r.relatedTickets,
    reverted_by: r.revertedBy,
    linked_bugs: r.linkedBugs,
    loc_added: r.locAdded,
    loc_removed: r.locRemoved,
    duration_days: Math.round(r.durationDays * 100) / 100,
    pr_open_to_merge_days:
      r.prOpenToMergeDays != null ? Math.round(r.prOpenToMergeDays * 100) / 100 : null,
    manual_sections: r.manualSections,
    test_cases: r.testCases.map((c) => ({
      id: c.id,
      title: c.title,
      automation: c.automation,
      type: c.type,
      suite: c.suite,
      linked_tickets: c.linkedTickets,
      last_status: c.lastStatus ?? null,
      last_run: toIso(c.lastRun),
      recent_failures: c.recentFailures,
      url: c.url,
    })),
    coverage_gaps: r.coverageGaps.map((g) => ({
      edge: g.edge,
      edge_source: g.edgeSource,
      rationale: g.rationale,
    })),
  };
}

function renderBullets(bullets: EdgeCaseBullet[]): string {
  if (bullets.length === 0) return "_(none)_";
  return bullets.map((b) => `- ${b.text}\n  source: ${b.source}`).join("\n");
}

export function render(r: TicketRecord): string {
  const frontYaml = yaml.dump(frontMatterDict(r), { sortKeys: false, lineWidth: -1 }).trim();
  const decisions = r.keyDecisions.length
    ? r.keyDecisions.map((d) => `- ${d}`).join("\n")
    : "_(none)_";
  const edges = renderBullets(r.edgeCasesHandled);
  const gaps = renderBullets(r.knownGaps);
  const qaEdges = renderBullets(r.qaEdges);
  const stability = r.stabilitySignals.length
    ? r.stabilitySignals.map((s) => `- ${s}`).join("\n")
    : "_(none)_";
  const coverage = r.coverageGaps.length
    ? r.coverageGaps
        .map((g) => `- ${g.edge}\n  source: ${g.edgeSource}\n  rationale: ${g.rationale}`)
        .join("\n")
    : "_(none)_";
  const manual =
    r.manualBody ||
    `\n${MANUAL_SENTINEL}\n## Edge cases (manual)\n\n<!-- Engineers may add hand-written edge cases here. Not LLM-managed. -->\n`;

  return `---
${frontYaml}
---

## What shipped

${r.whatShipped || "_(no signals)_"}

## Key decisions

${decisions}

## Edge cases handled

${edges}

## Known gaps

${gaps}

## QA-verified edges

${qaEdges}

## Stability signals

${stability}

## Coverage gaps

${coverage}

${manual.trim()}
`;
}

export function writeRecord(brainRoot: string, record: TicketRecord): string {
  if (!record.repo) {
    throw new Error("TicketRecord.repo must be set before writeRecord");
  }
  const base = path.join(brainRoot, "repos", record.repo, "tickets");
  mkdirSync(base, { recursive: true });
  const p = path.join(base, `${record.ticket}.md`);
  writeFileSync(p, render(record));
  return p;
}

export function writeManifest(brainRoot: string, manifest: Manifest): void {
  const p = path.join(brainRoot, "repos", manifest.repo, "manifest.md");
  mkdirSync(path.dirname(p), { recursive: true });
  const front = {
    repo: manifest.repo,
    ticket_regex: manifest.ticketRegex,
    workflow: manifest.workflow,
    languages: manifest.languages,
    entry_points: manifest.entryPoints,
    owners_file: manifest.ownersFile,
    ignore_paths: manifest.ignorePaths,
    mega_file_threshold: manifest.megaFileThreshold,
    last_indexed_sha: manifest.lastIndexedSha,
    index_cutoff_date: manifest.indexCutoffDate,
  };
  const frontYaml = yaml.dump(front, { sortKeys: false, lineWidth: -1 }).trim();
  writeFileSync(p, `---\n${frontYaml}\n---\n\n${manifest.body}\n`);
}
