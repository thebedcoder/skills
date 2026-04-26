from __future__ import annotations

from .base import LLMProvider


def get_provider(config) -> LLMProvider:
    """Factory: pick provider from config.llm.provider."""
    name = (config.llm.provider or "anthropic").lower()
    api_key = config.llm_api_key()
    base_url = getattr(config.llm, "base_url", None)
    api_version = getattr(config.llm, "api_version", None)

    if name == "anthropic":
        from .anthropic_provider import AnthropicProvider
        return AnthropicProvider(api_key=api_key, base_url=base_url)

    if name in ("openai", "openai_compatible"):
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(api_key=api_key, base_url=base_url)

    if name == "azure_openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider(
            api_key=api_key, azure=True,
            api_version=api_version, azure_endpoint=base_url,
        )

    raise KeyError(
        f"unknown LLM provider: {name}. "
        f"valid: anthropic | openai | azure_openai | openai_compatible"
    )


__all__ = ["LLMProvider", "get_provider"]
