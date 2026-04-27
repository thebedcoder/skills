import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { getPmAdapter } from "../adapters/index.js";
import { backfillRepo, type BackfillResult } from "../backfill/run.js";
import type { Config } from "../config.js";
import { runCommand } from "../planner.js";
import { AuditLog, type AuditEntry } from "./audit.js";
import { buildComment, contentHash, locateExisting } from "./comment.js";
import { inQuietHours, withinCooldown } from "./cooldown.js";
import { Queue, type Job } from "./queue.js";

function commitBrainRepo(config: Config, repoName: string, summary: BackfillResult): void {
  const brain = config.brainRoot;
  try {
    execFileSync("git", ["-C", brain, "add", `repos/${repoName}`], { stdio: "ignore" });
  } catch {
    // nothing to add yet
  }
  const msg = `sync(${repoName}): ${summary.written} updated, ${summary.created} new`;
  try {
    execFileSync("git", ["-C", brain, "commit", "-m", msg], { stdio: "ignore" });
  } catch {
    return;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      execFileSync("git", ["-C", brain, "pull", "--rebase"], { stdio: "ignore" });
      execFileSync("git", ["-C", brain, "push"], { stdio: "ignore" });
      return;
    } catch {
      // retry with backoff
      const delay = (2 ** attempt) * 1000;
      const start = Date.now();
      while (Date.now() - start < delay) {
        // sync sleep is fine inside worker; queue serializes jobs
      }
    }
  }
}

async function processSourceMerge(job: Job, config: Config, queue: Queue, audit: AuditLog): Promise<void> {
  const repoName = String(job.payload["repo"] ?? "");
  const sinceSha = job.payload["since_sha"] as string | undefined;
  const summary = await backfillRepo(config, repoName, { since: sinceSha });
  commitBrainRepo(config, repoName, summary);
  audit.append({
    id: randomUUID(),
    timestamp: Date.now() / 1000,
    trigger: job.trigger,
    ticketId: job.ticketId,
    command: job.command,
    requester: job.requester,
    outputSummary: JSON.stringify(summary),
    model: "",
    costUsd: 0,
  });
  queue.complete(job.id);
}

function extractDrafts(body: string): Array<{ title: string; description: string }> {
  const out: Array<{ title: string; description: string }> = [];
  let inSection = false;
  let current: { title: string; description: string } | null = null;
  for (const line of body.split("\n")) {
    if (line.trim().startsWith("## Draft sub-tickets")) {
      inSection = true;
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith("### ")) {
      if (current) out.push(current);
      current = { title: line.slice(4).trim(), description: "" };
    } else if (current) {
      current.description += line + "\n";
    }
  }
  if (current) out.push(current);
  return out;
}

async function processJob(job: Job, config: Config, queue: Queue, audit: AuditLog): Promise<void> {
  if (job.command === "source-merge") {
    return processSourceMerge(job, config, queue, audit);
  }

  const adapter = getPmAdapter(config.pmAdapter, config);
  const now = new Date();

  const isAuto = job.trigger.startsWith("status:") || job.trigger.startsWith("auto:");
  const last = audit.lastForTicket(job.ticketId, job.command);

  if (isAuto) {
    if (last && withinCooldown(last.timestamp, now, config.bot.cooldown_hours)) {
      queue.complete(job.id);
      return;
    }
    if (inQuietHours(now, config.bot.quiet_hours_utc)) {
      queue.complete(job.id);
      return;
    }
  }

  const { body, summary, model, cost } = await runCommand(
    config,
    job.command,
    job.ticketId,
    String(job.payload["args"] ?? ""),
  );

  const h = contentHash(body);
  if (last && last.inputHash === h) {
    queue.complete(job.id);
    audit.append({
      id: randomUUID(),
      timestamp: Date.now() / 1000,
      trigger: job.trigger,
      ticketId: job.ticketId,
      command: job.command,
      requester: job.requester,
      inputHash: h,
      outputSummary: "(skipped: unchanged)",
      model,
      costUsd: 0,
    });
    return;
  }

  const changeNote = last && last.inputHash && last.inputHash !== h
    ? "Inputs changed since last run."
    : undefined;

  const runId = randomUUID();
  const fullBody = buildComment({
    body,
    command: job.command,
    trigger: job.trigger,
    requester: job.requester,
    runId,
    changeNote,
    runAt: now,
  });

  if (job.command === "draft-tickets") {
    await adapter.postComment(job.ticketId, fullBody);
    for (const draft of extractDrafts(body)) {
      await adapter.createTicket({
        title: draft.title,
        description: draft.description,
        parentId: job.ticketId,
        status: config.bot.draft_status,
      });
    }
  } else {
    const comments = await adapter.listComments(job.ticketId);
    const existing = locateExisting(comments, job.command);
    if (existing) await adapter.editComment(job.ticketId, existing.id, fullBody);
    else await adapter.postComment(job.ticketId, fullBody);
  }

  audit.append({
    id: runId,
    timestamp: Date.now() / 1000,
    trigger: job.trigger,
    ticketId: job.ticketId,
    command: job.command,
    requester: job.requester,
    inputHash: h,
    outputSummary: summary,
    model,
    costUsd: cost,
  });
  queue.complete(job.id);
}

export async function runWorker(config: Config, pollSeconds = 2): Promise<never> {
  const queue = new Queue(config.queue.path);
  const audit = new AuditLog(config.audit.path);
  while (true) {
    const job = queue.claimNext();
    if (!job) {
      await sleep(pollSeconds * 1000);
      continue;
    }
    try {
      await processJob(job, config, queue, audit);
    } catch (e) {
      const err = e as Error;
      queue.fail(job.id, `${err.message}\n${err.stack ?? ""}`);
      audit.append({
        id: randomUUID(),
        timestamp: Date.now() / 1000,
        trigger: job.trigger,
        ticketId: job.ticketId,
        command: job.command,
        requester: job.requester,
        error: err.message,
      });
    }
  }
}
