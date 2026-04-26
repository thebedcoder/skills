from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

from ..models import TicketRecord


@dataclass
class Cluster:
    files: list[str]
    owners: list[tuple[str, int]]
    avg_loc: float
    avg_duration_days: float
    keywords: list[tuple[str, int]] = field(default_factory=list)
    ticket_ids: list[str] = field(default_factory=list)


def _recency_weight(commit_dt: Optional[datetime], now: datetime) -> float:
    if commit_dt is None:
        return 1.0
    if commit_dt.tzinfo is None:
        commit_dt = commit_dt.replace(tzinfo=timezone.utc)
    age = now - commit_dt
    if age <= timedelta(days=30):
        return 3.0
    if age <= timedelta(days=90):
        return 2.0
    return 1.0


def _drop_mega_files(file_counts: Counter, threshold: float) -> Counter:
    if not file_counts or threshold >= 1.0:
        return file_counts
    sorted_counts = sorted(file_counts.values(), reverse=True)
    cutoff_idx = int(len(sorted_counts) * (1 - threshold))
    if cutoff_idx <= 0:
        return file_counts
    cutoff_value = sorted_counts[cutoff_idx]
    return Counter({f: c for f, c in file_counts.items() if c <= cutoff_value})


def cluster_hotspots(
    records: list[TicketRecord],
    top_k: int = 15,
    cooccur_threshold: float = 0.4,
    mega_file_threshold: float = 0.95,
    now: Optional[datetime] = None,
) -> list[Cluster]:
    """Greedy file clustering by frequency + co-change.

    Mostly deterministic. The LLM-theming step is separate (see render).
    """
    if not records:
        return []
    now = now or datetime.now(timezone.utc)

    file_weights: Counter = Counter()
    file_to_tickets: dict[str, set[str]] = defaultdict(set)
    file_to_authors: dict[str, Counter] = defaultdict(Counter)
    file_loc: dict[str, list[int]] = defaultdict(list)
    file_durations: dict[str, list[float]] = defaultdict(list)

    for rec in records:
        w = _recency_weight(rec.last_commit, now)
        for f in rec.files:
            file_weights[f.path] += w
            file_to_tickets[f.path].add(rec.ticket)
            for a in rec.authors:
                file_to_authors[f.path][a] += 1
            file_loc[f.path].append(f.loc_added + f.loc_removed)
            if rec.duration_days:
                file_durations[f.path].append(rec.duration_days)

    file_weights = _drop_mega_files(file_weights, mega_file_threshold)
    if not file_weights:
        return []

    top_files = [f for f, _ in file_weights.most_common(top_k)]

    cooccur: Counter = Counter()
    for rec in records:
        paths = sorted(set(f.path for f in rec.files) & set(top_files))
        for i, a in enumerate(paths):
            for b in paths[i + 1:]:
                cooccur[(a, b)] += 1
                cooccur[(b, a)] += 1

    clusters: list[Cluster] = []
    used: set[str] = set()

    for seed in top_files:
        if seed in used:
            continue
        cluster_files = [seed]
        used.add(seed)
        seed_count = max(len(file_to_tickets[seed]), 1)
        for f in top_files:
            if f in used:
                continue
            if cooccur[(seed, f)] / seed_count >= cooccur_threshold:
                cluster_files.append(f)
                used.add(f)
        if not cluster_files:
            continue

        owners_counter: Counter = Counter()
        loc_samples: list[int] = []
        duration_samples: list[float] = []
        ticket_ids: set[str] = set()
        for f in cluster_files:
            owners_counter.update(file_to_authors[f])
            loc_samples += file_loc[f]
            duration_samples += file_durations[f]
            ticket_ids |= file_to_tickets[f]

        clusters.append(Cluster(
            files=cluster_files,
            owners=owners_counter.most_common(5),
            avg_loc=(sum(loc_samples) / len(loc_samples)) if loc_samples else 0.0,
            avg_duration_days=(sum(duration_samples) / len(duration_samples)) if duration_samples else 0.0,
            ticket_ids=sorted(ticket_ids),
        ))

    return clusters
