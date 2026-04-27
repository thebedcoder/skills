import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as adaptersModule from "../src/adapters/index.js";
import type { Config, EstimateConfig } from "../src/config.js";
import type { Comment, Ticket, TicketDraft, TicketRecord, WebhookEvent } from "../src/models.js";
import { runCommand } from "../src/planner.js";
import { writeRecord } from "../src/records/write.js";

let brainRoot: string;

beforeEach(() => {
  brainRoot = mkdtempSync(path.join(tmpdir(), "pb-planner-"));
});
afterEach(() => {
  rmSync(brainRoot, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const mkRec = (over: Partial<TicketRecord>): TicketRecord => ({
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

function buildConfig(): Config {
  const estimate: EstimateConfig = {
    unit: "days",
    reference_window_days: 90,
    min_similarity: 0.4,
    min_references_for_medium: 4,
    min_references_for_high: 6,
  };
  return {
    repos: [
      { name: "backend", path: "/tmp/backend" },
      { name: "react", path: "/tmp/react" },
    ],
    pmAdapter: "aha",
    ticketRegex: "AHA-\\d+",
    testAdapter: null,
    aha: { subdomain: "yourco", api_key_env: "AHA_API_KEY", workspace: "" },
    testrail: {
      base_url: "",
      user_email: "",
      api_key_env: "TESTRAIL_API_KEY",
      project_id: 0,
      refs_field: "refs",
      run_history_window_days: 90,
    },
    github: { api_key_env: "GITHUB_TOKEN" },
    llm: {
      provider: "anthropic",
      api_key_env: "ANTHROPIC_API_KEY",
      base_url: null,
      api_version: null,
      model_summarize: "haiku",
      model_extract: "haiku",
      model_synthesize: "sonnet",
      max_input_tokens_per_ticket: 8000,
    },
    estimate,
    backfill: { workflow: "squash", pr_enrichment: true, symbol_extraction: false },
    bot: {
      enabled: false,
      host: "0",
      port: 0,
      webhook_signing_secret_env: "",
      allowed_users: [],
      cooldown_hours: 24,
      opt_in_label: "",
      kill_switch_label: "",
      quiet_hours_utc: [22, 7],
      draft_status: "Bot-draft",
    },
    audit: { path: ":memory:" },
    queue: { backend: "sqlite", path: ":memory:" },
    configDir: brainRoot,
    brainRoot,
    repo(name: string) {
      const r = this.repos.find((x) => x.name === name);
      if (!r) throw new Error(`unknown repo: ${name}`);
      return r;
    },
    repoDir(name) { return path.join(brainRoot, "repos", name); },
    ticketsDir(name) { return path.join(brainRoot, "repos", name, "tickets"); },
    manifestPath(name) { return path.join(brainRoot, "repos", name, "manifest.md"); },
    llmApiKey() { return "stub"; },
    ahaApiKey() { return "stub"; },
    testrailApiKey() { return undefined; },
    githubToken() { return undefined; },
  };
}

function mockAdapter(target: Ticket, siblings: Ticket[]): void {
  vi.spyOn(adaptersModule, "getPmAdapter").mockReturnValue({
    fetchTicket: vi.fn(async () => target),
    listSiblings: vi.fn(async () => siblings),
    searchTickets: vi.fn(async () => []),
    createTicket: vi.fn(async () => target),
    linkTickets: vi.fn(async () => undefined),
    postComment: vi.fn(async (): Promise<Comment> => ({
      id: "1", ticketId: target.id, author: "bot", body: "", createdAt: new Date(),
    })),
    editComment: vi.fn(async (): Promise<Comment> => ({
      id: "1", ticketId: target.id, author: "bot", body: "", createdAt: new Date(),
    })),
    listComments: vi.fn(async () => []),
    verifyWebhook: () => true,
    parseWebhook: (): WebhookEvent => ({ kind: "unknown", raw: {} }),
  });
}

describe("planner.runCommand", () => {
  it("groom emits expected sections with seeded records", async () => {
    const config = buildConfig();
    const target: Ticket = {
      id: "AHA-1500",
      title: "Add password reset",
      description: "users can reset",
      type: "feature",
      status: "draft",
      labels: [],
      childrenIds: [],
      url: "",
      raw: {},
    };
    const siblings: Ticket[] = [
      { id: "AHA-1100", title: "Add 2FA", description: "", type: "feature", status: "shipped", labels: [], childrenIds: [], url: "", raw: {} },
      { id: "AHA-1300", title: "Email verify", description: "", type: "feature", status: "shipped", labels: [], childrenIds: [], url: "", raw: {} },
    ];
    mockAdapter(target, siblings);

    // Seed the target ticket with predicted scope so similarity has files to compare
    writeRecord(brainRoot, mkRec({
      ticket: "AHA-1500",
      title: "Add password reset",
      files: [
        { path: "auth/login.ts", change: "modified", loc_added: 0, loc_removed: 0 },
      ],
    }));

    writeRecord(brainRoot, mkRec({
      ticket: "AHA-1100",
      title: "Add 2FA",
      files: [
        { path: "auth/login.ts", change: "modified", loc_added: 50, loc_removed: 5 },
        { path: "auth/two_factor.ts", change: "added", loc_added: 200, loc_removed: 0 },
      ],
      durationDays: 5,
      locAdded: 250,
      authors: ["alice"],
      edgeCasesHandled: [{ text: "Rate limit codes per account", source: "pr#789 review @bob" }],
    }));
    writeRecord(brainRoot, mkRec({
      ticket: "AHA-1300",
      title: "Email verify",
      repo: "react",
      files: [
        { path: "auth/login.ts", change: "modified", loc_added: 30, loc_removed: 8 },
      ],
      durationDays: 3,
      authors: ["bob"],
      edgeCasesHandled: [{ text: "Rate-limit verification requests", source: "pr#621 review @alice" }],
    }));

    const result = await runCommand(config, "groom", "AHA-1500");
    expect(result.body).toContain("# AHA-1500 — Add password reset");
    expect(result.body).toContain("## Scope by repo");
    expect(result.body).toContain("auth");
    expect(result.body).toContain("## Estimate:");
    expect(result.body).toContain("similarity");
    expect(result.body).toContain("AHA-1100");
    expect(result.summary).toContain("groom on AHA-1500");
    expect(result.model).toBe("sonnet");
  });

  it("estimate command emits only the estimate", async () => {
    const config = buildConfig();
    const target: Ticket = {
      id: "AHA-1500", title: "x", description: "", type: "feature", status: "draft",
      labels: [], childrenIds: [], url: "", raw: {},
    };
    mockAdapter(target, []);
    const result = await runCommand(config, "estimate", "AHA-1500");
    expect(result.body).toContain("## Estimate:");
    expect(result.body).not.toContain("## Scope");
  });

  it("related command emits a related-tickets list", async () => {
    const config = buildConfig();
    const target: Ticket = {
      id: "AHA-1500", title: "x", description: "", type: "feature", status: "draft",
      labels: [], childrenIds: [], url: "", raw: {},
    };
    const sibling: Ticket = {
      id: "AHA-2", title: "sib", description: "", type: "feature", status: "shipped",
      labels: [], childrenIds: [], url: "", raw: {},
    };
    mockAdapter(target, [sibling]);
    writeRecord(brainRoot, mkRec({ ticket: "AHA-2", title: "sib", durationDays: 4, locAdded: 100, locRemoved: 20 }));

    const result = await runCommand(config, "related", "AHA-1500");
    expect(result.body).toContain("## Related tickets");
    expect(result.body).toContain("AHA-2");
  });
});
