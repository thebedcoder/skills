from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

from .backfill.run import backfill_repo
from .config import load as load_config


def _last_commit_message(repo: Path) -> str:
    return subprocess.run(["git", "-C", str(repo), "log", "-1", "--pretty=%B"],
                          capture_output=True, text=True, check=True).stdout


def run_for_source(repo_name: str, since_sha: Optional[str] = None, config_path: Optional[str] = None) -> int:
    """Run incremental for a configured source repo. Writes records into brain repo."""
    config = load_config(config_path)
    try:
        repo_cfg = config.repo(repo_name)
    except KeyError:
        print(f"product-brain: repo '{repo_name}' not in config", file=sys.stderr)
        return 1

    if since_sha is None:
        msg = _last_commit_message(repo_cfg.path)
        pattern = re.compile(config.ticket_regex)
        if not pattern.search(msg):
            return 0
        parent = subprocess.run(
            ["git", "-C", str(repo_cfg.path), "rev-parse", "HEAD~1"],
            capture_output=True, text=True,
        ).stdout.strip()
        since_sha = parent or None

    summary = backfill_repo(config, repo_name, since=since_sha)
    print(f"product-brain incremental: {summary}")
    return 0


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--repo", required=True, help="repo name (must be in config.yaml)")
    p.add_argument("--since", help="git SHA; default: parent of HEAD")
    p.add_argument("--config", help="path to config.yaml")
    args = p.parse_args()
    sys.exit(run_for_source(args.repo, args.since, args.config))


if __name__ == "__main__":
    main()
