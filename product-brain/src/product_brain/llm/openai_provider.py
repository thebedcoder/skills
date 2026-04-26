from __future__ import annotations

from typing import Optional

from .base import LLMProvider


class OpenAIProvider(LLMProvider):
    """Covers OpenAI direct, Azure OpenAI, and any OpenAI-compatible endpoint.

    OpenAI-compatible covers local and self-hosted models:
      - Ollama       base_url=http://localhost:11434/v1
      - LM Studio    base_url=http://localhost:1234/v1
      - vLLM         base_url=http://localhost:8000/v1
      - llama.cpp    base_url=http://localhost:8080/v1
      - text-generation-inference, OpenRouter, Groq, Together, Anyscale...

    For Azure OpenAI, set azure=True and pass api_version + azure_endpoint.
    """

    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        azure: bool = False,
        api_version: Optional[str] = None,
        azure_endpoint: Optional[str] = None,
    ):
        try:
            from openai import AzureOpenAI, OpenAI
        except ImportError as e:
            raise ImportError(
                "openai provider selected but 'openai' is not installed. "
                "install: pip install 'product-brain[openai]'"
            ) from e

        if azure:
            self.client = AzureOpenAI(
                api_key=api_key or "azure",
                api_version=api_version or "2024-02-15-preview",
                azure_endpoint=azure_endpoint or base_url or "",
            )
        else:
            kwargs = {"api_key": api_key or "local"}
            if base_url:
                kwargs["base_url"] = base_url
            self.client = OpenAI(**kwargs)

    def call(self, prompt: str, model: str, max_tokens: int = 2000) -> str:
        resp = self.client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        choice = resp.choices[0] if resp.choices else None
        if not choice or not choice.message:
            return ""
        return choice.message.content or ""
