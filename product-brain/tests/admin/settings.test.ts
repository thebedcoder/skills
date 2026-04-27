import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import yaml from "js-yaml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyEdits, EDITABLE_FIELDS, readConfigYaml } from "../../src/admin/settings.js";

let dir: string;
let configPath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "pb-admin-set-"));
  configPath = path.join(dir, "config.yaml");
  writeFileSync(
    configPath,
    yaml.dump({
      repos: [{ name: "backend", path: "../backend" }],
      pm_adapter: "aha",
      bot: {
        cooldown_hours: 24,
        opt_in_label: "brain:on",
        kill_switch_label: "brain:off",
        draft_status: "Bot-draft",
        allowed_users: ["alice@example.com"],
        quiet_hours_utc: [22, 7],
      },
      estimate: {
        min_similarity: 0.4,
        min_references_for_medium: 4,
        min_references_for_high: 6,
      },
      llm: {
        provider: "anthropic",
        model_summarize: "claude-haiku-4-5-20251001",
        model_extract: "claude-haiku-4-5-20251001",
        model_synthesize: "claude-sonnet-4-6",
      },
    }),
  );
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function readBack(): Record<string, unknown> {
  return yaml.load(readFileSync(configPath, "utf8")) as Record<string, unknown>;
}

describe("applyEdits", () => {
  it("EDITABLE_FIELDS lists only safe sections", () => {
    const sections = new Set(EDITABLE_FIELDS.map((f) => f.section));
    expect(sections).toEqual(new Set(["bot", "estimate", "llm"]));
  });

  it("updates a numeric field via the bot section", () => {
    const r = applyEdits(configPath, { "bot.cooldown_hours": "48" });
    expect(r.ok).toBe(true);
    const cfg = readBack();
    expect((cfg["bot"] as Record<string, unknown>)["cooldown_hours"]).toBe(48);
  });

  it("updates a list field, splitting on commas and trimming", () => {
    const r = applyEdits(configPath, { "bot.allowed_users": "alice@x.com, bob@y.com,carol@z.com" });
    expect(r.ok).toBe(true);
    const cfg = readBack();
    expect((cfg["bot"] as Record<string, unknown>)["allowed_users"]).toEqual([
      "alice@x.com",
      "bob@y.com",
      "carol@z.com",
    ]);
  });

  it("updates the quiet_hours_utc pair", () => {
    const r = applyEdits(configPath, { "bot.quiet_hours_utc": "23, 6" });
    expect(r.ok).toBe(true);
    expect((readBack()["bot"] as Record<string, unknown>)["quiet_hours_utc"]).toEqual([23, 6]);
  });

  it("rejects out-of-range values via zod", () => {
    const r = applyEdits(configPath, { "bot.cooldown_hours": "9999" });
    expect(r.ok).toBe(false);
    expect(r.errors).toBeDefined();
    expect(Object.keys(r.errors!)[0]).toMatch(/cooldown/);
  });

  it("rejects invalid emails in allowed_users", () => {
    const r = applyEdits(configPath, { "bot.allowed_users": "alice, not-an-email" });
    expect(r.ok).toBe(false);
    expect(r.errors).toBeDefined();
  });

  it("rejects out-of-range similarity threshold", () => {
    const r = applyEdits(configPath, { "estimate.min_similarity": "1.5" });
    expect(r.ok).toBe(false);
  });

  it("ignores empty form fields (preserves current value)", () => {
    const before = (readBack()["bot"] as Record<string, unknown>)["draft_status"];
    const r = applyEdits(configPath, { "bot.draft_status": "" });
    expect(r.ok).toBe(true);
    const after = (readBack()["bot"] as Record<string, unknown>)["draft_status"];
    expect(after).toBe(before);
  });

  it("ignores fields that are not in the editable whitelist", () => {
    const r = applyEdits(configPath, {
      "bot.cooldown_hours": "12",
      "secret.api_key_env": "TRY_TO_OVERWRITE",
      "repos.0.path": "../malicious",
    });
    expect(r.ok).toBe(true);
    const cfg = readBack();
    expect((cfg["bot"] as Record<string, unknown>)["cooldown_hours"]).toBe(12);
    expect(cfg["secret"]).toBeUndefined();
    expect(cfg["repos"]).toEqual([{ name: "backend", path: "../backend" }]);
  });

  it("preserves untouched fields when patching one", () => {
    applyEdits(configPath, { "llm.model_summarize": "claude-new-model" });
    const cfg = readBack();
    const llm = cfg["llm"] as Record<string, unknown>;
    expect(llm["model_summarize"]).toBe("claude-new-model");
    expect(llm["provider"]).toBe("anthropic");                 // untouched
    expect(llm["model_synthesize"]).toBe("claude-sonnet-4-6");  // untouched
  });
});

describe("readConfigYaml", () => {
  it("returns parsed object plus raw string", () => {
    const { raw, parsed } = readConfigYaml(configPath);
    expect(typeof raw).toBe("string");
    expect((parsed["bot"] as Record<string, unknown>)["cooldown_hours"]).toBe(24);
  });
});
