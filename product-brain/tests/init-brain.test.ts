import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initBrainRepo } from "../src/init-brain.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-init-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("initBrainRepo", () => {
  it("creates the brain repo skeleton", () => {
    const target = path.join(dir, "brain");
    const result = initBrainRepo(target);
    expect(result.brain_path).toBe(target);
    expect(existsSync(path.join(target, "config.yaml"))).toBe(true);
    expect(existsSync(path.join(target, "repos"))).toBe(true);
    expect(existsSync(path.join(target, ".gitignore"))).toBe(true);
    expect(existsSync(path.join(target, "README.md"))).toBe(true);
  });

  it("git-inits the directory when git is available", () => {
    const target = path.join(dir, "brain");
    initBrainRepo(target);
    if (existsSync(path.join(target, ".git"))) {
      const out = execFileSync("git", ["-C", target, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
      expect(path.resolve(out)).toBe(path.resolve(target));
    }
  });

  it("refuses to overwrite existing config without --force", () => {
    const target = path.join(dir, "brain");
    initBrainRepo(target);
    expect(() => initBrainRepo(target)).toThrow(/already exists/);
  });

  it("overwrites with --force", () => {
    const target = path.join(dir, "brain");
    initBrainRepo(target);
    expect(() => initBrainRepo(target, true)).not.toThrow();
  });

  it("writes a config that mentions repos:", () => {
    const target = path.join(dir, "brain");
    initBrainRepo(target);
    const cfg = readFileSync(path.join(target, "config.yaml"), "utf8");
    expect(cfg).toMatch(/repos:/);
    expect(cfg).toMatch(/pm_adapter/);
  });
});
