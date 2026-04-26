// Port target: ../product-brain/src/product_brain/blocks/estimate.py
import type { EstimateConfig } from "../config.js";
import type { Ticket, TicketRecord } from "../models.js";

export interface Reference {
  ticket: string;
  title: string;
  days: number;
  loc: number;
  files: number;
  similarity: number;
}

export interface Estimate {
  low: number;
  high: number;
  unit: string;
  confidence: "low" | "medium" | "high";
  references: Reference[];
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return inter / Math.max(union, 1);
}

function ticketFiles(rec: TicketRecord): Set<string> {
  return new Set(rec.files.map((f) => f.path));
}

export function similarity(
  targetFiles: Set<string>,
  targetSymbols: Set<string>,
  targetLabels: Set<string>,
  targetType: string,
  candidate: TicketRecord,
  candidateLabels?: Set<string>,
): number {
  const f = jaccard(targetFiles, ticketFiles(candidate));
  const s = jaccard(targetSymbols, new Set(candidate.symbols));
  const l = jaccard(targetLabels, candidateLabels ?? new Set());
  const t = targetType && targetType === candidate.type ? 1 : 0;
  return 0.55 * f + 0.2 * s + 0.15 * l + 0.1 * t;
}

export function estimateEffort(
  target: Ticket,
  candidates: TicketRecord[],
  cfg: EstimateConfig,
  opts: {
    targetFiles?: Set<string>;
    targetSymbols?: Set<string>;
    candidateLabels?: Map<string, Set<string>>;
  } = {},
): Estimate {
  const targetFiles = opts.targetFiles ?? new Set<string>();
  const targetSymbols = opts.targetSymbols ?? new Set<string>();
  const targetLabels = new Set(target.labels);
  const candidateLabels = opts.candidateLabels ?? new Map();

  const scored: Array<[number, TicketRecord]> = [];
  for (const c of candidates) {
    const sim = similarity(
      targetFiles,
      targetSymbols,
      targetLabels,
      target.type,
      c,
      candidateLabels.get(c.ticket),
    );
    if (sim >= cfg.min_similarity) scored.push([sim, c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const top = scored.slice(0, 5);

  const refs: Reference[] = top.map(([sim, c]) => ({
    ticket: c.ticket,
    title: c.title,
    days: c.prOpenToMergeDays ?? c.durationDays,
    loc: c.locAdded + c.locRemoved,
    files: c.files.length,
    similarity: Math.round(sim * 100) / 100,
  }));

  if (refs.length === 0) {
    return { low: 0, high: 0, unit: cfg.unit, confidence: "low", references: [] };
  }

  const weights = refs.map((r) => r.similarity);
  const wsum = Math.max(weights.reduce((a, b) => a + b, 0), 1e-9);
  const weightedDays = refs.reduce((a, r, i) => a + r.days * (weights[i] ?? 0), 0) / wsum;

  let sigma: number;
  if (refs.length >= 2) {
    const mean = refs.reduce((a, r) => a + r.days, 0) / refs.length;
    const variance = refs.reduce((a, r) => a + (r.days - mean) ** 2, 0) / refs.length;
    sigma = Math.sqrt(variance);
  } else {
    sigma = Math.max(weightedDays * 0.3, 1);
  }

  const low = Math.max(weightedDays - sigma, 0.5);
  const high = weightedDays + sigma;

  const highSim = refs.filter((r) => r.similarity >= 0.6).length;
  const medSim = refs.filter((r) => r.similarity >= 0.5).length;
  let confidence: "low" | "medium" | "high" = "low";
  if (highSim >= cfg.min_references_for_high) confidence = "high";
  else if (medSim >= cfg.min_references_for_medium) confidence = "medium";

  return {
    low: Math.round(low * 10) / 10,
    high: Math.round(high * 10) / 10,
    unit: cfg.unit,
    confidence,
    references: refs,
  };
}
