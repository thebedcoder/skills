import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const editableSchema = z.object({
  bot: z
    .object({
      cooldown_hours: z.number().int().min(0).max(720).optional(),
      opt_in_label: z.string().min(1).max(100).optional(),
      kill_switch_label: z.string().min(1).max(100).optional(),
      draft_status: z.string().min(1).max(100).optional(),
      allowed_users: z.array(z.string().email()).max(100).optional(),
      quiet_hours_utc: z.array(z.number().int().min(0).max(23)).length(2).optional(),
    })
    .optional(),
  estimate: z
    .object({
      min_similarity: z.number().min(0).max(1).optional(),
      min_references_for_medium: z.number().int().min(1).max(20).optional(),
      min_references_for_high: z.number().int().min(1).max(20).optional(),
    })
    .optional(),
  llm: z
    .object({
      model_summarize: z.string().min(1).max(200).optional(),
      model_extract: z.string().min(1).max(200).optional(),
      model_synthesize: z.string().min(1).max(200).optional(),
    })
    .optional(),
});

export type EditablePatch = z.infer<typeof editableSchema>;

export const EDITABLE_FIELDS: Array<{ section: string; field: string; help: string; kind: "text" | "number" | "list" | "hours" }> = [
  { section: "bot", field: "cooldown_hours", help: "min hours between auto-runs on same ticket (0–720)", kind: "number" },
  { section: "bot", field: "opt_in_label", help: "label required for auto-triggers", kind: "text" },
  { section: "bot", field: "kill_switch_label", help: "label that silences the bot on a ticket", kind: "text" },
  { section: "bot", field: "draft_status", help: "Aha workflow status used for bot-created sub-tickets", kind: "text" },
  { section: "bot", field: "allowed_users", help: "comma-separated emails allowed to issue /brain commands", kind: "list" },
  { section: "bot", field: "quiet_hours_utc", help: "[start, end] UTC hours during which auto-posts are suppressed", kind: "hours" },
  { section: "estimate", field: "min_similarity", help: "minimum similarity score for a candidate (0–1)", kind: "number" },
  { section: "estimate", field: "min_references_for_medium", help: "min refs needed for medium confidence", kind: "number" },
  { section: "estimate", field: "min_references_for_high", help: "min refs needed for high confidence", kind: "number" },
  { section: "llm", field: "model_summarize", help: "model for backfill prose generation", kind: "text" },
  { section: "llm", field: "model_extract", help: "model for edge-case extraction (JSON-strict)", kind: "text" },
  { section: "llm", field: "model_synthesize", help: "model for final groom output", kind: "text" },
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function setNested(target: Record<string, unknown>, section: string, field: string, value: unknown): void {
  const existing = target[section];
  const obj = isObject(existing) ? existing : {};
  obj[field] = value;
  target[section] = obj;
}

export function readConfigYaml(configPath: string): { raw: string; parsed: Record<string, unknown> } {
  const raw = readFileSync(configPath, "utf8");
  const parsed = (yaml.load(raw) ?? {}) as Record<string, unknown>;
  return { raw, parsed };
}

export interface ApplyResult {
  ok: boolean;
  errors?: Record<string, string>;
  written?: boolean;
}

export function applyEdits(
  configPath: string,
  formData: Record<string, string | string[]>,
): ApplyResult {
  const patch: Record<string, Record<string, unknown>> = {};
  for (const f of EDITABLE_FIELDS) {
    const key = `${f.section}.${f.field}`;
    if (!(key in formData)) continue;
    const raw = formData[key];
    const strVal = Array.isArray(raw) ? raw[0] : raw;
    if (strVal == null || strVal === "") continue;

    if (f.kind === "number") {
      const n = Number(strVal);
      if (Number.isFinite(n)) setNested(patch, f.section, f.field, n);
    } else if (f.kind === "list") {
      const arr = strVal.split(",").map((s) => s.trim()).filter(Boolean);
      setNested(patch, f.section, f.field, arr);
    } else if (f.kind === "hours") {
      const parts = strVal.split(/[\s,]+/).map((s) => Number(s.trim()));
      if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
        setNested(patch, f.section, f.field, parts);
      }
    } else {
      setNested(patch, f.section, f.field, strVal);
    }
  }

  const validation = editableSchema.safeParse(patch);
  if (!validation.success) {
    const errors: Record<string, string> = {};
    for (const issue of validation.error.issues) {
      errors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, errors };
  }

  const { parsed } = readConfigYaml(configPath);
  for (const [section, fields] of Object.entries(validation.data)) {
    if (!fields) continue;
    const existing = isObject(parsed[section]) ? (parsed[section] as Record<string, unknown>) : {};
    parsed[section] = { ...existing, ...fields };
  }

  writeFileSync(configPath, yaml.dump(parsed, { sortKeys: false }));
  return { ok: true, written: true };
}

export function configExists(configDir: string): boolean {
  const p = path.join(configDir, "config.yaml");
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}
