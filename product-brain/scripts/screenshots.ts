// One-shot script that boots the admin panel against a temp brain repo
// seeded with realistic demo audit + queue data, then captures a screenshot
// of every page. Used only for documentation; not part of the runtime.
import Database from "better-sqlite3";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import yaml from "js-yaml";
import { buildAdminApp } from "../src/admin/server.js";
import { load } from "../src/config.js";
import { writeRecord } from "../src/records/write.js";
import { writeManifest } from "../src/records/write.js";

const PORT = 18089;
const PASS = "demo-secret";
const OUT = path.resolve("screenshots");

function seed(brain: string): void {
  // config.yaml
  writeFileSync(
    path.join(brain, "config.yaml"),
    yaml.dump({
      repos: [
        { name: "flutter", path: "../flutter-app" },
        { name: "react", path: "../react-app" },
        { name: "backend", path: "../backend" },
      ],
      pm_adapter: "aha",
      ticket_regex: "AHA-\\d+",
      aha: { subdomain: "yourco", api_key_env: "AHA_API_KEY" },
      llm: {
        provider: "anthropic",
        api_key_env: "ANTHROPIC_API_KEY",
        model_summarize: "claude-haiku-4-5-20251001",
        model_extract: "claude-haiku-4-5-20251001",
        model_synthesize: "claude-sonnet-4-6",
      },
      estimate: { unit: "days", reference_window_days: 90, min_similarity: 0.4, min_references_for_medium: 4, min_references_for_high: 6 },
      bot: {
        enabled: true,
        cooldown_hours: 24,
        opt_in_label: "brain:on",
        kill_switch_label: "brain:off",
        draft_status: "Bot-draft",
        allowed_users: ["pm@example.com", "lead@example.com"],
        quiet_hours_utc: [22, 7],
      },
      audit: { path: path.join(brain, "audit.sqlite") },
      queue: { backend: "sqlite", path: path.join(brain, "queue.sqlite") },
    }),
  );
  mkdirSync(path.join(brain, "repos"), { recursive: true });

  // a few manifests so /admin/repos has something
  for (const repoName of ["flutter", "react", "backend"]) {
    writeManifest(brain, {
      repo: repoName,
      ticketRegex: "AHA-\\d+",
      workflow: "squash",
      languages: repoName === "flutter" ? ["dart"] : repoName === "react" ? ["typescript"] : ["python"],
      entryPoints: [],
      ownersFile: "CODEOWNERS",
      ignorePaths: [],
      megaFileThreshold: 0.95,
      lastIndexedSha: "a1b2c3d4e5f6789",
      indexCutoffDate: "2024-01-01",
      body: "## What this repo is\n\ndemo\n",
    });
    // some ticket records so the count column has data
    for (const tid of ["AHA-1100", "AHA-1234", "AHA-1300", "AHA-1500"]) {
      writeRecord(brain, {
        ticket: tid,
        title: `${tid} demo`,
        type: "feature",
        status: "shipped",
        firstCommit: new Date(),
        lastCommit: new Date(),
        shas: ["abc1234"],
        prs: [],
        authors: ["alice"],
        files: [],
        symbols: [],
        relatedTickets: [],
        revertedBy: [],
        linkedBugs: [],
        locAdded: 0,
        locRemoved: 0,
        durationDays: 1,
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
        repo: repoName,
      });
    }
  }

  // seed audit DB with 14 days of varied runs
  const audit = new Database(path.join(brain, "audit.sqlite"));
  audit.exec(`CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY, timestamp REAL NOT NULL, trigger TEXT NOT NULL,
    ticket_id TEXT NOT NULL, command TEXT NOT NULL, requester TEXT NOT NULL,
    input_hash TEXT, output_summary TEXT, model TEXT, cost_usd REAL,
    error TEXT, raw TEXT
  );`);
  const ins = audit.prepare(
    "INSERT INTO runs (id, timestamp, trigger, ticket_id, command, requester, input_hash, output_summary, model, cost_usd, error) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const now = Date.now() / 1000;
  const commands = ["groom", "edges", "estimate", "related", "draft-tickets"];
  const users = ["pm@example.com", "lead@example.com", "alice@example.com", "bob@example.com"];
  const tickets = ["AHA-1100", "AHA-1234", "AHA-1300", "AHA-1450", "AHA-1500", "AHA-1620", "AHA-1700"];
  let seq = 0;
  for (let day = 14; day >= 0; day--) {
    const runs = day < 3 ? 8 : day < 7 ? 5 : 3;
    for (let i = 0; i < runs; i++) {
      const cmd = commands[seq % commands.length]!;
      const user = users[seq % users.length]!;
      const tk = tickets[seq % tickets.length]!;
      const cost = cmd === "related" ? 0 : cmd === "edges" ? 0.04 : cmd === "estimate" ? 0.05 : 0.18 + (seq % 3) * 0.02;
      const isErr = day === 5 && i === 0;
      ins.run(
        `r-${day}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        now - day * 86400 - i * 1800,
        `comment:/brain ${cmd}`,
        tk,
        cmd,
        user,
        Math.random().toString(36).slice(2, 18),
        `${cmd} on ${tk}: 7 refs, 5 edge groups, est=4-6days`,
        cmd === "groom" || cmd === "draft-tickets" ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001",
        cost,
        isErr ? "Aha API timeout after 30s" : null,
      );
      seq++;
    }
  }
  // a couple of source-merge entries
  ins.run("sm-1", now - 600, "source-merge:backend", "source:backend", "source-merge", "ci", null,
    "{written:2,created:1,bullets_dropped:0}", "", 0, null);
  ins.run("sm-2", now - 4 * 86400, "source-merge:react", "source:react", "source-merge", "ci", null,
    "{written:1,created:0,bullets_dropped:1}", "", 0, null);
  audit.close();

  // queue: a couple pending, one claimed, one failed
  const queue = new Database(path.join(brain, "queue.sqlite"));
  queue.exec(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, command TEXT NOT NULL,
    trigger TEXT NOT NULL, requester TEXT NOT NULL, payload TEXT NOT NULL,
    created_at REAL NOT NULL, claimed_at REAL, completed_at REAL,
    state TEXT NOT NULL DEFAULT 'pending'
  );`);
  const qins = queue.prepare(
    "INSERT INTO jobs (id, ticket_id, command, trigger, requester, payload, created_at, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  qins.run("q-pending-1", "AHA-1700", "groom", "comment:/brain groom", "pm@example.com", "{}", now - 25, "pending");
  qins.run("q-pending-2", "AHA-1620", "edges", "comment:/brain edges", "lead@example.com", "{}", now - 12, "pending");
  qins.run("q-claimed-1", "AHA-1500", "draft-tickets", "comment:/brain draft-tickets", "pm@example.com", "{}", now - 90, "claimed");
  qins.run("q-failed-1", "AHA-1400", "groom", "comment:/brain groom", "pm@example.com",
    '{"error":"Aha API rate limit exceeded — retry after 60s"}', now - 7200, "failed");
  qins.run("q-failed-2", "AHA-1380", "draft-tickets", "comment:/brain draft-tickets", "lead@example.com",
    '{"error":"create_ticket: 422 Unprocessable Entity (parent_id not found)"}', now - 4 * 86400, "failed");
  queue.close();
}

async function main(): Promise<void> {
  const brain = mkdtempSync(path.join(tmpdir(), "pb-shot-"));
  console.log(`brain: ${brain}`);
  seed(brain);

  process.env["ADMIN_PASSWORD"] = PASS;
  const config = load(path.join(brain, "config.yaml"));
  const app = buildAdminApp(config);
  await app.listen({ host: "127.0.0.1", port: PORT });

  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    httpCredentials: { username: "admin", password: PASS },
    deviceScaleFactor: 1.5,
  });
  const page = await context.newPage();

  const shots: Array<[string, string]> = [
    ["dashboard.png", `http://127.0.0.1:${PORT}/admin/`],
    ["audit.png", `http://127.0.0.1:${PORT}/admin/audit`],
    ["audit-filtered.png", `http://127.0.0.1:${PORT}/admin/audit?command=groom&days=7`],
    ["repos.png", `http://127.0.0.1:${PORT}/admin/repos`],
    ["queue.png", `http://127.0.0.1:${PORT}/admin/queue`],
    ["settings.png", `http://127.0.0.1:${PORT}/admin/settings`],
  ];

  for (const [name, url] of shots) {
    await page.goto(url, { waitUntil: "networkidle" });
    // give Tailwind from CDN a moment to apply styles
    await page.waitForTimeout(800);
    const out = path.join(OUT, name);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`wrote ${out}`);
  }

  // detail page — pick first audit row from dashboard query
  const detail = await page.evaluate(async () => {
    const r = await fetch("/admin/audit?days=30");
    const html = await r.text();
    const m = /href="\/admin\/audit\/([^"]+)"/.exec(html);
    return m?.[1] ?? null;
  });
  if (detail) {
    const url = `http://127.0.0.1:${PORT}/admin/audit/${detail}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const out = path.join(OUT, "audit-detail.png");
    await page.screenshot({ path: out, fullPage: true });
    console.log(`wrote ${out}`);
  }

  await browser.close();
  await app.close();
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
