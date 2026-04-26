// Port target: ../product-brain/src/product_brain/blocks/edge_mine.py
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  Commit,
  EdgeCaseBullet,
  PullRequest,
  RunResult,
  TestCase,
  TicketRecord,
} from "../models.js";

const VERB_RE =
  /\b(fix(?:es|ed)?|handle[sd]?|guard|edge case|race|deadlock|leak|null|nil|undefined|panic|crash|retry|fallback|timeout|race condition)\b/i;
const TODO_RE = /(?:\/\/|#|\/\*)\s*TODO[\s(:]/;
const TEST_DEF_RE =
  /^\s*(?:def|fn|func|it|test)[\s(]+(test_[a-zA-Z0-9_]+|[a-zA-Z0-9_]*Test[a-zA-Z0-9_]*)/;

export interface Signals {
  prReviewComments: Array<Record<string, unknown>>;
  addedTestNames: Array<Record<string, unknown>>;
  commitVerbLines: Array<Record<string, unknown>>;
  addedCodeComments: Array<Record<string, unknown>>;
  pmDescription: string;
  linkedBugTickets: string[];
  testCases: Array<Record<string, unknown>>;
  testRunHistory: Array<Record<string, unknown>>;
}

function looksLikeTest(p: string): boolean {
  const lower = p.toLowerCase();
  return (
    lower.includes("test_") ||
    lower.includes("_test.") ||
    lower.startsWith("test/") ||
    lower.includes("/test/") ||
    lower.includes("/tests/") ||
    lower.includes(".test.") ||
    lower.includes(".spec.")
  );
}

function readBlobAt(repo: string, sha: string, p: string): string {
  try {
    return execSync(`git -C "${repo}" show "${sha}:${p}"`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

function scanDiffComments(repo: string, commits: Commit[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const c of commits) {
    let stdout: string;
    try {
      stdout = execSync(`git -C "${repo}" show --unified=0 --no-color "${c.sha}"`, {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch {
      continue;
    }
    let curFile = "";
    for (const line of stdout.split("\n")) {
      if (line.startsWith("+++")) {
        curFile = line.startsWith("+++ b/") ? line.slice(6).trim() : line.slice(4).trim();
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        const t = line.slice(1).replace(/^\s+/, "");
        if (
          (t.startsWith("//") || t.startsWith("#") || t.startsWith("/*")) &&
          !t.toUpperCase().includes("TODO") &&
          t.length > 8
        ) {
          out.push({ text: t.slice(0, 240), file: curFile, sha: c.sha });
        } else if (TODO_RE.test(t)) {
          out.push({ text: t.slice(0, 240), file: curFile, sha: c.sha, kind: "todo" });
        }
      }
    }
  }
  return out;
}

export function gatherSignals(
  repoPath: string,
  commits: Commit[],
  prs: PullRequest[],
  pmDescription: string,
  opts: {
    linkedBugs?: string[];
    testCases?: TestCase[];
    runHistory?: RunResult[];
  } = {},
): Signals {
  const prReviewComments: Array<Record<string, unknown>> = [];
  for (const pr of prs) {
    for (const c of pr.reviewComments) {
      prReviewComments.push({
        author: c.author,
        body: c.body,
        file: c.file,
        line: c.line,
        pr: pr.number,
      });
    }
  }

  const addedTestNames: Array<Record<string, unknown>> = [];
  for (const c of commits) {
    for (const f of c.files) {
      if (f.change !== "added" || !looksLikeTest(f.path)) continue;
      for (const line of readBlobAt(repoPath, c.sha, f.path).split("\n")) {
        const m = TEST_DEF_RE.exec(line);
        if (m) addedTestNames.push({ name: m[1], file: f.path, sha: c.sha });
      }
    }
  }

  const commitVerbLines: Array<Record<string, unknown>> = [];
  for (const c of commits) {
    const text = `${c.subject}\n${c.body ?? ""}`;
    for (const line of text.split("\n")) {
      if (VERB_RE.test(line)) commitVerbLines.push({ line: line.trim(), sha: c.sha });
    }
  }

  return {
    prReviewComments,
    addedTestNames,
    commitVerbLines,
    addedCodeComments: scanDiffComments(repoPath, commits),
    pmDescription: pmDescription || "",
    linkedBugTickets: opts.linkedBugs ?? [],
    testCases: (opts.testCases ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      automation: c.automation,
      type: c.type,
      last_status: c.lastStatus,
      recent_failures: c.recentFailures,
    })),
    testRunHistory: (opts.runHistory ?? []).map((r) => ({
      case_id: r.caseId,
      status: r.status,
      timestamp: r.timestamp ? r.timestamp.toISOString() : null,
      comment: r.comment,
    })),
  };
}

const EXTRACT_PROMPT = `Extract edge cases handled in this ticket.

Rules:
- Use ONLY SIGNALS below. No invention.
- Quote or close-paraphrase from a signal.
- Cite source EXACTLY: "pr#N review @user" | "test_name" | "commit <sha7>" | "<path>:<line> TODO" | "TR-C-NNNN".
- QA edges (from test_cases): case title must be specific. Skip generic ("test login works").
- Signals don't support N bullets → return fewer / zero. Do not pad.
- Do not extrapolate from feature description.

Output STRICT JSON only:
{
  "what_shipped": "one paragraph from PR/commits",
  "key_decisions": ["..."],
  "edge_cases_handled": [{"text": "...", "source": "..."}],
  "known_gaps": [{"text": "...", "source": "..."}],
  "qa_edges": [{"text": "...", "source": "TR-C-NNNN (automation, last_status)"}]
}

SIGNALS:
%SIGNALS%
`;

function firstJsonObject(s: string): string {
  const start = s.indexOf("{");
  if (start === -1) return "{}";
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth += 1;
    else if (s[i] === "}") {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

export type LLMCall = (prompt: string, maxTokens?: number) => Promise<string>;

export async function extractWithLLM(signals: Signals, llmCall: LLMCall): Promise<Record<string, unknown>> {
  const payload = {
    pr_review_comments: signals.prReviewComments.slice(0, 50),
    added_test_names: signals.addedTestNames.slice(0, 50),
    commit_verb_lines: signals.commitVerbLines.slice(0, 50),
    added_code_comments: signals.addedCodeComments.slice(0, 50),
    pm_description: signals.pmDescription.slice(0, 2000),
    linked_bug_tickets: signals.linkedBugTickets,
    test_cases: signals.testCases.slice(0, 50),
    test_run_history: signals.testRunHistory.slice(0, 50),
  };
  const prompt = EXTRACT_PROMPT.replace("%SIGNALS%", JSON.stringify(payload, null, 2));
  const raw = await llmCall(prompt);
  try {
    return JSON.parse(firstJsonObject(raw)) as Record<string, unknown>;
  } catch {
    return {
      what_shipped: "",
      key_decisions: [],
      edge_cases_handled: [],
      known_gaps: [],
      qa_edges: [],
    };
  }
}

function validateOne(
  source: string,
  repo: string,
  prNumbers: Set<number>,
  testCaseIds: Set<string>,
): boolean {
  const s = source.trim();
  let m = /^pr#(\d+)/.exec(s);
  if (m) return prNumbers.has(Number(m[1]));
  m = /^commit ([0-9a-f]{7,40})/.exec(s);
  if (m) {
    try {
      execSync(`git -C "${repo}" cat-file -e ${m[1]}`, { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
  m = /^(TR-C-\d+)/.exec(s);
  if (m) return testCaseIds.has(m[1] ?? "");
  if (s.startsWith("test_") || s.includes("::")) {
    const name = s.split("::").pop() ?? s;
    try {
      const out = execSync(`git -C "${repo}" grep -l "${name}"`, { encoding: "utf8" });
      return out.trim().length > 0;
    } catch {
      return false;
    }
  }
  m = /^(.+?):(\d+)\s+TODO/.exec(s);
  if (m) return existsSync(path.join(repo, m[1] ?? ""));
  return false;
}

export function validateCitations(
  bullets: EdgeCaseBullet[],
  repoPath: string,
  prNumbersSeen: Set<number>,
  knownTestCaseIds: Set<string> = new Set(),
): { kept: EdgeCaseBullet[]; dropped: number } {
  const kept: EdgeCaseBullet[] = [];
  let dropped = 0;
  for (const b of bullets) {
    if (validateOne(b.source, repoPath, prNumbersSeen, knownTestCaseIds)) kept.push(b);
    else dropped += 1;
  }
  return { kept, dropped };
}

export function stabilitySignals(testCases: TestCase[], runs: RunResult[]): string[] {
  const out: string[] = [];
  const byCase = new Map<string, RunResult[]>();
  for (const r of runs) {
    const arr = byCase.get(r.caseId) ?? [];
    arr.push(r);
    byCase.set(r.caseId, arr);
  }
  const titles = new Map(testCases.map((c) => [c.id, c.title]));
  for (const [caseId, results] of byCase) {
    const failures = results.filter((r) => r.status === "failed" || r.status === "blocked");
    if (failures.length >= 3) {
      const title = titles.get(caseId) ?? "(no linked case in this record)";
      out.push(
        `${caseId} (${title}): ${failures.length} failures/blocks in window — structurally fragile`,
      );
    }
  }
  for (const c of testCases) {
    if (c.recentFailures >= 3 && !out.some((s) => s.includes(c.id))) {
      out.push(`${c.id} (${c.title}): ${c.recentFailures} recent failures`);
    }
  }
  return out;
}

interface MineResult {
  what_shipped: string;
  key_decisions: string[];
  edge_cases_handled: EdgeCaseBullet[];
  known_gaps: EdgeCaseBullet[];
  qa_edges: EdgeCaseBullet[];
  stability_signals: string[];
}

export async function minePerTicket(
  repoPath: string,
  commits: Commit[],
  prs: PullRequest[],
  pmDescription: string,
  llmCall: LLMCall,
  opts: {
    linkedBugs?: string[];
    testCases?: TestCase[];
    runHistory?: RunResult[];
  } = {},
): Promise<{ result: MineResult; dropped: number }> {
  const signals = gatherSignals(repoPath, commits, prs, pmDescription, opts);
  const extracted = await extractWithLLM(signals, llmCall);

  const prNumbers = new Set(prs.map((p) => p.number));
  const caseIds = new Set((opts.testCases ?? []).map((c) => c.id));

  const toBullets = (key: string): EdgeCaseBullet[] => {
    const arr = (extracted[key] as Array<Record<string, unknown>>) ?? [];
    return arr
      .filter((e) => e["source"])
      .map((e) => ({ text: String(e["text"] ?? ""), source: String(e["source"]) }));
  };

  const e = validateCitations(toBullets("edge_cases_handled"), repoPath, prNumbers, caseIds);
  const g = validateCitations(toBullets("known_gaps"), repoPath, prNumbers, caseIds);
  const q = validateCitations(toBullets("qa_edges"), repoPath, prNumbers, caseIds);

  return {
    result: {
      what_shipped: String(extracted["what_shipped"] ?? ""),
      key_decisions: ((extracted["key_decisions"] as unknown[]) ?? []).map(String),
      edge_cases_handled: e.kept,
      known_gaps: g.kept,
      qa_edges: q.kept,
      stability_signals: stabilitySignals(opts.testCases ?? [], opts.runHistory ?? []),
    },
    dropped: e.dropped + g.dropped + q.dropped,
  };
}

function normalizeTokens(s: string): Set<string> {
  return new Set((s.match(/[a-zA-Z]{4,}/g) ?? []).map((t) => t.toLowerCase()));
}

function tokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return inter / Math.max(union, 1);
}

export interface DedupGroup {
  text: string;
  frequency: string;
  tickets: string[];
  sources: string[];
}

export function dedupEdgeCases(records: TicketRecord[]): DedupGroup[] {
  const bullets: Array<[EdgeCaseBullet, string]> = [];
  for (const r of records) {
    for (const b of r.edgeCasesHandled) bullets.push([b, r.ticket]);
  }
  const groups: Array<Array<[EdgeCaseBullet, string]>> = [];
  for (const entry of bullets) {
    const toks = normalizeTokens(entry[0].text);
    let placed = false;
    for (const grp of groups) {
      const refToks = normalizeTokens(grp[0]?.[0].text ?? "");
      if (tokenJaccard(toks, refToks) >= 0.45) {
        grp.push(entry);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([entry]);
  }
  const out: DedupGroup[] = groups.map((grp) => {
    const tickets = [...new Set(grp.map(([, tid]) => tid))].sort();
    const first = grp[0];
    return {
      text: first?.[0].text ?? "",
      frequency: `${tickets.length}/${records.length} records`,
      tickets,
      sources: grp.map(([b]) => b.source),
    };
  });
  out.sort((a, b) => b.tickets.length - a.tickets.length);
  return out;
}
