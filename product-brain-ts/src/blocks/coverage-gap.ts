// Port target: ../product-brain/src/product_brain/blocks/coverage_gap.py
import type { CoverageGap, EdgeCaseBullet, TestCase } from "../models.js";
import type { LLMCall } from "./edge-mine.js";

const DETECT_PROMPT = `Compare CODE-MINED edges to QA CASE TITLES. Find edges with NO matching case.

Rules:
- Match by meaning, not wording. "rate-limit reset requests" ≈ "Reset endpoint rejects too-frequent requests".
- Skip code edges that ARE covered.
- No invention. Inputs only.
- Every code edge covered → return zero gaps.

Output STRICT JSON only:
{"gaps": [{"edge": "...", "edge_source": "...", "rationale": "no QA case found matching"}]}

CODE EDGES:
%EDGES%

QA TEST CASES:
%CASES%
`;

function normalize(text: string): Set<string> {
  return new Set((text.match(/[a-zA-Z]{4,}/g) ?? []).map((t) => t.toLowerCase()));
}

function heuristicMatch(edge: EdgeCaseBullet, cases: TestCase[], threshold = 0.45): boolean {
  const edgeToks = normalize(edge.text);
  if (edgeToks.size === 0) return false;
  for (const c of cases) {
    const caseToks = new Set([...normalize(c.title), ...normalize(c.expected), ...normalize(c.preconditions)]);
    if (caseToks.size === 0) continue;
    let inter = 0;
    for (const t of edgeToks) if (caseToks.has(t)) inter += 1;
    const union = edgeToks.size + caseToks.size - inter;
    if (inter / Math.max(union, 1) >= threshold) return true;
  }
  return false;
}

function firstJsonObject(s: string): string {
  const start = s.indexOf("{");
  if (start === -1) return "{}";
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth += 1;
    else if (s[i] === "}") {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

export async function detectGaps(
  codeEdges: EdgeCaseBullet[],
  testCases: TestCase[],
  llmCall?: LLMCall,
): Promise<CoverageGap[]> {
  if (codeEdges.length === 0) return [];
  const candidates = codeEdges.filter((e) => !heuristicMatch(e, testCases));
  if (candidates.length === 0) return [];

  const heuristicGaps: CoverageGap[] = candidates.map((e) => ({
    edge: e.text,
    edgeSource: e.source,
    rationale: "no QA case title matched (heuristic)",
  }));

  if (!llmCall) return heuristicGaps;

  const prompt = DETECT_PROMPT.replace(
    "%EDGES%",
    JSON.stringify(candidates.map((e) => ({ text: e.text, source: e.source })), null, 2),
  ).replace(
    "%CASES%",
    JSON.stringify(testCases.map((c) => ({ id: c.id, title: c.title, automation: c.automation })), null, 2),
  );
  try {
    const raw = await llmCall(prompt);
    const data = JSON.parse(firstJsonObject(raw)) as { gaps?: Array<Record<string, unknown>> };
    const out: CoverageGap[] = [];
    for (const g of data.gaps ?? []) {
      if (g["edge"] && g["edge_source"]) {
        out.push({
          edge: String(g["edge"]),
          edgeSource: String(g["edge_source"]),
          rationale: String(g["rationale"] ?? "no QA case found"),
        });
      }
    }
    return out;
  } catch {
    return heuristicGaps;
  }
}
