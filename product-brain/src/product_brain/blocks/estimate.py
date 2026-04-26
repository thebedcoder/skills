from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from ..config import EstimateConfig
from ..models import Ticket, TicketRecord


@dataclass
class Reference:
    ticket: str
    title: str
    days: float
    loc: int
    files: int
    similarity: float


@dataclass
class Estimate:
    low: float
    high: float
    unit: str
    confidence: str
    references: list[Reference]


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    return len(a & b) / max(len(a | b), 1)


def _ticket_files(rec: TicketRecord) -> set[str]:
    return {f.path for f in rec.files}


def similarity(
    target_files: set[str],
    target_symbols: set[str],
    target_labels: set[str],
    target_type: str,
    candidate: TicketRecord,
    candidate_labels: Optional[set[str]] = None,
) -> float:
    f = _jaccard(target_files, _ticket_files(candidate))
    s = _jaccard(target_symbols, set(candidate.symbols))
    label_score = _jaccard(target_labels, candidate_labels or set())
    type_score = 1.0 if target_type and target_type == candidate.type else 0.0
    return 0.55 * f + 0.20 * s + 0.15 * label_score + 0.10 * type_score


def estimate_effort(
    target: Ticket,
    candidates: list[TicketRecord],
    cfg: EstimateConfig,
    target_files: Optional[set[str]] = None,
    target_symbols: Optional[set[str]] = None,
    candidate_labels: Optional[dict[str, set[str]]] = None,
) -> Estimate:
    target_files = target_files or set()
    target_symbols = target_symbols or set()
    target_labels = set(target.labels)
    candidate_labels = candidate_labels or {}

    scored: list[tuple[float, TicketRecord]] = []
    for c in candidates:
        sim = similarity(
            target_files, target_symbols, target_labels, target.type,
            c, candidate_labels.get(c.ticket, set()),
        )
        if sim >= cfg.min_similarity:
            scored.append((sim, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:5]

    refs = [
        Reference(
            ticket=c.ticket,
            title=c.title,
            days=(c.pr_open_to_merge_days if c.pr_open_to_merge_days is not None else c.duration_days),
            loc=c.loc_added + c.loc_removed,
            files=len(c.files),
            similarity=round(sim, 2),
        )
        for sim, c in top
    ]

    if not refs:
        return Estimate(low=0, high=0, unit=cfg.unit, confidence="low", references=[])

    weights = [r.similarity for r in refs]
    weighted_days = sum(r.days * w for r, w in zip(refs, weights)) / max(sum(weights), 1e-9)
    if len(refs) >= 2:
        mean = sum(r.days for r in refs) / len(refs)
        var = sum((r.days - mean) ** 2 for r in refs) / len(refs)
        sigma = math.sqrt(var)
    else:
        sigma = max(weighted_days * 0.3, 1.0)

    low = max(weighted_days - sigma, 0.5)
    high = weighted_days + sigma

    high_sim_count = sum(1 for r in refs if r.similarity >= 0.6)
    med_sim_count = sum(1 for r in refs if r.similarity >= 0.5)

    if high_sim_count >= cfg.min_references_for_high:
        confidence = "high"
    elif med_sim_count >= cfg.min_references_for_medium:
        confidence = "medium"
    else:
        confidence = "low"

    return Estimate(
        low=round(low, 1),
        high=round(high, 1),
        unit=cfg.unit,
        confidence=confidence,
        references=refs,
    )
