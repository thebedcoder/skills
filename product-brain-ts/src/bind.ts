// Port target: ../product-brain/src/product_brain/bind.py
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { LLMCall } from "./backfill/summarize.js";
import type { Manifest } from "./models.js";
import { writeManifest } from "./records/write.js";

const EXT_LANG: Record<string, string> = {
  ".py": "python",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".dart": "dart",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".php": "php",
  ".cs": "csharp",
  ".scala": "scala",
  ".ex": "elixir",
  ".exs": "elixir",
};

const ENTRY_PATTERNS: Record<string, string[]> = {
  python: ["main.py", "app.py", "manage.py", "server.py", "api/main.py", "src/main.py", "src/__main__.py"],
  typescript: ["index.ts", "index.tsx", "src/index.ts", "src/index.tsx", "src/main.ts", "src/main.tsx", "server.ts", "app.ts"],
  javascript: ["index.js", "src/index.js", "server.js", "app.js"],
  dart: ["lib/main.dart", "bin/main.dart"],
  go: ["main.go", "cmd/main.go"],
  rust: ["src/main.rs", "src/lib.rs"],
  ruby: ["config.ru", "app.rb", "main.rb"],
  java: ["src/main/java/Main.java"],
  kotlin: ["src/main/kotlin/Main.kt"],
};

const STANDARD_IGNORES = [
  "vendor/", "node_modules/", ".next/", "build/", "dist/",
  "target/", ".venv/", "venv/", "__pycache__/", ".pytest_cache/",
  "coverage/", ".nuxt/", ".cache/", "out/", "bin/", "obj/",
];

const PROSE_PROMPT = `Summarize this repo for a planning agent.

Output 3 sections, plain markdown, Caveman style (drop articles/filler/hedging):

## What this repo is
One paragraph. What it does. Tech stack one-liner.

## Conventions worth knowing
3-6 bullets. Patterns engineer joining team would need. From inputs only — no invention.

## Out-of-scope areas
0-3 bullets. Frozen/legacy/foreign-team dirs IF obvious. Skip section if unclear.

INPUTS:
%INPUTS%
`;

