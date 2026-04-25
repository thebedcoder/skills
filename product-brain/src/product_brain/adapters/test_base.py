from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional

from ..models import RunResult, TestCase


class TestAdapter(ABC):
    """Abstract test-management interface.

    Pluggable across TestRail / Zephyr / Xray / qTest. The orchestrator
    only uses these methods; tool-native concepts hide behind concrete
    adapters.
    """

    def __init__(self, config):
        self.config = config

    @abstractmethod
    def fetch_case(self, case_id: str) -> Optional[TestCase]: ...

    @abstractmethod
    def fetch_cases_for_ticket(self, ticket_id: str) -> list[TestCase]: ...

    @abstractmethod
    def fetch_cases_for_files(self, paths: list[str]) -> list[TestCase]:
        """Fallback when ticket↔case linkage is incomplete."""
        ...

    @abstractmethod
    def fetch_run_history(
        self,
        case_id: str,
        since: Optional[datetime] = None,
    ) -> list[RunResult]: ...

    @abstractmethod
    def search_cases(self, keywords: str, limit: int = 50) -> list[TestCase]: ...
