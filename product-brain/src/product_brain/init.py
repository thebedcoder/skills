"""Bootstrap .product-brain/manifest.md from repo introspection.

Detects languages, entry points, workflow, ignore paths from the repo
itself. Optional LLM step summarizes top-level README + package files
into the manifest prose body. Without LLM (or no API key), prose is
left as a placeholder for hand-authoring.
"""

from __future__ import annotations

import subprocess
from collections import Counter
from pathlib import Path
from typing import Optional

from .index import write_manifest
from .models import Manifest


_EXT_LANG = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".dart": "dart",
    ".go": "go",
    ".rs": "rust",
    ".rb": "ruby",
    ".java": "java",
    ".kt": "kotlin",
    ".swift": "swift",
    ".php": "php",
    ".cs": "csharp",
    ".scala": "scala",
    ".ex": "elixir",
    ".exs": "elixir",
}

_ENTRY_PATTERNS = {
    "python": ["main.py", "app.py", "manage.py", "server.py", "api/main.py", "src/main.py", "src/__main__.py"],
    "typescript": ["index.ts", "index.tsx", "src/index.ts", "src/index.tsx", "src/main.ts", "src/main.tsx", "server.ts", "app.ts"],
    "javascript": ["index.js", "src/index.js", "server.js", "app.js"],
    "dart": ["lib/main.dart", "bin/main.dart"],
    "go": ["main.go", "cmd/main.go"],
    "rust": ["src/main.rs", "src/lib.rs"],
    "ruby": ["config.ru", "app.rb", "main.rb"],
    "java": ["src/main/java/Main.java"],
    "kotlin": ["src/main/kotlin/Main.kt"],
}

_STANDARD_IGNORES = [
    "vendor/", "node_modules/", ".next/", "build/", "dist/",
    "target/", ".venv/", "venv/", "__pycache__/", ".pytest_cache/",
    "coverage/", ".nuxt/", ".cache/", "out/", "bin/", "obj/",
]

_PROSE_PROMPT = """Summarize this repo for a planning agent.

Output 3 sections, plain markdown, Caveman style (drop articles/filler/hedging):

## What this repo is
One paragraph. What it does. Tech stack one-liner.

## Conventions worth knowing
3-6 bullets. Patterns engineer joining team would need. From inputs only — no invention.

## Out-of-scope areas
0-3 bullets. Frozen/legacy/foreign-team dirs IF obvious. Skip section if unclear.

INPUTS:
%(inputs)s
"""


def detect_languages(repo: Path, top_n: int = 4) -> list[str]:
    counts: Counter = Counter()
    try:
        r = subprocess.run(
            ["git", "-C", str(repo), "ls-files"],
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError:
        return []
    for line in r.stdout.splitlines():
        ext = Path(line).suffix.lower()
        lang = _EXT_LANG.get(ext)
        if lang:
            counts[lang] += 1
    return [lang for lang, _ in counts.most_common(top_n)]


def detect_entry_points(repo: Path, languages: list[str]) -> list[str]:
    out: list[str] = []
    for lang in languages:
        for pattern in _ENTRY_PATTERNS.get(lang, []):
            if (repo / pattern).exists():
                out.append(pattern)
    pkg = repo / "package.json"
    if pkg.exists():
        try:
            import json
            data = json.loads(pkg.read_text())
            main = data.get("main")
            if main and (repo / main).exists() and main not in out:
                out.append(main)
        except (ValueError, OSError):
            pass
    return out[:6]


def detect_workflow(repo: Path) -> str:
    try:
        recent = subprocess.run(
            ["git", "-C", str(repo), "log", "--max-count=100", "--pretty=%P"],
            capture_output=True, text=True, check=True,
        )
    except subprocess.CalledProcessError:
        return "squash"
    merge_count = sum(1 for line in recent.stdout.splitlines() if len(line.split()) >= 2)
    total = sum(1 for line in recent.stdout.splitlines() if line.strip())
    if total == 0:
        return "squash"
    if merge_count / total > 0.3:
        return "merge"
    return "squash"


def detect_ignore_paths(repo: Path) -> list[str]:
    out = list(_STANDARD_IGNORES)
    gi = repo / ".gitignore"
    if gi.exists():
        for line in gi.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.endswith("/") and "/" not in line[:-1]:
                if line not in out:
                    out.append(line)
    return out[:25]


def _gather_prose_inputs(repo: Path, max_chars: int = 8000) -> str:
    parts: list[str] = []
    candidates = [
        "README.md", "README.rst", "README",
        "package.json", "pyproject.toml", "Cargo.toml",
        "pubspec.yaml", "go.mod", "Gemfile",
        "docs/CONSTITUTION.md", "CLAUDE.md", "docs/INDEX.md",
    ]
    budget = max_chars
    for name in candidates:
        p = repo / name
        if not p.exists() or budget <= 0:
            continue
        try:
            text = p.read_text(errors="replace")[:budget]
        except OSError:
            continue
        parts.append(f"=== {name} ===\n{text}")
        budget -= len(text)
    return "\n\n".join(parts)


def init_repo(
    repo_path: Path,
    ticket_regex: str = r"AHA-\d+",
    repo_name: Optional[str] = None,
    llm_call=None,
    force: bool = False,
) -> Manifest:
    repo_path = repo_path.resolve()
    if not (repo_path / ".git").exists():
        raise ValueError(f"{repo_path} is not a git repo")

    target = repo_path / ".product-brain" / "manifest.md"
    if target.exists() and not force:
        raise FileExistsError(f"{target} already exists; pass --force to overwrite")

    languages = detect_languages(repo_path)
    entry_points = detect_entry_points(repo_path, languages)
    workflow = detect_workflow(repo_path)
    ignore_paths = detect_ignore_paths(repo_path)

    body = (
        "## What this repo is\n\n"
        "_(fill in: one paragraph; what it does, tech stack one-liner)_\n\n"
        "## Conventions worth knowing\n\n"
        "_(fill in: 3-6 bullets on patterns/constraints)_\n\n"
        "## Out-of-scope areas\n\n"
        "_(optional: legacy/frozen/foreign-owned dirs)_\n"
    )
    if llm_call is not None:
        inputs = _gather_prose_inputs(repo_path)
        if inputs:
            try:
                generated = llm_call(_PROSE_PROMPT % {"inputs": inputs}, max_tokens=800)
                if generated and "## What this repo is" in generated:
                    body = generated.strip() + "\n"
            except Exception:
                pass

    manifest = Manifest(
        repo=repo_name or repo_path.name,
        ticket_regex=ticket_regex,
        workflow=workflow,
        languages=languages,
        entry_points=entry_points,
        owners_file="CODEOWNERS",
        ignore_paths=ignore_paths,
        mega_file_threshold=0.95,
        last_indexed_sha="",
        index_cutoff_date="",
        body=body,
    )
    write_manifest(repo_path, manifest)
    return manifest
