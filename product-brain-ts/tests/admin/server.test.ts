import Database from "better-sqlite3";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAdminApp } from "../../src/admin/server.js";
import { load } from "../../src/config.js";

let dir: string;
let configPath: string;
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-admin-srv-"));
  configPath = path.join(dir, "config.yaml");
  writeFileSync(
    configPath,
    yaml.dump({
      repos: [{ name: "backend", path: "../backend" }],
      pm_adapter: "aha",
      bot: { allowed_users: ["alice@example.com"], cooldown_hours: 24 },
      audit: { path: path.join(dir, "audit.sqlite") },
      queue: { backend: "sqlite", path: path.join(dir, "queue.sqlite") },
    }),
  );

  // seed audit + queue with one row each so dashboard renders something
  const adb = new Database(path.join(dir, "audit.sqlite"));
  adb.exec(`CREATE TABLE runs (id TEXT PRIMARY KEY, timestamp REAL NOT NULL, trigger TEXT NOT NULL,
    ticket_id TEXT NOT NULL, command TEXT NOT NULL, requester TEXT NOT NULL,
    input_hash TEXT, output_summary TEXT, model TEXT, cost_usd REAL, error TEXT, raw TEXT);`);
  adb.prepare(
    "INSERT INTO runs (id, timestamp, trigger, ticket_id, command, requester, output_summary, cost_usd) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run("run-abc-1234", Date.now() / 1000, "comment:/brain groom", "AHA-1", "groom", "alice@example.com", "ok", 0.10);
  adb.close();
  const qdb = new Database(path.join(dir, "queue.sqlite"));
  qdb.exec(`CREATE TABLE jobs (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, command TEXT NOT NULL,
    trigger TEXT NOT NULL, requester TEXT NOT NULL, payload TEXT NOT NULL, created_at REAL NOT NULL,
    claimed_at REAL, completed_at REAL, state TEXT NOT NULL DEFAULT 'pending');`);
  qdb.close();

  process.env["ADMIN_PASSWORD"] = "topsecret";
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  process.env = { ...ORIGINAL_ENV };
});

function authHeader(user = "admin", pass = "topsecret"): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

describe("admin server", () => {
  it("throws if ADMIN_PASSWORD is not set", () => {
    delete process.env["ADMIN_PASSWORD"];
    const config = load(configPath);
    expect(() => buildAdminApp(config)).toThrow(/ADMIN_PASSWORD/);
  });

  it("/admin/healthz responds 200 with ok body", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/healthz",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
    await app.close();
  });

  it("rejects requests without auth", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({ method: "GET", url: "/admin/" });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it("dashboard renders and includes seeded data", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-type"]).toMatch(/text\/html/);
    expect(r.body).toContain("Dashboard");
    expect(r.body).toContain("Runs (30d)");
    expect(r.body).toContain("alice@example.com");
    await app.close();
  });

  it("audit list filters by ticket id", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/audit?ticket=AHA-1",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("AHA-1");
    expect(r.body).toContain("groom");
    await app.close();
  });

  it("audit detail page renders for a known run id", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/audit/run-abc-1234",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("run-abc-1234");
    expect(r.body).toContain("Output summary");
    await app.close();
  });

  it("repos page lists configured repos", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/repos",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("backend");
    await app.close();
  });

  it("queue page shows depth tiles", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/queue",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("Pending");
    expect(r.body).toContain("Failed");
    await app.close();
  });

  it("settings page renders editable fields", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "GET",
      url: "/admin/settings",
      headers: { authorization: authHeader() },
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("bot.cooldown_hours");
    expect(r.body).toContain("estimate.min_similarity");
    expect(r.body).toContain("llm.model_summarize");
    await app.close();
  });

  it("settings POST applies edits and redirects", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "POST",
      url: "/admin/settings",
      headers: {
        authorization: authHeader(),
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: "bot.cooldown_hours=48",
    });
    expect(r.statusCode).toBe(302);
    expect(r.headers["location"]).toContain("saved=1");
    const cfg = yaml.load(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    expect((cfg["bot"] as Record<string, unknown>)["cooldown_hours"]).toBe(48);
    await app.close();
  });

  it("settings POST shows validation errors for bad input", async () => {
    const config = load(configPath);
    const app = buildAdminApp(config);
    const r = await app.inject({
      method: "POST",
      url: "/admin/settings",
      headers: {
        authorization: authHeader(),
        "content-type": "application/x-www-form-urlencoded",
      },
      payload: "bot.cooldown_hours=99999",
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("validation failed");
    await app.close();
  });
});
