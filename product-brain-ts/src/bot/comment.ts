// Port target: ../product-brain/src/product_brain/bot/comment.py
import { createHash } from "node:crypto";
import type { Comment } from "../models.js";

export const COMMENT_HEADER_PREFIX = "🧠 **product-brain**";

function header(command: string, runAt: Date): string {
  const y = runAt.getUTCFullYear();
  const m = String(runAt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(runAt.getUTCDate()).padStart(2, "0");
  const hh = String(runAt.getUTCHours()).padStart(2, "0");
  const mm = String(runAt.getUTCMinutes()).padStart(2, "0");
  return `${COMMENT_HEADER_PREFIX} · ${command} · run ${y}-${m}-${d} ${hh}:${mm}`;
}

export interface BuildCommentOpts {
  body: string;
  command: string;
  trigger: string;
  requester: string;
  runId: string;
  auditUrl?: string;
  changeNote?: string;
  runAt?: Date;
}

export function buildComment(opts: BuildCommentOpts): string {
  const runAt = opts.runAt ?? new Date();
  const parts = [header(opts.command, runAt)];
  if (opts.changeNote) parts.push(`_${opts.changeNote}_`);
  parts.push("");
  parts.push(opts.body.trim());
  parts.push("");
  parts.push("---");
  let footer = `<sub>Trigger: ${opts.trigger} by ${opts.requester} · Re-run with \`/brain refresh\` · Disable with label \`brain:off\``;
  if (opts.auditUrl) footer += ` · [Audit log](${opts.auditUrl})`;
  footer += ` · run_id=${opts.runId}</sub>`;
  parts.push(footer);
  return parts.join("\n");
}

export function locateExisting(comments: Comment[], command: string): Comment | null {
  for (const c of comments) {
    if (c.body.startsWith(COMMENT_HEADER_PREFIX) && c.body.includes(`· ${command} ·`)) {
      return c;
    }
  }
  return null;
}

export function contentHash(...parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) {
    h.update(p, "utf8");
    h.update(Buffer.from([0]));
  }
  return h.digest("hex").slice(0, 16);
}
