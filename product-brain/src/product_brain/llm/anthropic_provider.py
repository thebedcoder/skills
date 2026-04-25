from __future__ import annotations

from typing import Optional

from .base import LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        try:
            import anthropic
        except ImportError as e:
            raise ImportError(
                "anthropic provider selected but 'anthropic' is not installed. "
                "install: pip install 'product-brain[anthropic]'"
            ) from e
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self.client = anthropic.Anthropic(**kwargs)

    def call(self, prompt: str, model: str, max_tokens: int = 2000) -> str:
        resp = self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in resp.content if hasattr(b, "text"))
