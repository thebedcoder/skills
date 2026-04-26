from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from ..models import RunResult, TestCase
from .test_base import TestAdapter


_AUTOMATION_MAP = {
    0: "manual",
    1: "automated",
    2: "semi",
}


def _ts_to_dt(ts) -> Optional[datetime]:
    if ts in (None, 0, "0"):
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    except (ValueError, TypeError):
        return None


class TestRailAdapter(TestAdapter):
    """TestRail REST API v2 adapter.

    TestRail uses HTTP Basic Auth (user_email + api_key). Cases are
    linked to tickets via the configurable `refs` field
    (comma-separated).
    """

    def __init__(self, config):
        super().__init__(config)
        cfg = config.testrail
        api_key = config.testrail_api_key() or ""
        token = base64.b64encode(f"{cfg.user_email}:{api_key}".encode()).decode()
        self.base = cfg.base_url.rstrip("/") + "/index.php?/api/v2"
        self._client = httpx.Client(
            headers={
                "Authorization": f"Basic {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        self.project_id = cfg.project_id
        self.refs_field = cfg.refs_field
        self.window_days = cfg.run_history_window_days

    def _get(self, path: str, **params) -> dict | list:
        sep = "&" if "?" in self.base else "?"
        url = f"{self.base}/{path}"
        r = self._client.get(url, params=params)
        r.raise_for_status()
        return r.json()

    def _to_case(self, raw: dict) -> TestCase:
        case_id = f"TR-C-{raw.get('id', '')}"
        refs = (raw.get(self.refs_field) or "").strip()
        linked = [t.strip() for t in refs.split(",") if t.strip()] if refs else []
        steps_raw = raw.get("custom_steps_separated") or raw.get("custom_steps") or ""
        if isinstance(steps_raw, list):
            steps = [s.get("content", "") for s in steps_raw if isinstance(s, dict)]
        else:
            steps = [s.strip() for s in str(steps_raw).split("\n") if s.strip()]
        return TestCase(
            id=case_id,
            title=raw.get("title", ""),
            preconditions=raw.get("custom_preconds", "") or "",
            steps=steps,
            expected=raw.get("custom_expected", "") or "",
            automation=_AUTOMATION_MAP.get(raw.get("custom_automation_type"), "unknown"),
            type=raw.get("type") or "functional",
            suite=str(raw.get("suite_id", "")),
            linked_tickets=linked,
            url=f"{self.config.testrail.base_url.rstrip('/')}/index.php?/cases/view/{raw.get('id')}",
        )

    def fetch_case(self, case_id: str) -> Optional[TestCase]:
        numeric = case_id.replace("TR-C-", "")
        try:
            data = self._get(f"get_case/{numeric}")
        except httpx.HTTPStatusError:
            return None
        if not isinstance(data, dict):
            return None
        return self._to_case(data)

    def fetch_cases_for_ticket(self, ticket_id: str) -> list[TestCase]:
        if not self.project_id:
            return []
        try:
            data = self._get(f"get_cases/{self.project_id}", refs_filter=ticket_id)
        except httpx.HTTPStatusError:
            return []
        items = data.get("cases", []) if isinstance(data, dict) else (data or [])
        out = []
        for raw in items:
            case = self._to_case(raw)
            if ticket_id in case.linked_tickets:
                out.append(case)
        return out

    def fetch_cases_for_files(self, paths: list[str]) -> list[TestCase]:
        if not paths or not self.project_id:
            return []
        keywords = " ".join({p.split("/")[-1].split(".")[0] for p in paths if p})[:200]
        return self.search_cases(keywords)

    def fetch_run_history(
        self,
        case_id: str,
        since: Optional[datetime] = None,
    ) -> list[RunResult]:
        numeric = case_id.replace("TR-C-", "")
        since = since or (datetime.now(timezone.utc) - timedelta(days=self.window_days))
        cutoff = int(since.timestamp())
        try:
            runs = self._get(f"get_runs/{self.project_id}", created_after=cutoff)
        except httpx.HTTPStatusError:
            return []
        run_items = runs.get("runs", []) if isinstance(runs, dict) else (runs or [])
        out: list[RunResult] = []
        for run in run_items[:50]:
            run_id = run.get("id")
            try:
                results = self._get(f"get_results_for_case/{run_id}/{numeric}")
            except httpx.HTTPStatusError:
                continue
            res_items = results.get("results", []) if isinstance(results, dict) else (results or [])
            for r in res_items:
                out.append(RunResult(
                    case_id=case_id,
                    status=_status_name(r.get("status_id")),
                    run_id=str(run_id),
                    timestamp=_ts_to_dt(r.get("created_on")),
                    comment=(r.get("comment") or "")[:200],
                ))
        return out

    def search_cases(self, keywords: str, limit: int = 50) -> list[TestCase]:
        if not self.project_id:
            return []
        try:
            data = self._get(f"get_cases/{self.project_id}", filter=keywords)
        except httpx.HTTPStatusError:
            return []
        items = data.get("cases", []) if isinstance(data, dict) else (data or [])
        return [self._to_case(c) for c in items[:limit]]


def _status_name(sid) -> str:
    return {
        1: "passed", 2: "blocked", 3: "untested",
        4: "retest", 5: "failed",
    }.get(sid, "unknown")
