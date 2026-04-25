from __future__ import annotations

import json
import re

from ..models import CoverageGap, EdgeCaseBullet, TestCase


_DETECT_PROMPT = """Compare CODE-MINED edges to QA CASE TITLES. Find edges with NO matching case.

Rules:
- Match by meaning, not wording. "rate-limit reset requests" ≈ "Reset endpoint rejects too-frequent requests".
- Skip code edges that ARE covered.
- No invention. Inputs only.
- Every code edge covered → return zero gaps.

Output STRICT JSON only:
{"gaps": [{"edge": "...", "edge_source": "...", "rationale": "no QA case found matching"}]}

CODE EDGES:
%(edges)s

QA TEST CASES:
%(cases)s
"""


def _normalize(text: str) -> set[str]:
    return {t.lower() for t in re.findall(r"[a-zA-Z]{4,}", text)}


def _heuristic_match(edge: EdgeCaseBullet, cases: list[TestCase], threshold: float = 0.45) -> bool:
    edge_toks = _normalize(edge.text)
    if not edge_toks:
        return False
    for c in cases:
        case_toks = _normalize(c.title) | _normalize(c.expected) | _normalize(c.preconditions)
        if not case_toks:
            continue
        if len(edge_toks & case_toks) / max(len(edge_toks | case_toks), 1) >= threshold:
            return True
    return False


def detect_gaps(
    code_edges: list[EdgeCaseBullet],
    test_cases: list[TestCase],
    llm_call=None,
) -> list[CoverageGap]:
    """Two-stage: heuristic prefilter, optional LLM refinement.

    Without LLM: returns heuristic gaps (cheap, false positives possible).
    With LLM: refines via semantic matching for higher precision.
    """
    if not code_edges:
        return []

    candidates = [e for e in code_edges if not _heuristic_match(e, test_cases)]
    if not candidates:
        return []

    if llm_call is None:
        return [
            CoverageGap(edge=e.text, edge_source=e.source,
                        rationale="no QA case title matched (heuristic)")
            for e in candidates
        ]

    edges_payload = [{"text": e.text, "source": e.source} for e in candidates]
    cases_payload = [
        {"id": c.id, "title": c.title, "automation": c.automation}
        for c in test_cases
    ]
    prompt = _DETECT_PROMPT % {
        "edges": json.dumps(edges_payload, indent=2),
        "cases": json.dumps(cases_payload, indent=2),
    }
    try:
        raw = llm_call(prompt)
        data = json.loads(_first_json_object(raw))
    except (ValueError, json.JSONDecodeError, Exception):
        return [
            CoverageGap(edge=e.text, edge_source=e.source,
                        rationale="no QA case title matched (heuristic)")
            for e in candidates
        ]

    out: list[CoverageGap] = []
    for g in data.get("gaps", []):
        if g.get("edge") and g.get("edge_source"):
            out.append(CoverageGap(
                edge=g["edge"],
                edge_source=g["edge_source"],
                rationale=g.get("rationale", "no QA case found"),
            ))
    return out


def _first_json_object(s: str) -> str:
    start = s.find("{")
    if start == -1:
        return "{}"
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return s[start:]