export function detectLanguages(repo: string, topN = 4): string[] {
  let stdout: string;
  try {
    stdout = execFileSync("git", ["-C", repo, "ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return [];
  }
  const counts = new Map<string, number>();
  for (const line of stdout.split("\n")) {
    const ext = path.extname(line).toLowerCase();
    const lang = EXT_LANG[ext];
    if (lang) counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN).map(([l]) => l);
}

export function detectEntryPoints(repo: string, languages: string[]): string[] {
  const out: string[] = [];
  for (const lang of languages) {
    for (const pattern of ENTRY_PATTERNS[lang] ?? []) {
      if (existsSync(path.join(repo, pattern))) out.push(pattern);
    }
  }
  const pkg = path.join(repo, "package.json");
  if (existsSync(pkg)) {
    try {
      const data = JSON.parse(readFileSync(pkg, "utf8")) as { main?: string };
      if (data.main && existsSync(path.join(repo, data.main)) && !out.includes(data.main)) {
        out.push(data.main);
      }
    } catch {
      // ignore parse errors
    }
  }
  return out.slice(0, 6);
}

export function detectWorkflow(repo: string): "squash" | "merge" | "rebase" {
  let stdout: string;
  try {
    stdout = execFileSync("git", ["-C", repo, "log", "--max-count=100", "--pretty=%P"], { encoding: "utf8" });
  } catch {
    return "squash";
  }
  const lines = stdout.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "squash";
  const mergeCount = lines.filter((l) => l.split(" ").length >= 2).length;
  return mergeCount / lines.length > 0.3 ? "merge" : "squash";
}

export function detectIgnorePaths(repo: string): string[] {
  const out = [...STANDARD_IGNORES];
  const gi = path.join(repo, ".gitignore");
  if (existsSync(gi)) {
    for (const line of readFileSync(gi, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.endsWith("/") && !trimmed.slice(0, -1).includes("/")) {
        if (!out.includes(trimmed)) out.push(trimmed);
      }
    }
  }
  return out.slice(0, 25);
}

function gatherProseInputs(repo: string, maxChars = 8000): string {
  const candidates = [
    "README.md", "README.rst", "README",
    "package.json", "pyproject.toml", "Cargo.toml",
    "pubspec.yaml", "go.mod", "Gemfile",
    "docs/CONSTITUTION.md", "CLAUDE.md", "docs/INDEX.md",
  ];
  const parts: string[] = [];
  let budget = maxChars;
  for (const name of candidates) {
    const p = path.join(repo, name);
    if (!existsSync(p) || budget <= 0) continue;
    try {
      const text = readFileSync(p, "utf8").slice(0, budget);
      parts.push(`=== ${name} ===\n${text}`);
      budget -= text.length;
    } catch {
      continue;
    }
  }
  return parts.join("\n\n");
}

export interface BindOpts {
  brainRoot: string;
  sourcePath: string;
  repoName: string;
  ticketRegex?: string;
  llmCall?: LLMCall;
  force?: boolean;
}

export async function bindRepo(opts: BindOpts): Promise<Manifest> {
  const sourcePath = path.resolve(opts.sourcePath);
  const brainRoot = path.resolve(opts.brainRoot);
  if (!existsSync(path.join(sourcePath, ".git"))) {
    throw new Error(`${sourcePath} is not a git repo`);
  }
  const target = path.join(brainRoot, "repos", opts.repoName, "manifest.md");
  if (existsSync(target) && !opts.force) {
    throw new Error(`${target} already exists; pass --force to overwrite`);
  }

  const languages = detectLanguages(sourcePath);
  const entryPoints = detectEntryPoints(sourcePath, languages);
  const workflow = detectWorkflow(sourcePath);
  const ignorePaths = detectIgnorePaths(sourcePath);

  let body = `## What this repo is

_(fill in: one paragraph; what it does, tech stack one-liner)_

## Conventions worth knowing

_(fill in: 3-6 bullets on patterns/constraints)_

## Out-of-scope areas

_(optional: legacy/frozen/foreign-owned dirs)_
`;
  if (opts.llmCall) {
    const inputs = gatherProseInputs(sourcePath);
    if (inputs) {
      try {
        const generated = await opts.llmCall(PROSE_PROMPT.replace("%INPUTS%", inputs), 800);
        if (generated && generated.includes("## What this repo is")) {
          body = generated.trim() + "\n";
        }
      } catch {
        // keep placeholder
      }
    }
  }

  const manifest: Manifest = {
    repo: opts.repoName,
    ticketRegex: opts.ticketRegex ?? "AHA-\\d+",
    workflow,
    languages,
    entryPoints,
    ownersFile: "CODEOWNERS",
    ignorePaths,
    megaFileThreshold: 0.95,
    lastIndexedSha: "",
    indexCutoffDate: "",
    body,
  };
  writeManifest(brainRoot, manifest);
  return manifest;
}

function tryRelative(target: string, base: string): string {
  const t = path.resolve(target);
  const b = path.resolve(base);
  const rel = path.relative(b, t);
  return rel || ".";
}

export function addToConfig(brainRoot: string, repoName: string, sourcePath: string): void {
  const configPath = path.join(brainRoot, "config.yaml");
  if (!existsSync(configPath)) {
    throw new Error(`${configPath} not found; run \`product-brain init\` first`);
  }
  const raw = (yaml.load(readFileSync(configPath, "utf8")) ?? {}) as Record<string, unknown>;
  const repos = (raw["repos"] as Array<Record<string, unknown>>) ?? [];
  const rel = tryRelative(sourcePath, brainRoot);
  const existing = repos.find((r) => r["name"] === repoName);
  if (existing) {
    existing["path"] = rel;
  } else {
    repos.push({ name: repoName, path: rel });
  }
  raw["repos"] = repos;
  writeFileSync(configPath, yaml.dump(raw, { sortKeys: false }));
}
