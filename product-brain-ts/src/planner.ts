// Port target: ../product-brain/src/product_brain/planner.py
//
// Composes building blocks for a single command. Used by both bot worker
// and CLI. Slash commands inside Claude Code read the markdown command
// bodies and may compose differently.
import { getPmAdapter } from "./adapters/index.js";
import { dedupEdgeCases } from "./blocks/edge-mine.js";
import { estimateEffort } from "./blocks/estimate.js";
import { renderGroom, type ScopeMap } from "./blocks/render.js";
import type { Config } from "./config.js";
import type { TicketRecord } from "./models.js";
import { readRecords } from "./records/read.js";

function scopeByRepo(recordsByRepo: Map<string, Record<string, TicketRecord>>): ScopeMap {
  const out: ScopeMap = {};
  for (const [repo, recs] of recordsByRepo) {
    if (Object.keys(recs).length === 0) continue;
    const dirs = new Map<string, number>();
    for (const r of Object.values(recs)) {
      for (const f of r.files) {
        const top = f.path.split("/")[0] ?? "";
        dirs.set(top, (dirs.get(top) ?? 0) + 1);
      }
    }
    out[repo] = [...dirs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d]) => d);
  }
  return out;
}

function suggestedReviewers(records: TicketRecord[]): Array<{ handle: string; area: string; commits: number }> {
  const counts = new Map<string, number>();
  for (const r of records) {
    for (const a of r.authors) counts.set(a, (counts.get(a) ?? 0) + r.shas.length);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([handle, commits]) => ({ handle, area: "auth", commits }));
}

function draftsFromScope(scope: ScopeMap, ticketTitle: string): Array<{ repo: string; summary: string }> {
  const out: Array<{ repo: string; summary: string }> = [];
  for (const [repo, areas] of Object.entries(scope)) {
    if (areas.length === 0) continue;
    out.push({
      repo,
      summary: `${ticketTitle} — areas: ${areas.slice(0, 3).join(", ")}`,
    });
  }
  return out;
}

export interface RunCommandResult {
  body: string;
  summary: string;
  model: string;
  cost: number;
}

export async function runCommand(
  config: Config,
  command: string,
  ticketId: string,
  _args = "",
): Promise<RunCommandResult> {
  const adapter = getPmAdapter(config.pmAdapter, config);
  const ticket = await adapter.fetchTicket(ticketId);

  const siblings = await adapter.listSiblings(ticketId, 30);
  const relatedIds = [...siblings.map((t) => t.id), ticketId];

  const recordsByRepo = new Map<string, Record<string, TicketRecord>>();
  for (const repoCfg of config.repos) {
    recordsByRepo.set(repoCfg.name, readRecords(config.brainRoot, repoCfg.name, relatedIds));
  }

  const flat: TicketRecord[] = [];
  const targetFiles = new Set<string>();
  for (const recs of recordsByRepo.values()) {
    for (const r of Object.values(recs)) flat.push(r);
    const targetRec = recs[ticketId];
    if (targetRec) {
      for (const f of targetRec.files) targetFiles.add(f.path);
    }
  }

  const candidates = flat.filter((r) => r.ticket !== ticketId);
  const estimate = estimateEffort(ticket, candidates, config.estimate, { targetFiles });
  const edgeGroups = dedupEdgeCases(flat);

  const qaProxy: TicketRecord[] = flat
    .filter((r) => r.qaEdges.length)
    .map((r) => ({ ...r, edgeCasesHandled: r.qaEdges }));
  const qaGroups = qaProxy.length ? dedupEdgeCases(qaProxy) : [];

  const aggregatedStability: string[] = [];
  for (const r of flat) {
    for (const s of r.stabilitySignals) aggregatedStability.push(`${r.ticket}: ${s}`);
  }
  const stabilityCapped = aggregatedStability.slice(0, 8);

  const aggregatedGaps: Array<{ edge: string; edgeSource: string; rationale?: string }> = [];
  for (const r of flat) {
    for (const g of r.coverageGaps) {
      aggregatedGaps.push({
        edge: g.edge,
        edgeSource: `${g.edgeSource} (from ${r.ticket})`,
        rationale: g.rationale,
      });
    }
  }
  const gapsCapped = aggregatedGaps.slice(0, 8);

  const risks: Array<{ area: string; evidence: string }> = [];
  for (const r of flat) {
    if (r.durationDays > 14) {
      risks.push({
        area: r.files.slice(0, 2).map((p) => p.path).join(", "),
        evidence: `${r.ticket} took ${Math.round(r.durationDays)}d`,
      });
    }
  }
  const risksCapped = risks.slice(0, 5);

  const scope = scopeByRepo(recordsByRepo);
  const reviewers = suggestedReviewers(flat);
  const drafts = draftsFromScope(scope, ticket.title);

  let body: string;
  if (command === "edges") {
    const sections: string[] = [];
    sections.push(
      edgeGroups.length
        ? "## Edge cases\n\n" + edgeGroups.map((g) => `- ${g.text}     [${g.frequency}: ${g.tickets.join(", ")}]`).join("\n")
        : "## Edge cases\n_(no validated bullets)_",
    );
    if (qaGroups.length) {
      sections.push(
        "## QA-verified edges\n\n" +
          qaGroups.map((g) => `- ${g.text}     [${g.frequency}: ${g.tickets.join(", ")}]`).join("\n"),
      );
    }
    if (stabilityCapped.length) {
      sections.push("## Stability signals\n\n" + stabilityCapped.map((s) => `- ${s}`).join("\n"));
    }
    if (gapsCapped.length) {
      sections.push(
        "## Coverage gaps\n\n" + gapsCapped.map((g) => `- ${g.edge}\n  source: ${g.edgeSource}`).join("\n"),
      );
    }
    body = sections.join("\n\n");
  } else if (command === "estimate") {
    if (estimate.references.length) {
      body =
        `## Estimate: ${estimate.low}–${estimate.high} ${estimate.unit} (${estimate.confidence} confidence)\n\nReferences:\n` +
        estimate.references
          .map(
            (r) => `- ${r.ticket} (${r.title}): ${r.days.toFixed(1)}d, ${r.loc} LOC, ${r.files} files     similarity ${r.similarity}`,
          )
          .join("\n");
    } else {
      body = "## Estimate: unavailable (no comparable references)";
    }
  } else if (command === "related") {
    body =
      "## Related tickets\n\n" +
      candidates
        .slice(0, 10)
        .map(
          (r) => `- ${r.ticket} (${r.title}): ${r.locAdded + r.locRemoved} LOC, ${r.durationDays.toFixed(1)}d`,
        )
        .join("\n");
  } else {
    body = renderGroom({
      ticketId,
      title: ticket.title,
      scopeByRepo: scope,
      estimate,
      edgeGroups,
      risks: risksCapped,
      reviewers,
      drafts,
      mode: "groom",
      qaEdgeGroups: qaGroups,
      stabilitySignals: stabilityCapped,
      coverageGaps: gapsCapped,
    });
  }

  const summary =
    `${command} on ${ticketId}: ${candidates.length} refs, ${edgeGroups.length} edge groups, ` +
    `${qaGroups.length} QA groups, ${stabilityCapped.length} stability flags, ${gapsCapped.length} gaps, ` +
    `est=${estimate.low}-${estimate.high}${estimate.unit}`;
  return { body, summary, model: config.llm.model_synthesize, cost: 0 };
}
