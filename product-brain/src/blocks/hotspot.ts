import type { TicketRecord } from "../models.js";

export interface Cluster {
  files: string[];
  owners: Array<[string, number]>;
  avgLoc: number;
  avgDurationDays: number;
  keywords: Array<[string, number]>;
  ticketIds: string[];
}

const DAY_MS = 86_400_000;

function recencyWeight(commitDt: Date | undefined, now: Date): number {
  if (!commitDt) return 1.0;
  const ageDays = (now.getTime() - commitDt.getTime()) / DAY_MS;
  if (ageDays <= 30) return 3.0;
  if (ageDays <= 90) return 2.0;
  return 1.0;
}

function dropMegaFiles(weights: Map<string, number>, threshold: number): Map<string, number> {
  if (weights.size === 0 || threshold >= 1.0) return weights;
  const sorted = [...weights.values()].sort((a, b) => b - a);
  const cutoffIdx = Math.floor(sorted.length * (1 - threshold));
  if (cutoffIdx <= 0) return weights;
  const cutoff = sorted[cutoffIdx];
  if (cutoff === undefined) return weights;
  const out = new Map<string, number>();
  for (const [k, v] of weights) {
    if (v <= cutoff) out.set(k, v);
  }
  return out;
}

function increment<K>(m: Map<K, number>, k: K, n = 1): void {
  m.set(k, (m.get(k) ?? 0) + n);
}

function topN<K>(m: Map<K, number>, n: number): Array<[K, number]> {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function clusterHotspots(
  records: TicketRecord[],
  opts: { topK?: number; cooccurThreshold?: number; megaFileThreshold?: number; now?: Date } = {},
): Cluster[] {
  const topK = opts.topK ?? 15;
  const cooccurThreshold = opts.cooccurThreshold ?? 0.4;
  const megaFileThreshold = opts.megaFileThreshold ?? 0.95;
  const now = opts.now ?? new Date();

  if (records.length === 0) return [];

  const weights = new Map<string, number>();
  const fileToTickets = new Map<string, Set<string>>();
  const fileToAuthors = new Map<string, Map<string, number>>();
  const fileLoc = new Map<string, number[]>();
  const fileDurations = new Map<string, number[]>();

  for (const rec of records) {
    const w = recencyWeight(rec.lastCommit, now);
    for (const f of rec.files) {
      increment(weights, f.path, w);
      let t = fileToTickets.get(f.path);
      if (!t) {
        t = new Set();
        fileToTickets.set(f.path, t);
      }
      t.add(rec.ticket);
      let auth = fileToAuthors.get(f.path);
      if (!auth) {
        auth = new Map();
        fileToAuthors.set(f.path, auth);
      }
      for (const a of rec.authors) increment(auth, a);
      let loc = fileLoc.get(f.path);
      if (!loc) {
        loc = [];
        fileLoc.set(f.path, loc);
      }
      loc.push((f.loc_added ?? 0) + (f.loc_removed ?? 0));
      if (rec.durationDays) {
        let d = fileDurations.get(f.path);
        if (!d) {
          d = [];
          fileDurations.set(f.path, d);
        }
        d.push(rec.durationDays);
      }
    }
  }

  const filtered = dropMegaFiles(weights, megaFileThreshold);
  if (filtered.size === 0) return [];
  const topFiles = topN(filtered, topK).map(([f]) => f);
  const topSet = new Set(topFiles);

  const cooccur = new Map<string, number>();
  const cooccurKey = (a: string, b: string): string => `${a}\x00${b}`;
  for (const rec of records) {
    const paths = [...new Set(rec.files.map((f) => f.path))]
      .filter((p) => topSet.has(p))
      .sort();
    for (let i = 0; i < paths.length; i++) {
      const a = paths[i];
      if (!a) continue;
      for (let j = i + 1; j < paths.length; j++) {
        const b = paths[j];
        if (!b) continue;
        increment(cooccur, cooccurKey(a, b));
        increment(cooccur, cooccurKey(b, a));
      }
    }
  }

  const clusters: Cluster[] = [];
  const used = new Set<string>();

  for (const seed of topFiles) {
    if (used.has(seed)) continue;
    const clusterFiles = [seed];
    used.add(seed);
    const seedCount = Math.max(fileToTickets.get(seed)?.size ?? 0, 1);
    for (const f of topFiles) {
      if (used.has(f)) continue;
      const co = cooccur.get(cooccurKey(seed, f)) ?? 0;
      if (co / seedCount >= cooccurThreshold) {
        clusterFiles.push(f);
        used.add(f);
      }
    }
    const ownersCounter = new Map<string, number>();
    const locSamples: number[] = [];
    const durationSamples: number[] = [];
    const ticketIds = new Set<string>();
    for (const f of clusterFiles) {
      const auth = fileToAuthors.get(f);
      if (auth) {
        for (const [k, v] of auth) increment(ownersCounter, k, v);
      }
      locSamples.push(...(fileLoc.get(f) ?? []));
      durationSamples.push(...(fileDurations.get(f) ?? []));
      const t = fileToTickets.get(f);
      if (t) for (const id of t) ticketIds.add(id);
    }
    const avgLoc = locSamples.length
      ? locSamples.reduce((a, b) => a + b, 0) / locSamples.length
      : 0;
    const avgDurationDays = durationSamples.length
      ? durationSamples.reduce((a, b) => a + b, 0) / durationSamples.length
      : 0;
    clusters.push({
      files: clusterFiles,
      owners: topN(ownersCounter, 5),
      avgLoc,
      avgDurationDays,
      keywords: [],
      ticketIds: [...ticketIds].sort(),
    });
  }

  return clusters;
}
