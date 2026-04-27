import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addToConfig,
  bindRepo,
  detectEntryPoints,
  detectIgnorePaths,
  detectLanguages,
  detectWorkflow,
} from "../src/bind.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-bind-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeRepo(target: string, files: Record<string, string> = {}, gitignore?: string): void {
  mkdirSync(target, { recursive: true });
  const opts = { stdio: "ignore" as const };
  execFileSync("git", ["-C", target, "init", "-b", "main"], opts);
  execFileSync("git", ["-C", target, "config", "user.email", "test@example.com"], opts);
  execFileSync("git", ["-C", target, "config", "user.name", "Test"], opts);
  execFileSync("git", ["-C", target, "config", "commit.gpgsign", "false"], opts);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(target, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  if (gitignore) writeFileSync(path.join(target, ".gitignore"), gitignore);
  execFileSync("git", ["-C", target, "add", "."], opts);
  execFileSync(
    "git",
    ["-c", "commit.gpgsign=false", "-C", target, "commit", "-m", "init", "--no-verify", "--no-gpg-sign"],
    {
      stdio: "ignore",
      env: { ...process.env, GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.com" },
    },
  );
}

describe("language and entry-point detection", () => {
  it("detects Python when .py files dominate", () => {
    const repo = path.join(dir, "src");
    makeRepo(repo, {
      "main.py": "print('hi')",
      "app.py": "print('hi')",
      "README.md": "# repo",
    });
    expect(detectLanguages(repo)).toContain("python");
  });

  it("detects entry points by language patterns", () => {
    const repo = path.join(dir, "src");
    makeRepo(repo, {
      "src/main.ts": "export {};",
      "src/index.ts": "export {};",
    });
    const entries = detectEntryPoints(repo, ["typescript"]);
    expect(entries).toContain("src/main.ts");
    expect(entries).toContain("src/index.ts");
  });

  it("includes package.json main field when present", () => {
    const repo = path.join(dir, "src");
    makeRepo(repo, {
      "package.json": JSON.stringify({ main: "dist/index.js" }),
      "dist/index.js": "module.exports = {};",
    });
    const entries = detectEntryPoints(repo, ["javascript"]);
    expect(entries).toContain("dist/index.js");
  });

  it("workflow defaults to squash without merge commits", () => {
    const repo = path.join(dir, "src");
    makeRepo(repo, { "main.py": "print()" });
    expect(detectWorkflow(repo)).toBe("squash");
  });

  it("detectIgnorePaths includes standard ignores", () => {
    const repo = path.join(dir, "src");
    makeRepo(repo, { "main.py": "print()" }, "build/\nlocal_only/\n");
    const ignores = detectIgnorePaths(repo);
    expect(ignores).toContain("node_modules/");
    expect(ignores).toContain("vendor/");
    expect(ignores).toContain("local_only/");
  });
});

describe("bindRepo", () => {
  it("writes manifest into the brain repo, not the source", async () => {
    const source = path.join(dir, "source-repo");
    const brain = path.join(dir, "brain");
    makeRepo(source, { "main.py": "print()" });
    mkdirSync(brain, { recursive: true });

    const manifest = await bindRepo({
      brainRoot: brain,
      sourcePath: source,
      repoName: "backend",
    });

    expect(manifest.repo).toBe("backend");
    expect(existsSync(path.join(brain, "repos", "backend", "manifest.md"))).toBe(true);
    expect(existsSync(path.join(source, ".product-brain"))).toBe(false);
  });

  it("rejects non-git source", async () => {
    const source = path.join(dir, "not-git");
    mkdirSync(source);
    await expect(
      bindRepo({ brainRoot: dir, sourcePath: source, repoName: "x" }),
    ).rejects.toThrow(/not a git repo/);
  });

  it("refuses overwrite without --force", async () => {
    const source = path.join(dir, "source-repo");
    const brain = path.join(dir, "brain");
    makeRepo(source, { "main.py": "print()" });
    mkdirSync(brain, { recursive: true });

    await bindRepo({ brainRoot: brain, sourcePath: source, repoName: "backend" });
    await expect(
      bindRepo({ brainRoot: brain, sourcePath: source, repoName: "backend" }),
    ).rejects.toThrow(/already exists/);
  });
});

describe("addToConfig", () => {
  it("appends to repos[] when name not present", () => {
    const brain = path.join(dir, "brain");
    mkdirSync(brain, { recursive: true });
    writeFileSync(path.join(brain, "config.yaml"), "repos: []\npm_adapter: aha\n");
    addToConfig(brain, "backend", path.join(dir, "source-repo"));
    const cfg = readFileSync(path.join(brain, "config.yaml"), "utf8");
    expect(cfg).toMatch(/name:\s*backend/);
  });

  it("updates path when name already present", () => {
    const brain = path.join(dir, "brain");
    mkdirSync(brain, { recursive: true });
    writeFileSync(
      path.join(brain, "config.yaml"),
      "repos:\n  - name: backend\n    path: ../old\npm_adapter: aha\n",
    );
    addToConfig(brain, "backend", path.join(dir, "new-source"));
    const cfg = readFileSync(path.join(brain, "config.yaml"), "utf8");
    expect(cfg).not.toContain("../old");
  });

  it("throws when config.yaml is missing", () => {
    expect(() => addToConfig(dir, "x", "y")).toThrow(/run `product-brain init`/);
  });
});
