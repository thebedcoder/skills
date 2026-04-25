from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml


@dataclass
class RepoConfig:
    name: str
    path: Path


@dataclass
class LLMConfig:
    provider: str = "anthropic"           # anthropic | openai | azure_openai | openai_compatible
    api_key_env: str = "ANTHROPIC_API_KEY"
    base_url: Optional[str] = None        # openai_compatible (Ollama, vLLM, ...) OR Azure endpoint
    api_version: Optional[str] = None     # Azure OpenAI api_version
    model_summarize: str = "claude-haiku-4-5-20251001"
    model_extract: str = "claude-haiku-4-5-20251001"
    model_synthesize: str = "claude-sonnet-4-6"
    max_input_tokens_per_ticket: int = 8000


@dataclass
class EstimateConfig:
    unit: str = "days"
    reference_window_days: int = 90
    min_similarity: float = 0.4
    min_references_for_medium: int = 4
    min_references_for_high: int = 6


@dataclass
class BackfillConfig:
    workflow: str = "squash"
    pr_enrichment: bool = True
    symbol_extraction: bool = False


@dataclass
class BotConfig:
    enabled: bool = False
    host: str = "0.0.0.0"
    port: int = 8088
    webhook_signing_secret_env: str = "AHA_WEBHOOK_SECRET"
    allowed_users: list[str] = field(default_factory=list)
    cooldown_hours: int = 24
    opt_in_label: str = "brain:on"
    kill_switch_label: str = "brain:off"
    quiet_hours_utc: list[int] = field(default_factory=lambda: [22, 7])
    draft_status: str = "Bot-draft"


@dataclass
class AhaConfig:
    subdomain: str = ""
    api_key_env: str = "AHA_API_KEY"
    workspace: str = ""


@dataclass
class TestRailConfig:
    base_url: str = ""
    user_email: str = ""
    api_key_env: str = "TESTRAIL_API_KEY"
    project_id: int = 0
    refs_field: str = "refs"
    run_history_window_days: int = 90


@dataclass
class GitHubConfig:
    api_key_env: str = "GITHUB_TOKEN"


@dataclass
class AuditConfig:
    path: str = "./audit.sqlite"


@dataclass
class QueueConfig:
    backend: str = "sqlite"
    path: str = "./queue.sqlite"


@dataclass
class Config:
    repos: list[RepoConfig]
    pm_adapter: str
    ticket_regex: str = r"AHA-\d+"
    test_adapter: Optional[str] = None
    aha: AhaConfig = field(default_factory=AhaConfig)
    testrail: TestRailConfig = field(default_factory=TestRailConfig)
    github: GitHubConfig = field(default_factory=GitHubConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    estimate: EstimateConfig = field(default_factory=EstimateConfig)
    backfill: BackfillConfig = field(default_factory=BackfillConfig)
    bot: BotConfig = field(default_factory=BotConfig)
    audit: AuditConfig = field(default_factory=AuditConfig)
    queue: QueueConfig = field(default_factory=QueueConfig)
    config_dir: Path = field(default_factory=Path.cwd)

    def repo(self, name: str) -> RepoConfig:
        for r in self.repos:
            if r.name == name:
                return r
        raise KeyError(f"repo not configured: {name}")

    @property
    def brain_root(self) -> Path:
        return self.config_dir

    def repo_dir(self, name: str) -> Path:
        return self.brain_root / "repos" / name

    def tickets_dir(self, name: str) -> Path:
        return self.repo_dir(name) / "tickets"

    def manifest_path(self, name: str) -> Path:
        return self.repo_dir(name) / "manifest.md"

    def llm_api_key(self) -> str:
        return os.environ[self.llm.api_key_env]

    def aha_api_key(self) -> str:
        return os.environ[self.aha.api_key_env]

    def testrail_api_key(self) -> Optional[str]:
        return os.environ.get(self.testrail.api_key_env)

    def github_token(self) -> Optional[str]:
        return os.environ.get(self.github.api_key_env)


def load(path: Optional[str | Path] = None) -> Config:
    candidates = []
    if path:
        candidates.append(Path(path))
    candidates += [
        Path.cwd() / "config.yaml",
        Path.home() / ".config" / "product-brain" / "config.yaml",
    ]
    for c in candidates:
        if c.exists():
            return _load_from(c)
    raise FileNotFoundError(
        "No config.yaml found. Looked in: " + ", ".join(str(c) for c in candidates)
    )


def _load_from(path: Path) -> Config:
    raw = yaml.safe_load(path.read_text())
    config_dir = path.parent.resolve()

    repos = [
        RepoConfig(name=r["name"], path=(config_dir / r["path"]).resolve())
        for r in raw["repos"]
    ]

    return Config(
        repos=repos,
        pm_adapter=raw["pm_adapter"],
        ticket_regex=raw.get("ticket_regex", r"AHA-\d+"),
        test_adapter=raw.get("test_adapter"),
        aha=AhaConfig(**raw.get("aha", {})),
        testrail=TestRailConfig(**raw.get("testrail", {})),
        github=GitHubConfig(**raw.get("github", {})),
        llm=LLMConfig(**raw.get("llm", {})),
        estimate=EstimateConfig(**raw.get("estimate", {})),
        backfill=BackfillConfig(**raw.get("backfill", {})),
        bot=BotConfig(**raw.get("bot", {})),
        audit=AuditConfig(**raw.get("audit", {})),
        queue=QueueConfig(**raw.get("queue", {})),
        config_dir=config_dir,
    )
