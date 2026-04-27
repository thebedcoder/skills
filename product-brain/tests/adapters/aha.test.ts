import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AhaAdapter } from "../../src/adapters/aha.js";
import { createHmac } from "node:crypto";

const config = {
  aha: { subdomain: "yourco", api_key_env: "AHA_API_KEY", workspace: "" },
  bot: {
    enabled: false,
    host: "0.0.0.0",
    port: 8088,
    webhook_signing_secret_env: "AHA_WEBHOOK_SECRET",
    allowed_users: [],
    cooldown_hours: 24,
    opt_in_label: "brain:on",
    kill_switch_label: "brain:off",
    quiet_hours_utc: [22, 7],
    draft_status: "Bot-draft",
  },
  ahaApiKey() {
    return "test-key";
  },
} as unknown as Parameters<typeof AhaAdapter>[0] extends never ? never : ConstructorParameters<typeof AhaAdapter>[0];

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
});
afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AhaAdapter.fetchTicket", () => {
  it("maps Aha feature payload to Ticket", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResp({
        feature: {
          reference_num: "AHA-1234",
          name: "Add 2FA",
          description: { body: "Two-factor auth" },
          type: "feature",
          workflow_status: { name: "In Progress" },
          tags: [{ name: "auth" }, { name: "brain:on" }],
          master_feature: { reference_num: "AHA-1000" },
          url: "https://yourco.aha.io/features/AHA-1234",
        },
      }),
    );
    const adapter = new AhaAdapter(config);
    const t = await adapter.fetchTicket("AHA-1234");
    expect(t.id).toBe("AHA-1234");
    expect(t.title).toBe("Add 2FA");
    expect(t.type).toBe("feature");
    expect(t.status).toBe("In Progress");
    expect(t.labels).toEqual(["auth", "brain:on"]);
    expect(t.parentId).toBe("AHA-1000");
  });

  it("normalizes 'requirement' type to 'feature'", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResp({ feature: { reference_num: "AHA-2", type: "requirement" } }),
    );
    const adapter = new AhaAdapter(config);
    const t = await adapter.fetchTicket("AHA-2");
    expect(t.type).toBe("feature");
  });

  it("throws on non-OK response", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Not found", { status: 404 }));
    const adapter = new AhaAdapter(config);
    await expect(adapter.fetchTicket("AHA-X")).rejects.toThrow(/404/);
  });
});

describe("AhaAdapter.searchTickets / listSiblings", () => {
  it("returns parsed tickets from list endpoint", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResp({
        features: [
          { reference_num: "AHA-1", name: "Sibling A", type: "feature" },
          { reference_num: "AHA-2", name: "Sibling B", type: "feature" },
        ],
      }),
    );
    const adapter = new AhaAdapter(config);
    const list = await adapter.searchTickets({ keywords: "auth", limit: 10 });
    expect(list.length).toBe(2);
    expect(list[0]!.id).toBe("AHA-1");
  });

  it("listSiblings returns empty when ticket has no parent", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResp({ feature: { reference_num: "AHA-9" } }));
    const adapter = new AhaAdapter(config);
    expect(await adapter.listSiblings("AHA-9")).toEqual([]);
  });

  it("listSiblings excludes the source ticket", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        jsonResp({
          feature: { reference_num: "AHA-2", master_feature: { reference_num: "AHA-1000" } },
        }),
      )
      .mockResolvedValueOnce(
        jsonResp({
          features: [
            { reference_num: "AHA-1", name: "Sibling 1", type: "feature" },
            { reference_num: "AHA-2", name: "Self", type: "feature" },
            { reference_num: "AHA-3", name: "Sibling 3", type: "feature" },
          ],
        }),
      );
    const adapter = new AhaAdapter(config);
    const sibs = await adapter.listSiblings("AHA-2");
    expect(sibs.map((t) => t.id)).toEqual(["AHA-1", "AHA-3"]);
  });
});

describe("AhaAdapter.postComment / editComment", () => {
  it("posts and returns Comment", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResp({ comment: { id: 42, body: "hello", user: { email: "bot@x.com" }, created_at: "2026-04-01T00:00:00Z" } }),
    );
    const adapter = new AhaAdapter(config);
    const c = await adapter.postComment("AHA-1", "hello");
    expect(c.id).toBe("42");
    expect(c.body).toBe("hello");
    expect(c.author).toBe("bot@x.com");
  });
});

describe("AhaAdapter.verifyWebhook", () => {
  it("returns false when secret not in env", () => {
    delete process.env["AHA_WEBHOOK_SECRET"];
    const adapter = new AhaAdapter(config);
    expect(adapter.verifyWebhook({}, Buffer.from("body"))).toBe(false);
  });

  it("validates HMAC signature when matching", () => {
    process.env["AHA_WEBHOOK_SECRET"] = "shh";
    const body = Buffer.from('{"event":"comment.create"}');
    const mac = createHmac("sha256", "shh").update(body).digest("hex");
    const adapter = new AhaAdapter(config);
    expect(adapter.verifyWebhook({ "x-aha-signature": mac }, body)).toBe(true);
  });

  it("rejects bad signature", () => {
    process.env["AHA_WEBHOOK_SECRET"] = "shh";
    const adapter = new AhaAdapter(config);
    expect(adapter.verifyWebhook({ "x-aha-signature": "deadbeef".repeat(8) }, Buffer.from("body"))).toBe(false);
  });
});

describe("AhaAdapter.parseWebhook", () => {
  const adapter = new AhaAdapter(config);

  it("parses comment.create event", () => {
    const body = Buffer.from(
      JSON.stringify({
        event: "comment.create",
        feature: { reference_num: "AHA-100" },
        comment: { id: 1, body: "/brain groom", user: { email: "pm@x.com" }, created_at: "2026-04-01T00:00:00Z" },
      }),
    );
    const ev = adapter.parseWebhook(body);
    expect(ev.kind).toBe("comment_created");
    expect(ev.ticketId).toBe("AHA-100");
    expect(ev.comment!.body).toBe("/brain groom");
    expect(ev.comment!.author).toBe("pm@x.com");
  });

  it("parses feature.update with status change", () => {
    const body = Buffer.from(
      JSON.stringify({
        event: "feature.update",
        feature: { reference_num: "AHA-200" },
        changes: { workflow_status: { from: "Backlog", to: "Ready for grooming" } },
      }),
    );
    const ev = adapter.parseWebhook(body);
    expect(ev.kind).toBe("ticket_status_changed");
    expect(ev.ticketId).toBe("AHA-200");
    expect(ev.prevStatus).toBe("Backlog");
    expect(ev.newStatus).toBe("Ready for grooming");
  });

  it("returns kind=unknown for unrecognized events", () => {
    const body = Buffer.from(JSON.stringify({ event: "something.else" }));
    expect(adapter.parseWebhook(body).kind).toBe("unknown");
  });
});
