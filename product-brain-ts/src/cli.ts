#!/usr/bin/env node
// Port target: ../product-brain/src/product_brain/cli.py
import "dotenv/config";
import { Command } from "commander";
import { addToConfig, bindRepo } from "./bind.js";
import { backfillRepo } from "./backfill/run.js";
import { llmCallFactory } from "./backfill/summarize.js";
import { AuditLog } from "./bot/audit.js";
import { Queue } from "./bot/queue.js";
import { buildApp } from "./bot/webhook.js";
import { runWorker } from "./bot/worker.js";
import { load } from "./config.js";
import { runForSource } from "./incremental.js";
import { initBrainRepo } from "./init-brain.js";
import { migrateSource } from "./migrate.js";
import { runCommand } from "./planner.js";
import { repairRepo } from "./repair.js";

const program = new Command();
program
  .name("product-brain")
  .description("Cross-repo memory + planning over a ticket-keyed code index.")
  .version("0.1.0-ts.0")
  .option("--config <path>", "path to config.yaml");

program
  .command("init")
  .description("bootstrap an empty brain repo (config.yaml, repos/, .gitignore, README)")
  .option("--path <path>", "where to create the brain repo; defaults to cwd")
  .option("--force", "overwrite existing config.yaml", false)
  .action((opts: { path?: string; force?: boolean }) => {
    const result = initBrainRepo(opts.path ?? ".", Boolean(opts.force));
    process.stdout.write(`initialized brain repo at ${result.brain_path}\n`);
    process.stdout.write(`  config: ${result.config}\n`);
    process.stdout.write(`  next:   ${result.next}\n`);
  });

program
  .command("bind <source>")
  .description("bind a source repo into this brain (writes manifest, updates config)")
  .option("--name <name>", "short name for the repo; defaults to source dir name")
  .option("--ticket-regex <regex>", "override ticket regex; default from config or AHA-\\d+")
  .option("--no-llm", "skip LLM prose generation")
  .option("--force", "overwrite existing manifest", false)
  .action(async (
    source: string,
    opts: { name?: string; ticketRegex?: string; llm: boolean; force?: boolean },
  ) => {
    const configPath = program.opts<{ config?: string }>().config;
    const sourcePath = source;
    const repoName = opts.name ?? sourcePath.split("/").filter(Boolean).pop() ?? "repo";

    let config;
    let llmCall;
    let ticketRegex = opts.ticketRegex;
    try {
      config = load(configPath);
      ticketRegex = ticketRegex ?? config.ticketRegex;
      if (opts.llm) {
        try {
          llmCall = llmCallFactory(config, config.llm.model_summarize);
        } catch {
          llmCall = undefined;
        }
      }
    } catch {
      config = undefined;
    }

    const brainRoot = config?.brainRoot ?? process.cwd();
    const manifest = await bindRepo({
      brainRoot,
      sourcePath,
      repoName,
      ticketRegex: ticketRegex ?? "AHA-\\d+",
      llmCall,
      force: Boolean(opts.force),
    });

    if (config) addToConfig(brainRoot, repoName, sourcePath);

    process.stdout.write(`bound ${sourcePath} as '${repoName}'\n`);
    process.stdout.write(`  manifest:     ${brainRoot}/repos/${repoName}/manifest.md\n`);
    process.stdout.write(`  workflow:     ${manifest.workflow}\n`);
    process.stdout.write(`  languages:    ${manifest.languages.join(", ") || "(none detected)"}\n`);
    process.stdout.write(`  entry_points: ${manifest.entryPoints.join(", ") || "(none detected)"}\n`);
    process.stdout.write(`  prose body:   ${llmCall ? "LLM-generated" : "placeholder (edit by hand)"}\n`);
  });

program
  .command("migrate")
  .description("copy legacy in-repo .product-brain/ into the brain repo layout")
  .requiredOption("--repo <name>", "repo name (must be in config)")
  .option("--remove-from-source", "delete .product-brain/ from source after copy", false)
  .action((opts: { repo: string; removeFromSource?: boolean }) => {
    const config = load(program.opts<{ config?: string }>().config);
    const repoCfg = config.repo(opts.repo);
    const result = migrateSource(config.brainRoot, repoCfg.path, opts.repo, Boolean(opts.removeFromSource));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  });

