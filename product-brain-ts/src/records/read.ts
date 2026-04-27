import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type {
  CoverageGap,
  EdgeCaseBullet,
  FileChange,
  Manifest,
  TestCase,
  TicketRecord,
} from "../models.js";

const FRONT_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const MANUAL_SENTINEL = "<!-- manual: do not overwrite below this line -->";

function splitFrontMatter(text: string): [Record<string, unknown>, string] {
  const m = FRONT_RE.exec(text);
  if (!m) return [{}, text];
  const front = (yaml.load(m[1] ?? "") ?? {}) as Record<string, unknown>;
  return [front, m[2] ?? ""];
}

function parseDt(s: unknown): Date | undefined {
  if (!s) return undefined;
  if (s instanceof Date) return s;
  const str = String(s).replace("Z", "+00:00");
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function section(body: string, header: string): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=^##\\s+|$(?![\\r\\n]))`, "m");
  const m = re.exec(body);
  return m?.[1]?.trim() ?? "";
}

function parseBulletsWithSource(text: string): EdgeCaseBullet[] {
  const out: EdgeCaseBullet[] = [];
  if (!text) return out;
  for (const block of text.trim().split(/\n(?=- )/)) {
    if (!block.startsWith("- ")) continue;
    const body = block.slice(2).trim();
    const m = /\n\s*source:\s*(.+)$/.exec(body);
    if (!m) continue;
    out.push({ text: body.slice(0, m.index).trim(), source: (m[1] ?? "").trim() });
  }
  return out;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function parseFiles(raw: unknown): FileChange[] {
  return asArray(raw)
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      path: String(f["path"] ?? ""),
      change: (f["change"] as FileChange["change"]) ?? "modified",
      loc_added: Number(f["loc_added"] ?? 0) || 0,
      loc_removed: Number(f["loc_removed"] ?? 0) || 0,
    }));
}

function parseTestCases(raw: unknown): TestCase[] {
  return asArray(raw)
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      id: String(c["id"] ?? ""),
      title: String(c["title"] ?? ""),
      preconditions: String(c["preconditions"] ?? ""),
      steps: asArray(c["steps"]).map(String),
      expected: String(c["expected"] ?? ""),
      automation: (c["automation"] as TestCase["automation"]) ?? "unknown",
      type: String(c["type"] ?? "functional"),
      suite: String(c["suite"] ?? ""),
      linkedTickets: asArray(c["linked_tickets"]).map(String),
      lastStatus: c["last_status"] as TestCase["lastStatus"],
      lastRun: parseDt(c["last_run"]),
      recentFailures: Number(c["recent_failures"] ?? 0) || 0,
      url: String(c["url"] ?? ""),
    }));
}

function parseCoverageGaps(raw: unknown): CoverageGap[] {
  return asArray(raw)
    .filter((g): g is Record<string, unknown> => typeof g === "object" && g !== null)
    .map((g) => ({
      edge: String(g["edge"] ?? ""),
      edgeSource: String(g["edge_source"] ?? ""),
      rationale: String(g["rationale"] ?? ""),
    }));
}

function splitManual(body: string): [string, string] {
  if (!body.includes(MANUAL_SENTINEL)) return [body, ""];
  const idx = body.indexOf(MANUAL_SENTINEL);
  return [body.slice(0, idx), MANUAL_SENTINEL + body.slice(idx + MANUAL_SENTINEL.length)];
}

