from __future__ import annotations

from datetime import datetime, timezone


def within_cooldown(last_run_ts: float, now: datetime, cooldown_hours: int) -> bool:
    if last_run_ts <= 0:
        return False
    age_hours = (now.timestamp() - last_run_ts) / 3600.0
    return age_hours < cooldown_hours


def in_quiet_hours(now: datetime, quiet_hours_utc: list[int]) -> bool:
    if not quiet_hours_utc or len(quiet_hours_utc) != 2:
        return False
    start, end = quiet_hours_utc
    h = now.astimezone(timezone.utc).hour
    if start <= end:
        return start <= h < end
    return h >= start or h < end
