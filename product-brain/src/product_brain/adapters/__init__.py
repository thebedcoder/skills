from .base import PMAdapter
from .aha import AhaAdapter

ADAPTERS: dict[str, type[PMAdapter]] = {
    "aha": AhaAdapter,
}


def get(name: str, config) -> PMAdapter:
    if name not in ADAPTERS:
        raise KeyError(f"unknown PM adapter: {name}. registered: {list(ADAPTERS)}")
    return ADAPTERS[name](config)