export function readRecord(filePath: string, repo = ""): TicketRecord {
  const text = readFileSync(filePath, "utf8");
  const [front, body] = splitFrontMatter(text);
  const [bodyManaged, manualBody] = splitManual(body);

  return {
    ticket: String(front["ticket"] ?? path.basename(filePath, ".md")),
    title: String(front["title"] ?? ""),
    type: String(front["type"] ?? "unknown"),
    status: (front["status"] as TicketRecord["status"]) ?? "in_progress",
    firstCommit: parseDt(front["first_commit"]),
    lastCommit: parseDt(front["last_commit"]),
    shas: asArray(front["shas"]).map(String),
    prs: asArray(front["prs"]).map((n) => Number(n)),
    authors: asArray(front["authors"]).map(String),
    files: parseFiles(front["files"]),
    symbols: asArray(front["symbols"]).map(String),
    relatedTickets: asArray(front["related_tickets"]).map(String),
    revertedBy: asArray(front["reverted_by"]).map(String),
    linkedBugs: asArray(front["linked_bugs"]).map(String),
    locAdded: Number(front["loc_added"] ?? 0) || 0,
    locRemoved: Number(front["loc_removed"] ?? 0) || 0,
    durationDays: Number(front["duration_days"] ?? 0) || 0,
    prOpenToMergeDays:
      front["pr_open_to_merge_days"] != null
        ? Number(front["pr_open_to_merge_days"])
        : undefined,
    manualSections: asArray(front["manual_sections"]).map(String),
    whatShipped: section(bodyManaged, "What shipped"),
    keyDecisions: section(bodyManaged, "Key decisions")
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-+\s*/, "").trim()),
    edgeCasesHandled: parseBulletsWithSource(section(bodyManaged, "Edge cases handled")),
    knownGaps: parseBulletsWithSource(section(bodyManaged, "Known gaps")),
    testCases: parseTestCases(front["test_cases"]),
    qaEdges: parseBulletsWithSource(section(bodyManaged, "QA-verified edges")),
    stabilitySignals: section(bodyManaged, "Stability signals")
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) => l.replace(/^-+\s*/, "").trim()),
    coverageGaps: parseCoverageGaps(front["coverage_gaps"]),
    manualBody,
    repo,
  };
}

function ticketsDir(brainRoot: string, repoName: string): string {
  return path.join(brainRoot, "repos", repoName, "tickets");
}

function manifestPath(brainRoot: string, repoName: string): string {
  return path.join(brainRoot, "repos", repoName, "manifest.md");
}

export function readRecords(
  brainRoot: string,
  repoName: string,
  ticketIds?: string[],
): Record<string, TicketRecord> {
  const base = ticketsDir(brainRoot, repoName);
  if (!existsSync(base)) return {};
  const out: Record<string, TicketRecord> = {};
  if (ticketIds) {
    for (const tid of ticketIds) {
      const p = path.join(base, `${tid}.md`);
      if (existsSync(p)) out[tid] = readRecord(p, repoName);
    }
  } else {
    for (const name of readdirSync(base).sort()) {
      if (!name.endsWith(".md")) continue;
      const rec = readRecord(path.join(base, name), repoName);
      out[rec.ticket] = rec;
    }
  }
  return out;
}

export function listRecords(brainRoot: string, repoName: string): string[] {
  const base = ticketsDir(brainRoot, repoName);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.slice(0, -3))
    .sort();
}

export function readManifest(brainRoot: string, repoName: string): Manifest | null {
  const p = manifestPath(brainRoot, repoName);
  if (!existsSync(p)) return null;
  const [front, body] = splitFrontMatter(readFileSync(p, "utf8"));
  return {
    repo: String(front["repo"] ?? repoName),
    ticketRegex: String(front["ticket_regex"] ?? "AHA-\\d+"),
    workflow: (front["workflow"] as Manifest["workflow"]) ?? "squash",
    languages: asArray(front["languages"]).map(String),
    entryPoints: asArray(front["entry_points"]).map(String),
    ownersFile: String(front["owners_file"] ?? "CODEOWNERS"),
    ignorePaths: asArray(front["ignore_paths"]).map(String),
    megaFileThreshold: Number(front["mega_file_threshold"] ?? 0.95) || 0.95,
    lastIndexedSha: String(front["last_indexed_sha"] ?? ""),
    indexCutoffDate: String(front["index_cutoff_date"] ?? ""),
    body: body.trim(),
  };
}
