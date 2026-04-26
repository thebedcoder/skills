import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { basicAuthHook, loadAdminAuth } from "../../src/admin/auth.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env["ADMIN_PASSWORD"];
  delete process.env["ADMIN_USER"];
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("loadAdminAuth", () => {
  it("returns null when ADMIN_PASSWORD is not set", () => {
    expect(loadAdminAuth()).toBeNull();
  });

  it("uses 'admin' as default user", () => {
    process.env["ADMIN_PASSWORD"] = "secret";
    const auth = loadAdminAuth();
    expect(auth).not.toBeNull();
    expect(auth!.user).toBe("admin");
    expect(auth!.password).toBe("secret");
  });

  it("respects ADMIN_USER override", () => {
    process.env["ADMIN_PASSWORD"] = "secret";
    process.env["ADMIN_USER"] = "ops";
    expect(loadAdminAuth()!.user).toBe("ops");
  });
});

describe("basicAuthHook", () => {
  function makeApp() {
    const app = Fastify();
    app.addHook("preHandler", basicAuthHook({ user: "admin", password: "topsecret" }));
    app.get("/protected", () => ({ ok: true }));
    return app;
  }

  it("rejects requests with no Authorization header", async () => {
    const app = makeApp();
    const r = await app.inject({ method: "GET", url: "/protected" });
    expect(r.statusCode).toBe(401);
    expect(r.headers["www-authenticate"]).toMatch(/Basic/);
    await app.close();
  });

  it("rejects malformed Authorization header", async () => {
    const app = makeApp();
    const r = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer abc" },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it("rejects wrong password", async () => {
    const app = makeApp();
    const creds = Buffer.from("admin:wrong").toString("base64");
    const r = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Basic ${creds}` },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it("rejects wrong username", async () => {
    const app = makeApp();
    const creds = Buffer.from("notadmin:topsecret").toString("base64");
    const r = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Basic ${creds}` },
    });
    expect(r.statusCode).toBe(401);
    await app.close();
  });

  it("accepts correct credentials", async () => {
    const app = makeApp();
    const creds = Buffer.from("admin:topsecret").toString("base64");
    const r = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Basic ${creds}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true });
    await app.close();
  });
});
