import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateSource } from "../src/migrate.js";

let brain: string;
let source: string;

beforeEach(() => {
  brain = mkdtempSync(path.join(tmpdir(), "pb-mig-brain-"));
  source = mkdtempSync(path.join(tmpdir(), "pb-mig-src-"));
});
afterEach(() => {
  rmSync(brain, { recursive: true, force: true });
  rmSync(source, { recursive: true, force: true });
});

describe("migrateSource", () => {
  it("returns 0 copied when no .product-brain/ exists", () => {
    const r = migrateSource(brain, source, "backend");
    expect(r.copied).toBe(0);
    expect(r.reason).toContain("no .product-brain");
  });

  it("copies manifest and ticket records", () => {
    const legacy = path.join(source, ".product-brain");
    mkdirSync(path.join(legacy, "tickets"), { recursive: true });
    writeFileSync(path.join(legacy, "manifest.md"), "---\nrepo: backend\n---\n\nbody");
    writeFileSync(path.join(legacy, "tickets", "AHA-1.md"), "---\nticket: AHA-1\n---\n");
    writeFileSync(path.join(legacy, "tickets", "AHA-2.md"), "---\nticket: AHA-2\n---\n");

    const r = migrateSource(brain, source, "backend");
    expect(r.copied).toBe(3);
    expect(existsSync(path.join(brain, "repos", "backend", "manifest.md"))).toBe(true);
    expect(existsSync(path.join(brain, "repos", "backend", "tickets", "AHA-1.md"))).toBe(true);
    expect(existsSync(path.join(brain, "repos", "backend", "tickets", "AHA-2.md"))).toBe(true);
  });

  it("preserves file content during copy", () => {
    const legacy = path.join(source, ".product-brain");
    mkdirSync(legacy, { recursive: true });
    const expected = "---\nrepo: backend\n---\n\nspecific content\n";
    writeFileSync(path.join(legacy, "manifest.md"), expected);

    migrateSource(brain, source, "backend");
    const got = readFileSync(path.join(brain, "repos", "backend", "manifest.md"), "utf8");
    expect(got).toBe(expected);
  });

  it("removes legacy directory when removeFromSource=true", () => {
    const legacy = path.join(source, ".product-brain");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(path.join(legacy, "manifest.md"), "x");

    const r = migrateSource(brain, source, "backend", true);
    expect(r.removed_from_source).toBe(true);
    expect(existsSync(legacy)).toBe(false);
  });

  it("leaves legacy in place by default", () => {
    const legacy = path.join(source, ".product-brain");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(path.join(legacy, "manifest.md"), "x");

    migrateSource(brain, source, "backend");
    expect(existsSync(legacy)).toBe(true);
  });
});
