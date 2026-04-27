import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import yaml from "js-yaml";

const repoSchema = z.object({
  name: z.string(),
  path: z.string(),
});

const llmSchema = z.object({
  provider: z.enum(["anthropic", "openai", "azure_openai", "openai_compatible"]).default("anthropic"),
  api_key_env: z.string().default("ANTHROPIC_API_KEY"),
  base_url: z.string().nullable().optional(),
  api_version: z.string().nullable().optional(),
  model_summarize: z.string().default("claude-haiku-4-5-20251001"),
  model_extract: z.string().default("claude-haiku-4-5-20251001"),
  model_synthesize: z.string().default("claude-sonnet-4-6"),
  max_input_tokens_per_ticket: z.number().int().default(8000),
});

const estimateSchema = z.object({
  unit: z.enum(["days", "points"]).default("days"),
  reference_window_days: z.number().int().default(90),
  min_similarity: z.number().default(0.4),
  min_references_for_medium: z.number().int().default(4),
  min_references_for_high: z.number().int().default(6),
});

const backfillSchema = z.object({
  workflow: z.enum(["squash", "merge", "rebase"]).default("squash"),
  pr_enrichment: z.boolean().default(true),
  symbol_extraction: z.boolean().default(false),
});

const botSchema = z.object({
  enabled: z.boolean().default(false),
  host: z.string().default("0.0.0.0"),
  port: z.number().int().default(8088),
  webhook_signing_secret_env: z.string().default("AHA_WEBHOOK_SECRET"),
  allowed_users: z.array(z.string()).default([]),
  cooldown_hours: z.number().int().default(24),
  opt_in_label: z.string().default("brain:on"),
  kill_switch_label: z.string().default("brain:off"),
  quiet_hours_utc: z.array(z.number()).length(2).default([22, 7]),
  draft_status: z.string().default("Bot-draft"),
});

const ahaSchema = z.object({
  subdomain: z.string().default(""),
  api_key_env: z.string().default("AHA_API_KEY"),
  workspace: z.string().default(""),
});

const testrailSchema = z.object({
  base_url: z.string().default(""),
  user_email: z.string().default(""),
  api_key_env: z.string().default("TESTRAIL_API_KEY"),
  project_id: z.number().int().default(0),
  refs_field: z.string().default("refs"),
  run_history_window_days: z.number().int().default(90),
});

const githubSchema = z.object({
  api_key_env: z.string().default("GITHUB_TOKEN"),
});

const auditSchema = z.object({
  path: z.string().default("./audit.sqlite"),
});

const queueSchema = z.object({
  backend: z.enum(["sqlite", "redis"]).default("sqlite"),
  path: z.string().default("./queue.sqlite"),
});

const rawConfigSchema = z.object({
  repos: z.array(repoSchema).min(1),
  pm_adapter: z.string(),
  ticket_regex: z.string().default("AHA-\\d+"),
  test_adapter: z.string().nullable().optional(),
  aha: ahaSchema.prefault({}),
  testrail: testrailSchema.prefault({}),
  github: githubSchema.prefault({}),
  llm: llmSchema.prefault({}),
  estimate: estimateSchema.prefault({}),
  backfill: backfillSchema.prefault({}),
  bot: botSchema.prefault({}),
  audit: auditSchema.prefault({}),
  queue: queueSchema.prefault({}),
});

export type LLMConfig = z.infer<typeof llmSchema>;
export type EstimateConfig = z.infer<typeof estimateSchema>;
export type BackfillConfig = z.infer<typeof backfillSchema>;
export type BotConfig = z.infer<typeof botSchema>;
export type AhaConfig = z.infer<typeof ahaSchema>;
export type TestRailConfig = z.infer<typeof testrailSchema>;
export type GitHubConfig = z.infer<typeof githubSchema>;
export type AuditConfig = z.infer<typeof auditSchema>;
export type QueueConfig = z.infer<typeof queueSchema>;

export interface RepoConfig {
  name: string;
  path: string;
}

export interface Config {
  repos: RepoConfig[];
  pmAdapter: string;
  ticketRegex: string;
  testAdapter?: string | null;
  aha: AhaConfig;
  testrail: TestRailConfig;
  github: GitHubConfig;
  llm: LLMConfig;
  estimate: EstimateConfig;
  backfill: BackfillConfig;
  bot: BotConfig;
  audit: AuditConfig;
  queue: QueueConfig;
  configDir: string;
  brainRoot: string;
  repo(name: string): RepoConfig;
  repoDir(name: string): string;
  ticketsDir(name: string): string;
  manifestPath(name: string): string;
  llmApiKey(): string;
  ahaApiKey(): string;
  testrailApiKey(): string | undefined;
  githubToken(): string | undefined;
}

export function load(configPath?: string): Config {
  const candidates: string[] = [];
  if (configPath) candidates.push(configPath);
  candidates.push(path.join(process.cwd(), "config.yaml"));
  candidates.push(path.join(homedir(), ".config", "product-brain", "config.yaml"));

  for (const c of candidates) {
    if (existsSync(c)) return loadFrom(c);
  }
  throw new Error(`No config.yaml found. Looked in: ${candidates.join(", ")}`);
}

function loadFrom(filePath: string): Config {
  const raw = yaml.load(readFileSync(filePath, "utf8"));
  const parsed = rawConfigSchema.parse(raw);
  const configDir = path.resolve(path.dirname(filePath));

  const repos: RepoConfig[] = parsed.repos.map((r) => ({
    name: r.name,
    path: path.resolve(configDir, r.path),
  }));

  const reposByName = new Map(repos.map((r) => [r.name, r]));

  const cfg: Config = {
    repos,
    pmAdapter: parsed.pm_adapter,
    ticketRegex: parsed.ticket_regex,
    testAdapter: parsed.test_adapter ?? null,
    aha: parsed.aha,
    testrail: parsed.testrail,
    github: parsed.github,
    llm: parsed.llm,
    estimate: parsed.estimate,
    backfill: parsed.backfill,
    bot: parsed.bot,
    audit: parsed.audit,
    queue: parsed.queue,
    configDir,
    brainRoot: configDir,
    repo(name: string) {
      const r = reposByName.get(name);
      if (!r) throw new Error(`repo not configured: ${name}`);
      return r;
    },
    repoDir(name: string) {
      return path.join(configDir, "repos", name);
    },
    ticketsDir(name: string) {
      return path.join(configDir, "repos", name, "tickets");
    },
    manifestPath(name: string) {
      return path.join(configDir, "repos", name, "manifest.md");
    },
    llmApiKey() {
      const v = process.env[this.llm.api_key_env];
      if (!v) throw new Error(`env var not set: ${this.llm.api_key_env}`);
      return v;
    },
    ahaApiKey() {
      const v = process.env[this.aha.api_key_env];
      if (!v) throw new Error(`env var not set: ${this.aha.api_key_env}`);
      return v;
    },
    testrailApiKey() {
      return process.env[this.testrail.api_key_env];
    },
    githubToken() {
      return process.env[this.github.api_key_env];
    },
  };
  return cfg;
}
