// Port target: ../product-brain/src/product_brain/blocks/render.py
import type { Estimate } from "./estimate.js";

export interface ScopeMap {
  [repo: string]: string[];
}

export interface RenderOpts {
  ticketId: string;
  title: string;
  scopeByRepo: ScopeMap;
  estimate: Estimate;
  edgeGroups: Array<{ text: string; frequency: string; tickets: string[] }>;
  risks: Array<{ area: string; evidence: string }>;
  reviewers: Array<{ handle: string; area: string; commits: number }>;
  drafts: Array<{ repo: string; summary: string }>;
  mode?: "groom" | "plan";
  changeNote?: string;
  qaEdgeGroups?: Array<{ text: string; frequency: string; tickets: string[] }>;
  stabilitySignals?: string[];
  coverageGaps?: Array<{ edge: string; edgeSource: string; rationale?: string }>;
}

export function renderGroom(opts: RenderOpts): string {
  const lines: string[] = [];
  lines.push(`# ${opts.ticketId} — ${opts.title}`);
  if (opts.mode === "plan") {
    lines.push("\n**Pre-ticket plan** — scope is predicted, refine after creating the ticket.");
  }
  if (opts.changeNote) lines.push(`\n_${opts.changeNote}_`);

  lines.push("\n## Scope by repo\n");
  for (const [repo, areas] of Object.entries(opts.scopeByRepo)) {
    lines.push(`**${repo}**`);
    if (areas.length) {
      for (const a of areas) lines.push(`- ${a}`);
    } else {
      lines.push("- _(no scope predicted)_");
    }
    lines.push("");
  }

  if (opts.estimate.references.length) {
    lines.push(
      `## Estimate: ${opts.estimate.low}–${opts.estimate.high} ${opts.estimate.unit}  (${opts.estimate.confidence} confidence)\n`,
    );
    lines.push("References:");
    for (const r of opts.estimate.references) {
      lines.push(
        `- ${r.ticket} (${r.title}): ${r.days.toFixed(1)}d, ${r.loc} LOC, ${r.files} files     similarity ${r.similarity}`,
      );
    }
    lines.push("");
  } else {
    lines.push("## Estimate: unavailable (no comparable references)\n");
  }

  if (opts.edgeGroups.length) {
    const total = opts.edgeGroups.reduce((a, g) => a + g.tickets.length, 0);
    lines.push(`## Edge cases (from ${total} citations across related tickets)\n`);
    for (const g of opts.edgeGroups) {
      lines.push(`- ${g.text}     [${g.frequency}: ${g.tickets.join(", ")}]`);
    }
    lines.push("");
  } else {
    lines.push("## Edge cases\n_(no validated bullets)_\n");
  }

  if (opts.qaEdgeGroups?.length) {
    lines.push("## QA-verified edges (from related tickets' test suites)\n");
    for (const g of opts.qaEdgeGroups) {
      lines.push(`- ${g.text}     [${g.frequency}: ${g.tickets.join(", ")}]`);
    }
    lines.push("");
  }

  if (opts.stabilitySignals?.length) {
    lines.push("## Stability signals (from test run history)\n");
    for (const s of opts.stabilitySignals) lines.push(`- ${s}`);
    lines.push("");
  }

  if (opts.coverageGaps?.length) {
    lines.push("## Coverage gaps (handled in code, not in QA suite)\n");
    for (const g of opts.coverageGaps) {
      lines.push(`- ${g.edge}`);
      lines.push(`  source: ${g.edgeSource}`);
      if (g.rationale) lines.push(`  rationale: ${g.rationale}`);
    }
    lines.push("");
  }

  if (opts.risks.length) {
    lines.push("## Risks\n");
    for (const r of opts.risks) lines.push(`- ${r.area}: ${r.evidence}`);
    lines.push("");
  }

  if (opts.reviewers.length) {
    lines.push("## Suggested reviewers\n");
    for (const r of opts.reviewers) lines.push(`- ${r.handle} (${r.area}, ${r.commits} commits in scope)`);
    lines.push("");
  }

  if (opts.drafts.length) {
    lines.push("## Draft sub-tickets\n");
    for (const d of opts.drafts) lines.push(`- [ ] ${d.repo}: ${d.summary}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
