"""Jina Embeddings v3 - Task-Specific LoRA Adapters.

Jina v3 uses task adapters (retrieval.query vs retrieval.passage) for
asymmetric retrieval - different embeddings for queries vs documents.

Sponsors: Jina AI
Docs: https://jina.ai/embeddings/

Usage:
    embeddings = JinaEmbeddings()

    # For documents/passages (stored in Atlas)
    doc_emb = await embeddings.embed("def calculate_total()...", task="retrieval.passage")

    # For queries (used for search)
    query_emb = await embeddings.embed("find total calculation", task="retrieval.query")

    # Other tasks
    classify_emb = await embeddings.embed("text", task="classification")
    cluster_emb = await embeddings.embed("text", task="text-matching")
"""

import os
from typing import Literal

import httpx

# Jina v3 task types - each uses a different LoRA adapter
JinaTask = Literal[
    "retrieval.query",      # For search queries
    "retrieval.passage",    # For documents being indexed
    "classification",       # For classification tasks
    "text-matching",        # For clustering/matching
    "separation",           # For separating similar texts
]


class JinaEmbeddings:
    """Jina Embeddings v3 client.

    Features:
    - Task-specific LoRA adapters for better retrieval
    - 1024 dimensions (configurable)
    - Late chunking support (coming)
    - MRL encoding for dimension reduction
    """

    API_URL = "https://api.jina.ai/v1/embeddings"
    MODEL = "jina-embeddings-v3"

    def __init__(
        self,
        api_key: str | None = None,
        dimensions: int = 1024,
    ):
        self.api_key = api_key or os.environ.get("JINA_API_KEY")
        self.dimensions = dimensions
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def embed(
        self,
        text: str | list[str],
        task: JinaTask = "retrieval.passage",
    ) -> list[float] | list[list[float]]:
        """Generate embeddings with task-specific adapter.

        Args:
            text: Single text or list of texts
            task: Which LoRA adapter to use

        Returns:
            Embedding vector(s)
        """
        if not self.api_key:
            raise ValueError("Set JINA_API_KEY environment variable")

        client = await self._get_client()

        texts = [text] if isinstance(text, str) else text

        response = await client.post(
            self.API_URL,
            json={
                "model": self.MODEL,
                "input": texts,
                "task": task,
                "dimensions": self.dimensions,
            },
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()

        data = response.json()
        embeddings = [item["embedding"] for item in data["data"]]

        # Return single embedding if single text input
        if isinstance(text, str):
            return embeddings[0]
        return embeddings

    async def embed_for_search(
        self,
        query: str,
    ) -> list[float]:
        """Embed a search query (uses retrieval.query adapter)."""
        return await self.embed(query, task="retrieval.query")

    async def embed_for_storage(
        self,
        content: str | list[str],
    ) -> list[float] | list[list[float]]:
        """Embed content for storage (uses retrieval.passage adapter)."""
        return await self.embed(content, task="retrieval.passage")

    async def embed_batch(
        self,
        texts: list[str],
        task: JinaTask = "retrieval.passage",
        batch_size: int = 100,
    ) -> list[list[float]]:
        """Embed texts in batches.

        Jina API supports up to 2048 texts per request.
        """
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            embeddings = await self.embed(batch, task=task)
            all_embeddings.extend(embeddings)

        return all_embeddings


class LocalEmbeddings:
    """Fallback to local embeddings (sentence-transformers).

    Used when JINA_API_KEY is not set.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
            except ImportError:
                raise ImportError("pip install sentence-transformers for local embeddings")
        return self._model

    async def embed(
        self,
        text: str | list[str],
        task: str = "retrieval.passage",  # Ignored for local
    ) -> list[float] | list[list[float]]:
        """Generate embeddings locally."""
        model = self._get_model()

        if isinstance(text, str):
            embedding = model.encode(text, convert_to_numpy=True)
            return embedding.tolist()

        embeddings = model.encode(text, convert_to_numpy=True)
        return [e.tolist() for e in embeddings]

    async def close(self):
        pass


class EmbeddingsRouter:
    """Routes to Jina v3 or local fallback based on availability."""

    def __init__(self):
        if os.environ.get("JINA_API_KEY"):
            self._provider = JinaEmbeddings()
            self.provider_name = "jina-v3"
        else:
            self._provider = LocalEmbeddings()
            self.provider_name = "local"

    async def embed(
        self,
        text: str | list[str],
        task: JinaTask = "retrieval.passage",
    ) -> list[float] | list[list[float]]:
        return await self._provider.embed(text, task=task)

    async def embed_for_search(self, query: str) -> list[float]:
        return await self.embed(query, task="retrieval.query")

    async def embed_for_storage(self, content: str | list[str]) -> list[float] | list[list[float]]:
        return await self.embed(content, task="retrieval.passage")

    async def close(self):
        await self._provider.close()
