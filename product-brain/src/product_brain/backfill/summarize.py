from __future__ import annotations

from typing import Callable

import anthropic

from ..config import Config


def llm_call_factory(config: Config, model: str | None = None) -> Callable[[str], str]:
    """Return a function that takes a prompt and returns text.

    Used by edge-case mining and prose generation.
    """
    client = anthropic.Anthropic(api_key=config.llm_api_key())
    chosen_model = model or config.llm.model_summarize

    def call(prompt: str, max_tokens: int = 2000) -> str:
        resp = client.messages.create(
            model=chosen_model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in resp.content if hasattr(b, "text"))

    return call
