from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from .backfill.run import backfill_repo
from .config import load as load_config


def _last_commit_sha(repo: Path) -> str:
    return subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"],
                          capture_output=True, text=True, check=True).stdout.strip()


def _last_commit_message(repo: Path) -> str:
    return subprocess.run(["git", "-C", str(repo), "log", "-1", "--pretty=%B"],
                          capture_output=True, text=True, check=True).stdout


def run_for_current_commit(repo_path: Path) -> int:
    """Called from a post-merge git hook. Updates only the ticket(s) referenced
    by the freshly-merged commit. Returns exit code."""
    config = load_config()
    repo_name = next((r.name for r in config.repos if r.path.resolve() == repo_path.resolve()), None)
    if not repo_name:
        print(f"product-brain: repo at {repo_path} is not in config.yaml; skipping.", file=sys.stderr)
        return 0

    msg = _last_commit_message(repo_path)
    pattern = re.compile(config.ticket_regex)
    if not pattern.search(msg):
        return 0

    parent_sha = subprocess.run(
        ["git", "-C", str(repo_path), "rev-parse", "HEAD~1"],
        capture_output=True, text=True,
    ).stdout.strip()
    since = parent_sha or None

    summary = backfill_repo(config, repo_name, since=since)
    print(f"product-brain incremental: {summary}")
    return 0


def main():
    repo_path = Path.cwd()
    sys.exit(run_for_current_commit(repo_path))


if __name__ == "__main__":
    main()
