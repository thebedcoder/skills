import { createHmac, timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { getPmAdapter } from "../adapters/index.js";
import type { Config } from "../config.js";
import { parseBrainCommand } from "./commands.js";
import { Queue } from "./queue.js";

export function buildApp(config: Config, queue?: Queue): FastifyInstance {
  const app = Fastify({ logger: false });
  const q = queue ?? new Queue(config.queue.path);
  const adapter = getPmAdapter(config.pmAdapter, config);

  app.get("/healthz", () => ({ ok: true, queue: q.depth() }));

  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body),
  );

  app.post("/webhook/source-merge", async (request, reply) => {
    const raw = request.body as Buffer;
    const secret = process.env["PRODUCT_BRAIN_SOURCE_MERGE_SECRET"] ?? "";
    const sent = String(request.headers["x-pb-signature"] ?? "");
    if (secret) {
      const mac = createHmac("sha256", secret).update(raw).digest("hex");
      if (mac.length !== sent.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(sent))) {
        return reply.code(401).send({ error: "invalid signature" });
      }
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
    } catch {
      return reply.code(400).send({ error: "invalid json" });
    }
    const repoName = payload["repo"];
    const headSha = payload["head_sha"];
    const sinceSha = payload["since_sha"];
    if (!repoName || typeof repoName !== "string") {
      return reply.code(400).send({ error: "missing repo" });
    }
    try {
      config.repo(repoName);
    } catch {
      return reply.code(400).send({ error: `unknown repo: ${repoName}` });
    }
    const headPrefix = typeof headSha === "string" ? headSha.slice(0, 7) : "?";
    q.enqueue(
      `source:${repoName}`,
      "source-merge",
      `source-merge:${repoName}@${headPrefix}`,
      "ci",
      { repo: repoName, head_sha: headSha, since_sha: sinceSha },
    );
    return { status: "queued", repo: repoName };
  });

  app.post("/webhook/aha", async (request, reply) => {
    const raw = request.body as Buffer;
    const headers = request.headers as Record<string, string>;
    if (!adapter.verifyWebhook(headers, raw)) {
      return reply.code(401).send({ error: "invalid signature" });
    }
    const event = adapter.parseWebhook(raw);

    if (event.kind === "comment_created" && event.comment) {
      const author = event.comment.author;
      if (!config.bot.allowed_users.includes(author)) {
        return { status: "ignored", reason: "author not allowed" };
      }
      const cmd = parseBrainCommand(event.comment.body);
      if (!cmd) return { status: "ignored", reason: "no /brain command" };
      if (!event.ticketId) return { status: "ignored", reason: "no ticket id" };
      q.enqueue(
        event.ticketId,
        cmd.command,
        `comment:/brain ${cmd.command}`,
        author,
        { args: cmd.args },
      );
      return { status: "queued", command: cmd.command };
    }

    if (event.kind === "ticket_status_changed" && event.ticketId) {
      const ticket = await adapter.fetchTicket(event.ticketId);
      if (!ticket.labels.includes(config.bot.opt_in_label)) {
        return { status: "ignored", reason: "no opt-in label" };
      }
      if (ticket.labels.includes(config.bot.kill_switch_label)) {
        return { status: "ignored", reason: "kill switch on" };
      }
      q.enqueue(
        event.ticketId,
        "groom",
        `status:${event.prevStatus}->${event.newStatus}`,
        "system",
        { auto: true },
      );
      return { status: "queued", command: "groom" };
    }

    return { status: "ignored", kind: event.kind };
  });

  return app;
}
