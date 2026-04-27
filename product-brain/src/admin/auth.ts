import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface AdminAuth {
  user: string;
  password: string;
}

export function loadAdminAuth(): AdminAuth | null {
  const password = process.env["ADMIN_PASSWORD"];
  if (!password) return null;
  const user = process.env["ADMIN_USER"] ?? "admin";
  return { user, password };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function basicAuthHook(auth: AdminAuth) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers["authorization"] ?? "";
    if (!header.toLowerCase().startsWith("basic ")) {
      return reply
        .code(401)
        .header("WWW-Authenticate", 'Basic realm="product-brain admin", charset="UTF-8"')
        .send("authentication required");
    }
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx < 0) {
      return reply.code(401).send("invalid credentials");
    }
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    if (!safeEqual(user, auth.user) || !safeEqual(pass, auth.password)) {
      return reply.code(401).send("invalid credentials");
    }
  };
}
