import { describe, expect, it } from "vitest";
import { renderGroom } from "../../src/blocks/render.js";

describe("renderGroom", () => {
  const baseOpts = {
    ticketId: "AHA-1500",
    title: "Add password reset",
    scopeByRepo: { backend: ["api/auth", "services/email"] },
    estimate: {
      low: 4,
      high: 6,
      unit: "days",
      confidence: "medium" as const,
      references: [
        { ticket: "AHA-1100", title: "2FA", days: 5, loc: 800, files: 14, similarity: 0.72 },
      ],
    },
    edgeGroups: [{ text: "rate limit", frequency: "3/5 records", tickets: ["AHA-1", "AHA-2", "AHA-3"] }],
    risks: [],
    reviewers: [],
    drafts: [],
  };

  it("renders the basic groom shape", () => {
    const out = renderGroom(baseOpts);
    expect(out).toContain("# AHA-1500 — Add password reset");
    expect(out).toContain("## Scope by repo");
    expect(out).toContain("**backend**");
    expect(out).toContain("- api/auth");
    expect(out).toContain("## Estimate: 4–6 days  (medium confidence)");
    expect(out).toContain("AHA-1100 (2FA)");
    expect(out).toContain("similarity 0.72");
    expect(out).toContain("## Edge cases (from 3 citations across related tickets)");
  });

  it("emits 'unavailable' estimate when no references", () => {
    const out = renderGroom({ ...baseOpts, estimate: { ...baseOpts.estimate, references: [] } });
    expect(out).toContain("## Estimate: unavailable");
  });

  it("emits placeholder when no edge groups", () => {
    const out = renderGroom({ ...baseOpts, edgeGroups: [] });
    expect(out).toContain("_(no validated bullets)_");
  });

  it("includes QA / stability / coverage sections only when populated", () => {
    const withQA = renderGroom({
      ...baseOpts,
      qaEdgeGroups: [{ text: "TOTP trim", frequency: "1/1", tickets: ["AHA-1"] }],
      stabilitySignals: ["TR-C-1: 5 fails"],
      coverageGaps: [{ edge: "ratelimit", edgeSource: "pr#1", rationale: "no QA case" }],
    });
    expect(withQA).toContain("## QA-verified edges");
    expect(withQA).toContain("## Stability signals");
    expect(withQA).toContain("## Coverage gaps");

    const without = renderGroom(baseOpts);
    expect(without).not.toContain("## QA-verified edges");
    expect(without).not.toContain("## Stability signals");
    expect(without).not.toContain("## Coverage gaps");
  });

  it("marks plan mode in output", () => {
    const out = renderGroom({ ...baseOpts, mode: "plan" });
    expect(out).toContain("**Pre-ticket plan**");
  });

  it("renders change_note when provided", () => {
    const out = renderGroom({ ...baseOpts, changeNote: "Inputs changed since last run." });
    expect(out).toContain("_Inputs changed since last run._");
  });
});
