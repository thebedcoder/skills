from __future__ import annotations

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Backend abstraction for LLM calls.

    All product-brain LLM usage flows through this interface. Backends
    can be hosted (Anthropic, OpenAI, Azure OpenAI) or self-hosted via
    OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, llama.cpp,
    text-generation-inference).
    """

    @abstractmethod
    def call(self, prompt: str, model: str, max_tokens: int = 2000) -> str: ...