program
  .command("backfill")
  .description("rebuild ticket records from git log")
  .option("--repo <name>")
  .option("--since <sha-or-date>")
  .option("--force", "rebuild all records", false)
  .option("--no-llm", "rebuild front-matter only")
  .action(async (opts: { repo?: string; since?: string; force?: boolean; llm: boolean }) => {
    const config = load(program.opts<{ config?: string }>().config);
    const repos = opts.repo ? [opts.repo] : config.repos.map((r) => r.name);
    for (const r of repos) {
      const result = await backfillRepo(config, r, {
        since: opts.since,
        force: Boolean(opts.force),
        skipLlm: !opts.llm,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
  });

program
  .command("sync")
  .description("alias for backfill (incremental by default)")
  .option("--repo <name>")
  .option("--since <sha-or-date>")
  .option("--force", "rebuild all records", false)
  .option("--no-llm", "rebuild front-matter only")
  .action(async (opts: { repo?: string; since?: string; force?: boolean; llm: boolean }) => {
    const config = load(program.opts<{ config?: string }>().config);
    const repos = opts.repo ? [opts.repo] : config.repos.map((r) => r.name);
    for (const r of repos) {
      const result = await backfillRepo(config, r, {
        since: opts.since,
        force: Boolean(opts.force),
        skipLlm: !opts.llm,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
  });

program
  .command("repair")
  .description("validate citations and reconcile state")
  .option("--repo <name>")
  .action(async (opts: { repo?: string }) => {
    const config = load(program.opts<{ config?: string }>().config);
    const repos = opts.repo ? [opts.repo] : config.repos.map((r) => r.name);
    for (const r of repos) {
      const result = await repairRepo(config, r);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
  });

program
  .command("incremental")
  .description("post-merge target: update one repo's records")
  .requiredOption("--repo <name>", "repo name (must be in config)")
  .option("--since <sha>", "git SHA; default: parent of HEAD")
  .action(async (opts: { repo: string; since?: string }) => {
    const code = await runForSource(opts.repo, opts.since, program.opts<{ config?: string }>().config);
    process.exit(code);
  });

program
  .command("run <command> <ticket>")
  .description("run a command (groom, estimate, edges, ...) for a ticket")
  .option("--args <args>", "extra args", "")
  .action(async (command: string, ticket: string, opts: { args?: string }) => {
    const valid = new Set(["groom", "estimate", "edges", "related", "draft-tickets"]);
    if (!valid.has(command)) {
      process.stderr.write(`unknown command: ${command}. valid: ${[...valid].join(", ")}\n`);
      process.exit(2);
    }
    const config = load(program.opts<{ config?: string }>().config);
    const result = await runCommand(config, command, ticket, opts.args ?? "");
    process.stdout.write(`${result.body}\n`);
    process.stderr.write(`\n---\n${result.summary}\n`);
  });

const bot = program.command("bot").description("bot subcommands");
bot
  .command("serve")
  .description("run the webhook server")
  .action(async () => {
    const config = load(program.opts<{ config?: string }>().config);
    const app = buildApp(config);
    await app.listen({ host: config.bot.host, port: config.bot.port });
    process.stdout.write(`bot listening on ${config.bot.host}:${config.bot.port}\n`);
  });
bot
  .command("worker")
  .description("run the job worker")
  .action(async () => {
    const config = load(program.opts<{ config?: string }>().config);
    await runWorker(config);
  });
bot
  .command("status")
  .description("queue depth and worker health")
  .action(() => {
    const config = load(program.opts<{ config?: string }>().config);
    const q = new Queue(config.queue.path);
    process.stdout.write(`${JSON.stringify(q.depth(), null, 2)}\n`);
  });
bot
  .command("tail-audit")
  .description("follow the audit log")
  .option("--limit <n>", "number of entries", "50")
  .action((opts: { limit: string }) => {
    const config = load(program.opts<{ config?: string }>().config);
    const a = new AuditLog(config.audit.path);
    for (const entry of a.tail(Number(opts.limit)).reverse()) {
      const t = entry.timestamp.toFixed(0);
      process.stdout.write(
        `${t} ${entry.command.padEnd(8)} ${entry.ticketId.padEnd(12)} ${entry.requester.padEnd(20)} ${entry.outputSummary ?? entry.error ?? ""}\n`,
      );
    }
  });

program.parseAsync().catch((e: Error) => {
  process.stderr.write(`error: ${e.message}\n`);
  process.exit(1);
});
