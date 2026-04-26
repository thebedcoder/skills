import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import { readManifest } from "../records/read.js";
import { basicAuthHook, loadAdminAuth } from "./auth.js";
import { AdminDb, type AuditFilter } from "./db.js";
import {
  EDITABLE_FIELDS,
  applyEdits,
  configExists,
  readConfigYaml,
} from "./settings.js";
import { BUILD_ID, BUILD_TIME, VERSION } from "../version.js";
import { badge, card, html, layout, raw, statTile, table, type Raw } from "./templates.js";

const DAY_MS = 86_400_000;

function fmtTs(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function fmtRelative(ts: number, now: number): string {
  if (!ts) return "—";
  const diff = now / 1000 - ts;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86_400)}d ago`;
}

function dollars(n: number): string {
  if (!n) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function ticketCountForRepo(config: Config, repoName: string): number {
  const dir = config.ticketsDir(repoName);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".md")).length;
}

function nestedString(obj: Record<string, unknown>, sec: string, field: string): string {
  const s = obj[sec];
  if (typeof s !== "object" || s === null) return "";
  const v = (s as Record<string, unknown>)[field];
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function buildAdminApp(config: Config): FastifyInstance {
  const auth = loadAdminAuth();
  if (!auth) {
    throw new Error("ADMIN_PASSWORD env var must be set to run the admin panel");
  }

  const app = Fastify({ logger: false });
  const db = new AdminDb(config.audit.path, config.queue.path);

  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_req, body, done) => {
      const params: Record<string, string | string[]> = {};
      for (const pair of String(body).split("&")) {
        if (!pair) continue;
        const eq = pair.indexOf("=");
        const key = decodeURIComponent(eq < 0 ? pair : pair.slice(0, eq)).replace(/\+/g, " ");
        const val = decodeURIComponent(eq < 0 ? "" : pair.slice(eq + 1)).replace(/\+/g, " ");
        const existing = params[key];
        if (existing === undefined) params[key] = val;
        else if (Array.isArray(existing)) existing.push(val);
        else params[key] = [existing, val];
      }
      done(null, params);
    },
  );

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/admin")) return;
    return basicAuthHook(auth)(request, reply);
  });

  app.get("/admin/healthz", () => ({ ok: true }));

  app.get("/admin/", (_req, reply) => {
    const since = Math.floor((Date.now() - 30 * DAY_MS) / 1000);
    const stats = db.dashboard(since);
    const queueDepth = db.queueDepth();

    const tiles = html`<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      ${statTile("Runs (30d)", stats.totalRuns)}
      ${statTile("Cost (30d)", dollars(stats.totalCost))}
      ${statTile("Tickets touched", stats.distinctTickets)}
      ${statTile("Active users", stats.distinctRequesters)}
      ${statTile("Errors", stats.errorCount, stats.errorCount > 0 ? "investigate" : "all clear")}
    </div>`;

    const queueTiles = html`<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      ${statTile("Pending", queueDepth["pending"] ?? 0)}
      ${statTile("Claimed", queueDepth["claimed"] ?? 0)}
      ${statTile("Done", queueDepth["done"] ?? 0)}
      ${statTile("Failed", queueDepth["failed"] ?? 0)}
    </div>`;

    const cmdRows = stats.byCommand.map((c) => [c.command, c.count, dollars(c.cost)] as Array<string | number | Raw>);
    const userRows = stats.byRequester.map((r) => [r.requester, r.count, dollars(r.cost)] as Array<string | number | Raw>);

    const dailyRows = stats.byDay.slice(-14).map((d) => [d.day, d.count, dollars(d.cost)] as Array<string | number | Raw>);

    const body = html`<div class="space-y-6">
      ${tiles}
      ${queueTiles}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${card("By command (30d)", table(["Command", "Runs", "Cost"], cmdRows, { empty: "no runs in window" }))}
        ${card("By requester (30d)", table(["User", "Runs", "Cost"], userRows, { empty: "no runs in window" }))}
        ${card("Last 14 days", table(["Day", "Runs", "Cost"], dailyRows, { empty: "no runs in window" }))}
      </div>
    </div>`;

    return reply.type("text/html").send(layout({ title: "Dashboard", active: "dashboard", body }));
  });

  app.get<{ Querystring: Record<string, string> }>("/admin/audit", (request, reply) => {
    const q = request.query;
    const filter: AuditFilter = {
      ticketId: q["ticket"] ?? undefined,
      command: q["command"] ?? undefined,
      requester: q["requester"] ?? undefined,
      status: (q["status"] as AuditFilter["status"]) ?? "all",
      limit: 100,
      offset: Number(q["offset"] ?? 0),
    };
    const sinceDays = Number(q["days"] ?? 30);
    if (sinceDays > 0) filter.sinceTs = Math.floor((Date.now() - sinceDays * DAY_MS) / 1000);

    const { rows, total } = db.audits(filter);

    const filterBar = html`<form method="get" class="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end">
      <label class="flex flex-col text-xs">Ticket
        <input name="ticket" value="${q["ticket"] ?? ""}" class="border rounded px-2 py-1 text-sm" placeholder="AHA-1234" />
      </label>
      <label class="flex flex-col text-xs">Command
        <select name="command" class="border rounded px-2 py-1 text-sm">
          <option value="">(any)</option>
          ${["groom", "estimate", "edges", "related", "draft-tickets", "refresh", "explain", "source-merge"].map(
            (c) => html`<option value="${c}" ${q["command"] === c ? raw("selected") : raw("")}>${c}</option>`,
          )}
        </select>
      </label>
      <label class="flex flex-col text-xs">Requester
        <input name="requester" value="${q["requester"] ?? ""}" class="border rounded px-2 py-1 text-sm" placeholder="alice@" />
      </label>
      <label class="flex flex-col text-xs">Status
        <select name="status" class="border rounded px-2 py-1 text-sm">
          <option value="all" ${(q["status"] ?? "all") === "all" ? raw("selected") : raw("")}>all</option>
          <option value="ok" ${q["status"] === "ok" ? raw("selected") : raw("")}>ok</option>
          <option value="error" ${q["status"] === "error" ? raw("selected") : raw("")}>error</option>
        </select>
      </label>
      <label class="flex flex-col text-xs">Days
        <input name="days" value="${q["days"] ?? "30"}" class="border rounded px-2 py-1 text-sm w-20" />
      </label>
      <button type="submit" class="bg-slate-900 text-white text-sm rounded px-3 py-1.5 hover:bg-slate-700">Filter</button>
      <a href="/admin/audit" class="text-sm text-slate-600 hover:underline">reset</a>
    </form>`;

    const dataRows: Array<Array<string | number | Raw>> = rows.map((r) => [
      fmtTs(r.timestamp),
      raw(`<a href="/admin/audit/${encodeURIComponent(r.id)}" class="text-blue-700 hover:underline">${r.id.slice(0, 8)}</a>`),
      r.command,
      r.ticketId,
      r.requester,
      dollars(r.costUsd ?? 0),
      r.error ? badge("error", "err") : badge("ok", "ok"),
    ]);

    const body = html`<div>
      <h1 class="text-xl font-semibold mb-4">Audit log <span class="text-sm font-normal text-slate-500">(${total} total)</span></h1>
      ${filterBar}
      ${card(
        "Runs",
        table(["Time", "Run", "Cmd", "Ticket", "Requester", "Cost", "Status"], dataRows, { empty: "no runs match filter" }),
      )}
    </div>`;

    return reply.type("text/html").send(layout({ title: "Audit log", active: "audit", body }));
  });

  app.get<{ Params: { id: string } }>("/admin/audit/:id", (request, reply) => {
    const row = db.auditById(request.params.id);
    if (!row) return reply.code(404).type("text/html").send("not found");

    const grid = (entries: Array<[string, string | Raw]>): Raw =>
      html`<dl class="grid grid-cols-[180px_1fr] gap-2 text-sm">
        ${entries.map(([k, v]) => html`<dt class="text-slate-500">${k}</dt><dd>${v}</dd>`)}
      </dl>`;

    const body = html`<div class="space-y-6">
      <div><a href="/admin/audit" class="text-sm text-blue-700 hover:underline">← back</a></div>
      <h1 class="text-xl font-semibold">Run ${row.id}</h1>
      ${card(
        "Run details",
        grid([
          ["Run ID", row.id],
          ["Timestamp", fmtTs(row.timestamp)],
          ["Trigger", row.trigger],
          ["Ticket", row.ticketId],
          ["Command", row.command],
          ["Requester", row.requester],
          ["Model", row.model ?? "—"],
          ["Cost", dollars(row.costUsd ?? 0)],
          ["Input hash", row.inputHash ?? "—"],
          ["Error", row.error ? badge(row.error, "err") : badge("none", "ok")],
        ]),
      )}
      ${card(
        "Output summary",
        html`<pre class="text-xs whitespace-pre-wrap bg-slate-50 p-3 rounded border border-slate-200">${row.outputSummary ?? "(empty)"}</pre>`,
      )}
    </div>`;

    return reply.type("text/html").send(layout({ title: `Run ${row.id.slice(0, 8)}`, active: "audit", body }));
  });

  app.get("/admin/repos", (_req, reply) => {
    const now = Date.now();
    const dataRows: Array<Array<string | number | Raw>> = config.repos.map((repo) => {
      const manifest = readManifest(config.brainRoot, repo.name);
      const ticketCount = ticketCountForRepo(config, repo.name);
      const lastSync = db.lastSourceMergeForRepo(repo.name);
      const lastSyncStr = lastSync ? fmtRelative(lastSync.timestamp, now) : "never";
      const syncBadge = !lastSync
        ? badge("never synced", "warn")
        : now / 1000 - lastSync.timestamp > 7 * 86_400
        ? badge("> 7d", "warn")
        : badge("recent", "ok");
      const head = manifest?.lastIndexedSha ? manifest.lastIndexedSha.slice(0, 7) : "—";
      return [repo.name, repo.path, head, ticketCount, lastSyncStr, syncBadge];
    });

    const body = html`<div>
      <h1 class="text-xl font-semibold mb-4">Bound repos</h1>
      ${card(
        "Per-repo health",
        table(["Repo", "Source path", "Indexed HEAD", "Records", "Last sync", "Status"], dataRows, {
          empty: "no repos bound — run `product-brain bind ../source --name x`",
        }),
      )}
    </div>`;

    return reply.type("text/html").send(layout({ title: "Repos", active: "repos", body }));
  });

  app.get("/admin/queue", (_req, reply) => {
    const now = Date.now();
    const depth = db.queueDepth();
    const pending = db.queuePending();
    const failed = db.queueFailed();

    const tiles = html`<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      ${statTile("Pending", depth["pending"] ?? 0)}
      ${statTile("Claimed", depth["claimed"] ?? 0)}
      ${statTile("Done", depth["done"] ?? 0)}
      ${statTile("Failed", depth["failed"] ?? 0)}
    </div>`;

    const pendingRows: Array<Array<string | number | Raw>> = pending.map((j) => [
      j.ticketId,
      j.command,
      j.requester,
      j.trigger,
      fmtRelative(j.createdAt, now),
    ]);
    const failedRows: Array<Array<string | number | Raw>> = failed.map((j) => [
      fmtTs(j.createdAt),
      j.ticketId,
      j.command,
      j.requester,
      raw(`<span title="${j.error.replace(/"/g, "&quot;")}">${j.error.slice(0, 80)}…</span>`),
    ]);

    const body = html`<div class="space-y-6">
      <h1 class="text-xl font-semibold">Queue</h1>
      ${tiles}
      ${card(
        "Pending + claimed",
        table(["Ticket", "Cmd", "Requester", "Trigger", "Age"], pendingRows, { empty: "queue is empty" }),
      )}
      ${card(
        "Recent failed",
        table(["Time", "Ticket", "Cmd", "Requester", "Error"], failedRows, { empty: "no failures" }),
      )}
    </div>`;

    return reply.type("text/html").send(layout({ title: "Queue", active: "queue", body }));
  });

  app.get<{ Querystring: { saved?: string } }>("/admin/settings", (request, reply) => {
    const configPath = path.join(config.configDir, "config.yaml");
    if (!configExists(config.configDir)) {
      const body = html`<div class="bg-amber-50 border border-amber-300 rounded p-4 text-sm">
        config.yaml not found at ${configPath}. Run \`product-brain init\` first.
      </div>`;
      return reply.type("text/html").send(layout({ title: "Settings", active: "settings", body }));
    }
    const { parsed } = readConfigYaml(configPath);
    const saved = request.query["saved"] === "1";

    const fields = EDITABLE_FIELDS.map((f) => {
      const current = nestedString(parsed, f.section, f.field);
      const inputName = `${f.section}.${f.field}`;
      const placeholder =
        f.kind === "list" ? "alice@x.com, bob@x.com" : f.kind === "hours" ? "22, 7" : "";
      return html`<div class="grid grid-cols-1 md:grid-cols-3 gap-3 py-3 border-b border-slate-100 last:border-0">
        <div>
          <div class="font-mono text-sm">${f.section}.${f.field}</div>
          <div class="text-xs text-slate-500 mt-1">${f.help}</div>
        </div>
        <div class="md:col-span-2">
          <input name="${inputName}" value="${current}" placeholder="${placeholder}"
            class="w-full border rounded px-2 py-1 text-sm font-mono" />
        </div>
      </div>`;
    });

    const banner = saved
      ? html`<div class="bg-emerald-50 border border-emerald-300 rounded p-3 text-sm mb-4">
          Saved. Restart the bot worker to pick up new model / cooldown values.
        </div>`
      : raw("");

    const body = html`<div class="space-y-6">
      <h1 class="text-xl font-semibold">Settings</h1>
      ${banner}
      <div class="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-slate-700">
        Editable subset only. For deeper changes (provider, repos, adapters, paths), edit
        <code class="font-mono">${configPath}</code> directly and restart the bot.
      </div>
      <form method="post" action="/admin/settings" class="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        ${fields}
        <div class="pt-4 flex gap-3 items-center">
          <button type="submit" class="bg-slate-900 text-white text-sm rounded px-4 py-2 hover:bg-slate-700">Save</button>
          <span class="text-xs text-slate-500">Empty fields are ignored — current value is kept.</span>
        </div>
      </form>
    </div>`;

    return reply.type("text/html").send(layout({ title: "Settings", active: "settings", body }));
  });

  app.post<{ Body: Record<string, string | string[]> }>("/admin/settings", (request, reply) => {
    const configPath = path.join(config.configDir, "config.yaml");
    const result = applyEdits(configPath, request.body ?? {});
    if (!result.ok && result.errors) {
      const errors = Object.entries(result.errors)
        .map(([k, v]) => html`<li><code class="font-mono">${k}</code>: ${v}</li>`);
      const body = html`<div class="space-y-4">
        <h1 class="text-xl font-semibold">Settings — validation failed</h1>
        <div class="bg-rose-50 border border-rose-300 rounded p-4 text-sm">
          <ul class="list-disc ml-4 space-y-1">${errors}</ul>
        </div>
        <a href="/admin/settings" class="text-sm text-blue-700 hover:underline">← back</a>
      </div>`;
      return reply.type("text/html").send(layout({ title: "Settings — error", active: "settings", body }));
    }
    return reply.redirect("/admin/settings?saved=1");
  });

  app.get("/admin/about", (_req, reply) => {
    const grid = (entries: Array<[string, string | Raw]>): Raw =>
      html`<dl class="grid grid-cols-[180px_1fr] gap-2 text-sm">
        ${entries.map(([k, v]) => html`<dt class="text-slate-500">${k}</dt><dd class="font-mono">${v}</dd>`)}
      </dl>`;

    const body = html`<div class="space-y-6">
      <h1 class="text-xl font-semibold">About</h1>
      ${card(
        "Build",
        grid([
          ["Version", VERSION],
          ["Build", BUILD_ID],
          ["Built at", BUILD_TIME],
          ["Node", process.version],
        ]),
      )}
      ${card(
        "License",
        html`<div class="text-sm space-y-2">
          <div><strong>Proprietary — All Rights Reserved.</strong></div>
          <div class="text-slate-600">
            This software is licensed under a separate commercial agreement.
            Production use, redistribution, or modification without prior
            written permission is prohibited. For licensing inquiries, contact
            the owner.
          </div>
        </div>`,
      )}
      ${card(
        "Updates",
        html`<div class="text-sm space-y-2">
          <div>To update to a new version:</div>
          <ol class="list-disc ml-5 text-slate-700 space-y-1">
            <li>Download the new tarball provided with your license.</li>
            <li>Extract over the existing install directory.</li>
            <li>Run <code>npm install --production</code>.</li>
            <li>Restart the bot worker (and the webhook server, if separate).</li>
          </ol>
          <div class="text-slate-500">Schema migrations apply automatically on startup. No manual data migration is needed.</div>
        </div>`,
      )}
    </div>`;

    return reply.type("text/html").send(layout({ title: "About", active: "about", body }));
  });

  return app;
}
