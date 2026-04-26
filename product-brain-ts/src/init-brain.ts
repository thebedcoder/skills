// Port target: ../product-brain/src/product_brain/init_brain.py
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const GITIGNORE = `__pycache__/
*.pyc
node_modules/
dist/
.env
*.sqlite
*.sqlite-journal
.venv/
`;

const README = `# Company Product Brain

Central memory + planning index for bound source repos.
Maintained by the \`product-brain\` tool.

Layout:

    config.yaml             orchestrator config
    repos/                  one subdirectory per bound source repo
      <name>/
        manifest.md
        tickets/
          AHA-NNNN.md
    audit.sqlite            (gitignored) bot audit log
    queue.sqlite            (gitignored) bot job queue

Add a source repo:

    product-brain bind /path/to/source-repo --name <short-name>

Backfill / sync:

    product-brain backfill --repo <name>
    product-brain sync --repo <name>
`;

const MIN_CONFIG = `repos: []

ticket_regex: 'AHA-\\d+'
pm_adapter: aha

aha:
  subdomain: yourcompany
  api_key_env: AHA_API_KEY

llm:
  provider: anthropic
  api_key_env: ANTHROPIC_API_KEY
  model_summarize: claude-haiku-4-5-20251001
  model_synthesize: claude-sonnet-4-6

estimate:
  unit: days
  reference_window_days: 90

bot:
  enabled: false

audit: { path: ./audit.sqlite }
queue: { backend: sqlite, path: ./queue.sqlite }
`;

export interface InitResult {
  brain_path: string;
  config: string;
  next: string;
}

export function initBrainRepo(brainPath: string, force = false): InitResult {
  const resolved = path.resolve(brainPath);
  mkdirSync(resolved, { recursive: true });

  const configPath = path.join(resolved, "config.yaml");
  if (existsSync(configPath) && !force) {
    throw new Error(`${configPath} already exists; pass --force to overwrite`);
  }

  writeFileSync(configPath, MIN_CONFIG);

  mkdirSync(path.join(resolved, "repos"), { recursive: true });

  const gitignore = path.join(resolved, ".gitignore");
  if (!existsSync(gitignore)) writeFileSync(gitignore, GITIGNORE);

  const readme = path.join(resolved, "README.md");
  if (!existsSync(readme)) writeFileSync(readme, README);

  if (!existsSync(path.join(resolved, ".git"))) {
    try {
      execFileSync("git", ["-C", resolved, "init"], { stdio: "ignore" });
    } catch {
      // git not available; skip
    }
  }

  return {
    brain_path: resolved,
    config: configPath,
    next: "edit config.yaml, then `product-brain bind <source-path> --name <name>`",
  };
}
