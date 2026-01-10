"""Fireworks AI inference provider.

Hackathon integration for Fireworks AI LLM inference.

Features:
- OpenAI-compatible API
- 4x lower latency than vLLM
- Multiple model support (Llama, Qwen, DeepSeek, etc.)
- Streaming support
- Function calling

API Docs: https://docs.fireworks.ai/

Usage:
    from fireworks_provider import FireworksProvider

    provider = FireworksProvider()
    response = await provider.chat_completion(
        messages=[{"role": "user", "content": "Hello!"}],
        model="llama-v3p1-8b-instruct"
    )

    # Streaming
    async for chunk in provider.chat_completion_stream(...):
        print(chunk)
"""

from __future__ import annotations

import asyncio
import os
from typing import Any, AsyncIterator, Literal

import httpx


ModelType = Literal[
    "llama-v3p1-8b-instruct",
    "llama-v3p1-70b-instruct",
    "llama-v3p1-405b-instruct",
    "qwen2p5-72b-instruct",
    "deepseek-v3",
    "mixtral-8x22b-instruct",
]


class FireworksError(Exception):
    """Error from Fireworks API."""
    pass


class FireworksProvider:
    """Fireworks AI inference provider.

    OpenAI-compatible API for fast open-source model inference.

    Supports:
    - Chat completions (streaming and non-streaming)
    - Function calling
    - Multiple models (Llama, Qwen, DeepSeek, Mixtral)

    Requires FIREWORKS_API_KEY environment variable.
    """

    BASE_URL = "https://api.fireworks.ai/inference/v1"
    DEFAULT_MODEL = "accounts/fireworks/models/llama-v3p1-8b-instruct"
    DEFAULT_MAX_RETRIES = 3
    RETRY_DELAY = 0.5

    # Model name mappings (short name -> full name)
    MODELS = {
        "llama-v3p1-8b-instruct": "accounts/fireworks/models/llama-v3p1-8b-instruct",
        "llama-v3p1-70b-instruct": "accounts/fireworks/models/llama-v3p1-70b-instruct",
        "llama-v3p1-405b-instruct": "accounts/fireworks/models/llama-v3p1-405b-instruct",
        "qwen2p5-72b-instruct": "accounts/fireworks/models/qwen2p5-72b-instruct",
        "deepseek-v3": "accounts/fireworks/models/deepseek-v3",
        "mixtral-8x22b-instruct": "accounts/fireworks/models/mixtral-8x22b-instruct",
    }

    def __init__(
        self,
        api_key: str | None = None,
        default_model: str = "llama-v3p1-8b-instruct",
        max_retries: int = DEFAULT_MAX_RETRIES,
        timeout: float = 120.0,
    ):
        """Initialize Fireworks provider.

        Args:
            api_key: Fireworks API key (defaults to FIREWORKS_API_KEY env var)
            default_model: Default model to use
            max_retries: Maximum retry attempts
            timeout: Request timeout in seconds
        """
        self.api_key = api_key or os.environ.get("FIREWORKS_API_KEY")
        if not self.api_key:
            raise ValueError("FIREWORKS_API_KEY environment variable required")

        self.default_model = self._resolve_model(default_model)
        self.max_retries = max_retries
        self._client = httpx.AsyncClient(timeout=timeout)

    def _resolve_model(self, model: str) -> str:
        """Resolve short model name to full Fireworks model path."""
        if model.startswith("accounts/"):
            return model
        return self.MODELS.get(model, f"accounts/fireworks/models/{model}")

    async def aclose(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> "FireworksProvider":
        return self

    async def __aexit__(self, *args) -> None:
        await self.aclose()

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 1.0,
        stop: list[str] | None = None,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Generate chat completion.

        Args:
            messages: List of chat messages
            model: Model to use (defaults to default_model)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
            stop: Stop sequences
            tools: Tool definitions for function calling
            tool_choice: Tool choice strategy

        Returns:
            OpenAI-compatible completion response
        """
        use_model = self._resolve_model(model) if model else self.default_model

        payload: dict[str, Any] = {
            "model": use_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
        }

        if stop:
            payload["stop"] = stop
        if tools:
            payload["tools"] = tools
        if tool_choice:
            payload["tool_choice"] = tool_choice

        return await self._call_api("/chat/completions", payload)

    async def chat_completion_stream(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        top_p: float = 1.0,
        stop: list[str] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Generate streaming chat completion.

        Args:
            messages: List of chat messages
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            top_p: Nucleus sampling
            stop: Stop sequences

        Yields:
            Stream chunks with delta content
        """
        use_model = self._resolve_model(model) if model else self.default_model

        payload = {
            "model": use_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "stream": True,
        }

        if stop:
            payload["stop"] = stop

        async with self._client.stream(
            "POST",
            f"{self.BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        ) as response:
            response.raise_for_status()

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        import json
                        yield json.loads(data)
                    except Exception:
                        continue

    async def _call_api(
        self,
        endpoint: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """Call Fireworks API with retry logic."""
        last_error: Exception | None = None
        last_response_text: str | None = None

        for attempt in range(self.max_retries):
            try:
                response = await self._client.post(
                    f"{self.BASE_URL}{endpoint}",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

                last_response_text = response.text
                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                last_error = e
                # Don't retry on 4xx errors (except 429 rate limit)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    break
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.RETRY_DELAY * (attempt + 1))
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.RETRY_DELAY * (attempt + 1))

        error_msg = f"Fireworks API call failed after {self.max_retries} attempts.\n"
        error_msg += f"Last error: {type(last_error).__name__}: {str(last_error)}\n"
        if last_response_text:
            error_msg += f"Response body: {last_response_text[:500]}"
        raise FireworksError(error_msg)


# OpenAI-compatible client wrapper for drop-in replacement
class FireworksOpenAIClient:
    """OpenAI-compatible wrapper for Fireworks AI.

    Drop-in replacement for openai.AsyncOpenAI that routes to Fireworks.

    Usage:
        client = FireworksOpenAIClient()

        # Same interface as openai.AsyncOpenAI
        response = await client.chat.completions.create(
            model="llama-v3p1-8b-instruct",
            messages=[{"role": "user", "content": "Hello!"}]
        )
    """

    def __init__(self, api_key: str | None = None):
        """Initialize OpenAI-compatible client.

        Args:
            api_key: Fireworks API key (defaults to FIREWORKS_API_KEY env var)
        """
        self._provider = FireworksProvider(api_key=api_key)
        self.chat = _ChatNamespace(self._provider)

    async def aclose(self) -> None:
        await self._provider.aclose()


class _ChatNamespace:
    """Chat completions namespace."""

    def __init__(self, provider: FireworksProvider):
        self._provider = provider
        self.completions = _CompletionsNamespace(provider)


class _CompletionsNamespace:
    """Completions namespace."""

    def __init__(self, provider: FireworksProvider):
        self._provider = provider

    async def create(
        self,
        messages: list[dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = False,
        **kwargs,
    ):
        """Create chat completion (OpenAI-compatible interface)."""
        if stream:
            return self._provider.chat_completion_stream(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
        else:
            return await self._provider.chat_completion(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )
