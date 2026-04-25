from __future__ import annotations

from typing import Callable, Optional

from ..config import Config
from ..llm import get_provider


def llm_call_factory(config: Config, model: Optional[str] = None) -> Callable[[str], str]:
    """Return a function that takes a prompt and returns text.

    Provider is chosen via config.llm.provider (anthropic | openai |
    azure_openai | openai_compatible). All product-brain LLM usage flows
    through this factory.
    """
    provider = get_provider(config)
    chosen_model = model or config.llm.model_summarize

    def call(prompt: str, max_tokens: int = 2000) -> str:
        return provider.call(prompt, chosen_model, max_tokens=max_tokens)

    return call
