from typing import Optional

from .base import PMAdapter
from .aha import AhaAdapter
from .test_base import TestAdapter
from .testrail import TestRailAdapter

ADAPTERS: dict[str, type[PMAdapter]] = {
    "aha": AhaAdapter,
}

TEST_ADAPTERS: dict[str, type[TestAdapter]] = {
    "testrail": TestRailAdapter,
}


def get(name: str, config) -> PMAdapter:
    if name not in ADAPTERS:
        raise KeyError(f"unknown PM adapter: {name}. registered: {list(ADAPTERS)}")
    return ADAPTERS[name](config)


def get_test(name: Optional[str], config) -> Optional[TestAdapter]:
    if not name:
        return None
    if name not in TEST_ADAPTERS:
        raise KeyError(f"unknown test adapter: {name}. registered: {list(TEST_ADAPTERS)}")
    return TEST_ADAPTERS[name](config)
