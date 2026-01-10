"""Jina Embeddings v3 provider.

Hackathon integration for Jina AI embeddings.

Features:
- Task-specific LoRA adapters (retrieval.query, retrieval.passage, etc.)
- Matryoshka dimensions (32-1024)
- Multilingual support (89 languages)
- Late chunking support

API Docs: https://jina.ai/embeddings/

Usage:
    embedder = JinaEmbeddingProvider(api_key="jina_xxx")
    embedding = await embedder.embed("Hello world")

    # Task-specific
    query_emb = await embedder.embed("search query", task="retrieval.query")
    doc_emb = await embedder.embed("document text", task="retrieval.passage")
"""

from __future__ import annotations

import asyncio
import os
from typing import Literal

import httpx

from .embedding_service import EmbeddingError, EmbeddingProvider


TaskType = Literal[
    "retrieval.query",
    "retrieval.passage",
    "text-matching",
    "separation",
    "classification",
]


class JinaEmbeddingProvider(EmbeddingProvider):
    """Jina AI jina-embeddings-v3 provider.

    Supports:
    - 8192 token context
    - Task-specific LoRA adapters
    - Matryoshka dimension reduction (32-1024)
    - 89 languages

    Requires JINA_API_KEY environment variable.
    """

    API_URL = "https://api.jina.ai/v1/embeddings"
    MODEL = "jina-embeddings-v3"
    DEFAULT_DIMENSION = 1024
    DEFAULT_MAX_BATCH_SIZE = 128
    DEFAULT_MAX_RETRIES = 3
    RETRY_DELAY = 0.5

    def __init__(
        self,
        api_key: str | None = None,
        dimension: int = DEFAULT_DIMENSION,
        task: TaskType = "retrieval.passage",
        max_batch_size: int = DEFAULT_MAX_BATCH_SIZE,
        max_retries: int = DEFAULT_MAX_RETRIES,
        late_chunking: bool = False,
    ):
        """Initialize Jina embedding provider.

        Args:
            api_key: Jina API key (defaults to JINA_API_KEY env var)
            dimension: Embedding dimension (32-1024, default 1024)
            task: Task-specific adapter to use
            max_batch_size: Maximum texts per API call (default 128)
            max_retries: Maximum retry attempts
            late_chunking: Enable late chunking for long documents
        """
        self.api_key = api_key or os.environ.get("JINA_API_KEY")
        if not self.api_key:
            raise ValueError("JINA_API_KEY environment variable required")

        if dimension < 32 or dimension > 1024:
            raise ValueError(f"Dimension must be 32-1024, got {dimension}")

        self._dimension = dimension
        self.task = task
        self.max_batch_size = max_batch_size
        self.max_retries = max_retries
        self.late_chunking = late_chunking
        self._client = httpx.AsyncClient(timeout=60.0)

    async def aclose(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def __aenter__(self) -> "JinaEmbeddingProvider":
        return self

    async def __aexit__(self, *args) -> None:
        await self.aclose()

    async def embed(
        self,
        text: str,
        task: TaskType | None = None,
    ) -> list[float]:
        """Generate embedding for a single text.

        Args:
            text: Text to embed
            task: Override default task adapter

        Returns:
            Embedding vector
        """
        embeddings = await self._call_api([text], task=task)
        return embeddings[0]

    async def embed_batch(
        self,
        texts: list[str],
        task: TaskType | None = None,
    ) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed
            task: Override default task adapter

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        all_embeddings: list[list[float]] = []

        for i in range(0, len(texts), self.max_batch_size):
            chunk = texts[i : i + self.max_batch_size]
            chunk_embeddings = await self._call_api(chunk, task=task)
            all_embeddings.extend(chunk_embeddings)

        return all_embeddings

    async def _call_api(
        self,
        texts: list[str],
        task: TaskType | None = None,
    ) -> list[list[float]]:
        """Call Jina embeddings API with retry logic."""
        last_error: Exception | None = None
        last_response_text: str | None = None
        use_task = task or self.task

        for attempt in range(self.max_retries):
            try:
                payload = {
                    "input": texts,
                    "model": self.MODEL,
                    "dimensions": self._dimension,
                    "task": use_task,
                }

                if self.late_chunking:
                    payload["late_chunking"] = True

                response = await self._client.post(
                    self.API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

                last_response_text = response.text
                response.raise_for_status()
                data = response.json()

                # Sort by index to preserve order
                sorted_data = sorted(data["data"], key=lambda x: x.get("index", 0))
                return [item["embedding"] for item in sorted_data]

            except httpx.HTTPStatusError as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.RETRY_DELAY * (attempt + 1))
            except Exception as e:
                last_error = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.RETRY_DELAY * (attempt + 1))

        error_msg = f"Jina API call failed after {self.max_retries} attempts.\n"
        error_msg += f"Last error: {type(last_error).__name__}: {str(last_error)}\n"
        if last_response_text:
            error_msg += f"Response body: {last_response_text[:500]}"
        raise EmbeddingError(error_msg)

    @property
    def dimension(self) -> int:
        """Return configured dimension."""
        return self._dimension
