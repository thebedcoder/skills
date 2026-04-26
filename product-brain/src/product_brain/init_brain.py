"""Bootstrap an empty product-brain repository.

Creates the central brain repo skeleton: config.yaml from template,
repos/ directory, .gitignore, README pointer.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


_GITIGNORE = """\
__pycache__/
*.pyc
.env
*.sqlite
*.sqlite-journal
.venv/
"""


_README = """\
# Company Product Brain

Central memory + planning index for {n} bound source repos.
This repo is generated and maintained by the `product-brain` tool.

Layout:

    config.yaml             orchestrator config
    repos/                  one subdirectory per bound source repo
      <name>/
        manifest.md         per-repo manifest (front-matter + prose)
        tickets/            one record per ticket touched in this repo
          AHA-NNNN.md
    audit.sqlite            bot audit log (gitignored)
    queue.sqlite            bot job queue (gitignored)

Add a source repo:

    product-brain bind /path/to/source-repo --name <short-name>

Backfill / sync:

    product-brain backfill --repo <name>
    product-brain sync --repo <name>

See https://github.com/.../product-brain for the tool.
"""


def init_brain_repo(brain_path: Path, force: bool = False) -> dict:
    brain_path = brain_path.resolve()
    brain_path.mkdir(parents=True, exist_ok=True)

    config_path = brain_path / "config.yaml"
    if config_path.exists() and not force:
        raise FileExistsError(f"{config_path} already exists; pass --force to overwrite")

    template = (Path(__file__).parent.parent.parent / "config.example.yaml")
    if template.exists():
        shutil.copy(template, config_path)
    else:
        config_path.write_text(_MIN_CONFIG)

    (brain_path / "repos").mkdir(exist_ok=True)

    gitignore = brain_path / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(_GITIGNORE)

    readme = brain_path / "README.md"
    if not readme.exists():
        readme.write_text(_README.format(n=0))

    if not (brain_path / ".git").exists():
        subprocess.run(["git", "-C", str(brain_path), "init"], capture_output=True)

    return {
        "brain_path": str(brain_path),
        "config": str(config_path),
        "next": "edit config.yaml, then `product-brain bind <source-path> --name <name>`",
    }


_MIN_CONFIG = """\
repos: []

ticket_regex: 'AHA-\\\\d+'
pm_adapter: aha

aha:
  subdomain: yourcompany
  api_key_env: AHA_API_KEY

llm:
  provider: anthropic
  api_key_env: ANTHROPIC_API_KEY
  model_summarize: claude-haiku-4-5-20251001
  model_synthesize: claude-sonnet-4-6

estimate:
  unit: days
  reference_window_days: 90

bot:
  enabled: false

audit: { path: ./audit.sqlite }
queue: { backend: sqlite, path: ./queue.sqlite }
"""
