"""Migrate from the legacy 'in-repo' layout (.product-brain/ inside source)
to the central brain-repo layout (brain_root/repos/<name>/).
"""

from __future__ import annotations

import shutil
from pathlib import Path


def migrate_source(brain_root: Path, source_path: Path, repo_name: str, remove_from_source: bool = False) -> dict:
    brain_root = brain_root.resolve()
    source_path = source_path.resolve()
    legacy = source_path / ".product-brain"
    if not legacy.exists():
        return {"copied": 0, "reason": "no .product-brain/ in source"}

    target = brain_root / "repos" / repo_name
    target.mkdir(parents=True, exist_ok=True)

    copied = 0
    legacy_manifest = legacy / "manifest.md"
    if legacy_manifest.exists():
        shutil.copy2(legacy_manifest, target / "manifest.md")
        copied += 1

    legacy_tickets = legacy / "tickets"
    if legacy_tickets.exists():
        target_tickets = target / "tickets"
        target_tickets.mkdir(exist_ok=True)
        for f in legacy_tickets.glob("*.md"):
            shutil.copy2(f, target_tickets / f.name)
            copied += 1

    if remove_from_source:
        shutil.rmtree(legacy)

    return {
        "copied": copied,
        "from": str(legacy),
        "to": str(target),
        "removed_from_source": remove_from_source,
    }
