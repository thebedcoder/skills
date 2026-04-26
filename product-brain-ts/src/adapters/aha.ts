// Port target: ../product-brain/src/product_brain/adapters/aha.py
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Config } from "../config.js";
import type { Comment, Ticket, TicketDraft, WebhookEvent } from "../models.js";
import type { PMAdapter } from "./base.js";

const TYPE_MAP: Record<string, Ticket["type"]> = {
  feature: "feature",
  requirement: "feature",
  idea: "spike",
  epic: "epic",
};

function parseDt(s: unknown): Date | undefined {
  if (!s || typeof s !== "string") return undefined;
  const d = new Date(s.replace("Z", "+00:00"));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function asObject(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

export class AhaAdapter implements PMAdapter {
  private readonly base: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: Config) {
    this.base = `https://${config.aha.subdomain}.aha.io/api/v1`;
    this.headers = {
      Authorization: `Bearer ${config.ahaApiKey()}`,
      "Content-Type": "application/json",
    };
  }

  private async req(path: string, init: RequestInit & { query?: Record<string, string | number> } = {}): Promise<Record<string, unknown>> {
    const url = new URL(`${this.base}${path}`);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, String(v));
    }
    const r = await fetch(url, {
      method: init.method ?? "GET",
      headers: { ...this.headers, ...(init.headers as Record<string, string> | undefined) },
      body: init.body,
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`Aha ${init.method ?? "GET"} ${path} → ${r.status} ${r.statusText}`);
    return (await r.json()) as Record<string, unknown>;
  }

  private toTicket(raw: Record<string, unknown>): Ticket {
    const feature = (raw["feature"] as Record<string, unknown> | undefined) ?? raw;
    const kind = typeof feature["type"] === "string" ? (feature["type"] as string).toLowerCase() : "feature";
    const desc = feature["description"];
    const description = typeof desc === "object" && desc !== null
      ? String((desc as Record<string, unknown>)["body"] ?? "")
      : String(desc ?? "");
    const status = asObject(feature["workflow_status"])["name"];
    const tags = Array.isArray(feature["tags"]) ? (feature["tags"] as Array<Record<string, unknown>>) : [];
    const masterFeature = asObject(feature["master_feature"])["reference_num"];
    return {
      id: String(feature["reference_num"] ?? ""),
      title: String(feature["name"] ?? ""),
      description,
      type: TYPE_MAP[kind] ?? "unknown",
      status: status ? String(status) : "",
      labels: tags.map((t) => String(t["name"] ?? "")),
      parentId: masterFeature ? String(masterFeature) : undefined,
      childrenIds: [],
      url: String(feature["url"] ?? ""),
      createdAt: parseDt(feature["created_at"]),
      updatedAt: parseDt(feature["updated_at"]),
      raw: feature,
    };
  }

  async fetchTicket(ticketId: string): Promise<Ticket> {
    return this.toTicket(await this.req(`/features/${ticketId}`));
  }

  async searchTickets(opts: {
    keywords?: string;
    labels?: string[];
    parentId?: string;
    type?: string;
    limit?: number;
  }): Promise<Ticket[]> {
    const limit = opts.limit ?? 30;
    const query: Record<string, string | number> = { per_page: Math.min(limit, 200) };
    if (opts.keywords) query["q"] = opts.keywords;
    if (opts.labels?.length) query["tag"] = opts.labels.join(",");
    const path = opts.parentId ? `/features/${opts.parentId}/features` : "/features";
    const data = await this.req(path, { query });
    const items = (data["features"] as Array<Record<string, unknown>>)?.slice(0, limit) ?? [];
    return items.map((f) => this.toTicket({ feature: f }));
  }

  async listSiblings(ticketId: string, limit = 30): Promise<Ticket[]> {
    const ticket = await this.fetchTicket(ticketId);
    if (!ticket.parentId) return [];
    const list = await this.searchTickets({ parentId: ticket.parentId, limit });
    return list.filter((t) => t.id !== ticketId);
  }

  async createTicket(draft: TicketDraft): Promise<Ticket> {
    const feature: Record<string, unknown> = {
      name: draft.title,
      description: draft.description,
      tag_list: (draft.labels ?? []).join(","),
    };
    if (draft.status) feature["workflow_status"] = draft.status;
    const path = draft.parentId ? `/features/${draft.parentId}/features` : "/features";
    const data = await this.req(path, {
      method: "POST",
      body: JSON.stringify({ feature }),
    });
    return this.toTicket(data);
  }

  async linkTickets(parentId: string, childIds: string[]): Promise<void> {
    for (const child of childIds) {
      await this.req(`/features/${child}`, {
        method: "PUT",
        body: JSON.stringify({ feature: { master_feature: parentId } }),
      });
    }
  }

  private toComment(raw: Record<string, unknown>, ticketId: string, fallbackBody = ""): Comment {
    const c = (raw["comment"] as Record<string, unknown> | undefined) ?? raw;
    const user = asObject(c["user"]);
    return {
      id: String(c["id"] ?? ""),
      ticketId,
      author: String(user["email"] ?? ""),
      body: String(c["body"] ?? fallbackBody),
      createdAt: parseDt(c["created_at"]) ?? new Date(),
    };
  }

  async postComment(ticketId: string, body: string): Promise<Comment> {
    const data = await this.req(`/features/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment: { body } }),
    });
    return this.toComment(data, ticketId);
  }

  async editComment(ticketId: string, commentId: string, body: string): Promise<Comment> {
    const data = await this.req(`/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify({ comment: { body } }),
    });
    return this.toComment(data, ticketId, body);
  }

  async listComments(ticketId: string): Promise<Comment[]> {
    const data = await this.req(`/features/${ticketId}/comments`);
    const items = (data["comments"] as Array<Record<string, unknown>>) ?? [];
    return items.map((c) => this.toComment({ comment: c }, ticketId));
  }

  verifyWebhook(headers: Record<string, string>, body: Buffer): boolean {
    const secret = process.env[this.config.bot.webhook_signing_secret_env] ?? "";
    if (!secret) return false;
    const sent = headers["x-aha-signature"] ?? headers["X-Aha-Signature"] ?? "";
    if (!sent) return false;
    const mac = createHmac("sha256", secret).update(body).digest("hex");
    if (mac.length !== sent.length) return false;
    return timingSafeEqual(Buffer.from(mac), Buffer.from(sent));
  }

  parseWebhook(body: Buffer): WebhookEvent {
    const payload = JSON.parse(body.toString("utf8")) as Record<string, unknown>;
    const event = String(payload["event"] ?? "");
    if (event === "comment.create" || event === "comment.created") {
      const c = asObject(payload["comment"]);
      const feature = asObject(payload["feature"]);
      const ref = feature["reference_num"];
      const refStr = ref ? String(ref) : undefined;
      return {
        kind: "comment_created",
        ticketId: refStr,
        comment: {
          id: String(c["id"] ?? ""),
          ticketId: refStr ?? "",
          author: String(asObject(c["user"])["email"] ?? ""),
          body: String(c["body"] ?? ""),
          createdAt: parseDt(c["created_at"]) ?? new Date(),
        },
        raw: payload,
      };
    }
    if (event === "feature.update" || event === "feature.updated") {
      const f = asObject(payload["feature"]);
      const changes = asObject(payload["changes"]);
      const statusChange = asObject(changes["workflow_status"]);
      return {
        kind: "ticket_status_changed",
        ticketId: f["reference_num"] ? String(f["reference_num"]) : undefined,
        prevStatus: statusChange["from"] ? String(statusChange["from"]) : undefined,
        newStatus: statusChange["to"] ? String(statusChange["to"]) : undefined,
        raw: payload,
      };
    }
    return { kind: "unknown", raw: payload };
  }
}
