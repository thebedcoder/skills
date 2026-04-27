import type { Config } from "../config.js";
import type { RunResult, TestCase } from "../models.js";
import type { TestAdapter } from "./test-base.js";

const AUTOMATION_MAP: Record<number, TestCase["automation"]> = {
  0: "manual",
  1: "automated",
  2: "semi",
};

const STATUS_MAP: Record<number, string> = {
  1: "passed",
  2: "blocked",
  3: "untested",
  4: "retest",
  5: "failed",
};

function tsToDt(ts: unknown): Date | undefined {
  if (ts == null || ts === 0 || ts === "0") return undefined;
  const n = Number(ts);
  if (!Number.isFinite(n)) return undefined;
  return new Date(n * 1000);
}

function asObject(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

export class TestRailAdapter implements TestAdapter {
  private readonly base: string;
  private readonly headers: Record<string, string>;
  private readonly projectId: number;
  private readonly refsField: string;
  private readonly windowDays: number;
  private readonly viewBase: string;

  constructor(private readonly config: Config) {
    const cfg = config.testrail;
    const apiKey = config.testrailApiKey() ?? "";
    const token = Buffer.from(`${cfg.user_email}:${apiKey}`).toString("base64");
    this.viewBase = cfg.base_url.replace(/\/$/, "");
    this.base = `${this.viewBase}/index.php?/api/v2`;
    this.headers = {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
    };
    this.projectId = cfg.project_id;
    this.refsField = cfg.refs_field;
    this.windowDays = cfg.run_history_window_days;
  }

  private async req(path: string, params?: Record<string, string | number>): Promise<unknown> {
    const url = new URL(`${this.base}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    }
    const r = await fetch(url, {
      headers: this.headers,
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`TestRail GET ${path} → ${r.status}`);
    return r.json();
  }

  private toCase(raw: Record<string, unknown>): TestCase {
    const id = `TR-C-${raw["id"] ?? ""}`;
    const refs = String(raw[this.refsField] ?? "").trim();
    const linkedTickets = refs ? refs.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const stepsRaw = raw["custom_steps_separated"] ?? raw["custom_steps"] ?? "";
    let steps: string[];
    if (Array.isArray(stepsRaw)) {
      steps = stepsRaw
        .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
        .map((s) => String(s["content"] ?? ""));
    } else {
      steps = String(stepsRaw).split("\n").map((s) => s.trim()).filter(Boolean);
    }
    const automationRaw = raw["custom_automation_type"];
    const automation =
      typeof automationRaw === "number" ? (AUTOMATION_MAP[automationRaw] ?? "unknown") : "unknown";
    return {
      id,
      title: String(raw["title"] ?? ""),
      preconditions: String(raw["custom_preconds"] ?? ""),
      steps,
      expected: String(raw["custom_expected"] ?? ""),
      automation,
      type: String(raw["type"] ?? "functional"),
      suite: String(raw["suite_id"] ?? ""),
      linkedTickets,
      recentFailures: 0,
      url: `${this.viewBase}/index.php?/cases/view/${raw["id"] ?? ""}`,
    };
  }

  async fetchCase(caseId: string): Promise<TestCase | null> {
    const numeric = caseId.replace("TR-C-", "");
    try {
      const data = await this.req(`get_case/${numeric}`);
      if (typeof data !== "object" || data === null) return null;
      return this.toCase(data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async fetchCasesForTicket(ticketId: string): Promise<TestCase[]> {
    if (!this.projectId) return [];
    let raw: unknown;
    try {
      raw = await this.req(`get_cases/${this.projectId}`, { refs_filter: ticketId });
    } catch {
      return [];
    }
    const items = Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : ((asObject(raw)["cases"] as Array<Record<string, unknown>>) ?? []);
    return items
      .map((r) => this.toCase(r))
      .filter((c) => c.linkedTickets.includes(ticketId));
  }

  async fetchCasesForFiles(paths: string[]): Promise<TestCase[]> {
    if (!paths.length || !this.projectId) return [];
    const keywords = [...new Set(paths.map((p) => p.split("/").pop()?.split(".")[0]).filter(Boolean))]
      .join(" ")
      .slice(0, 200);
    return this.searchCases(keywords);
  }

  async fetchRunHistory(caseId: string, since?: Date): Promise<RunResult[]> {
    const numeric = caseId.replace("TR-C-", "");
    const sinceDt = since ?? new Date(Date.now() - this.windowDays * 86_400_000);
    const cutoff = Math.floor(sinceDt.getTime() / 1000);
    let runs: unknown;
    try {
      runs = await this.req(`get_runs/${this.projectId}`, { created_after: cutoff });
    } catch {
      return [];
    }
    const runItems = Array.isArray(runs)
      ? (runs as Array<Record<string, unknown>>)
      : ((asObject(runs)["runs"] as Array<Record<string, unknown>>) ?? []);
    const out: RunResult[] = [];
    for (const run of runItems.slice(0, 50)) {
      const runId = run["id"];
      let results: unknown;
      try {
        results = await this.req(`get_results_for_case/${runId}/${numeric}`);
      } catch {
        continue;
      }
      const resItems = Array.isArray(results)
        ? (results as Array<Record<string, unknown>>)
        : ((asObject(results)["results"] as Array<Record<string, unknown>>) ?? []);
      for (const r of resItems) {
        const sid = r["status_id"];
        out.push({
          caseId,
          status: typeof sid === "number" ? (STATUS_MAP[sid] ?? "unknown") : "unknown",
          runId: String(runId ?? ""),
          timestamp: tsToDt(r["created_on"]),
          comment: String(r["comment"] ?? "").slice(0, 200),
        });
      }
    }
    return out;
  }

  async searchCases(keywords: string, limit = 50): Promise<TestCase[]> {
    if (!this.projectId) return [];
    let raw: unknown;
    try {
      raw = await this.req(`get_cases/${this.projectId}`, { filter: keywords });
    } catch {
      return [];
    }
    const items = Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : ((asObject(raw)["cases"] as Array<Record<string, unknown>>) ?? []);
    return items.slice(0, limit).map((r) => this.toCase(r));
  }
}
