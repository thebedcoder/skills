from __future__ import annotations

import subprocess
from pathlib import Path


def canonical_paths(repo: Path, paths: list[str]) -> dict[str, str]:
    """Map old paths to their current names at HEAD via `git log --follow`.

    Paths that no longer exist at HEAD are returned as-is (caller marks them
    as deleted). This is a best-effort replay; for repos with many renames,
    consider caching the result of `git log --all --name-status -M` once.
    """
    out: dict[str, str] = {}
    for p in paths:
        if (repo / p).exists():
            out[p] = p
            continue
        try:
            res = subprocess.run(
                ["git", "-C", str(repo), "log", "--follow", "--name-status", "--pretty=", "-1", "--", p],
                capture_output=True, text=True, check=True,
            )
            new_path = p
            for line in res.stdout.splitlines():
                parts = line.split("\t")
                if len(parts) >= 3 and parts[0].startswith("R"):
                    new_path = parts[2]
                    break
            out[p] = new_path
        except subprocess.CalledProcessError:
            out[p] = p
    return out
