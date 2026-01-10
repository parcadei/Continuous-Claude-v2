"""Unified hackathon configuration.

Central configuration for all sponsor integrations.

Environment Variables:
- MONGODB_URI or ATLAS_URI: MongoDB Atlas connection string
- FIREWORKS_API_KEY: Fireworks AI API key
- JINA_API_KEY: Jina AI API key
- GALILEO_API_KEY: Galileo AI API key
- GALILEO_CONSOLE_URL: Galileo console URL (optional)

Usage:
    from hackathon_config import HackathonConfig, get_config

    config = get_config()

    # Get providers
    embedder = config.get_embedding_service()
    llm = config.get_llm_provider()
    memory = await config.get_memory_backend()
    evaluator = config.get_evaluator()
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Literal

# Import all providers
from .embedding_service import EmbeddingService
from .jina_embeddings import JinaEmbeddingProvider
from .fireworks_provider import FireworksProvider, FireworksOpenAIClient
from .atlas_backend import AtlasMemoryBackend, get_atlas_backend
from .galileo_eval import GalileoEvaluator, QualityGate


MemoryBackendType = Literal["postgres", "atlas", "sqlite"]
EmbeddingProviderType = Literal["jina", "voyage", "openai", "local"]
LLMProviderType = Literal["fireworks", "openai", "anthropic"]


@dataclass
class HackathonConfig:
    """Unified configuration for hackathon integrations.

    Manages all sponsor service configurations in one place.
    """

    # Memory backend
    memory_backend: MemoryBackendType = "atlas"
    mongodb_uri: str | None = None
    atlas_db_name: str = "continuous_claude"

    # Embedding provider
    embedding_provider: EmbeddingProviderType = "jina"
    embedding_dimension: int = 1024
    jina_api_key: str | None = None

    # LLM provider
    llm_provider: LLMProviderType = "fireworks"
    fireworks_api_key: str | None = None
    default_model: str = "llama-v3p1-70b-instruct"

    # Evaluation
    galileo_api_key: str | None = None
    galileo_console_url: str = "https://console.galileo.ai"
    eval_thresholds: dict[str, float] = field(default_factory=dict)

    # Project info
    project_name: str = "ccv3-hackathon"

    def __post_init__(self):
        """Load from environment if not provided."""
        # MongoDB
        if not self.mongodb_uri:
            self.mongodb_uri = os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")

        # Jina
        if not self.jina_api_key:
            self.jina_api_key = os.environ.get("JINA_API_KEY")

        # Fireworks
        if not self.fireworks_api_key:
            self.fireworks_api_key = os.environ.get("FIREWORKS_API_KEY")

        # Galileo
        if not self.galileo_api_key:
            self.galileo_api_key = os.environ.get("GALILEO_API_KEY")
        if os.environ.get("GALILEO_CONSOLE_URL"):
            self.galileo_console_url = os.environ.get("GALILEO_CONSOLE_URL")

    def get_embedding_service(self) -> EmbeddingService:
        """Get configured embedding service.

        Returns Jina by default for hackathon, with fallback chain.
        """
        # Try Jina first (hackathon priority)
        if self.embedding_provider == "jina" and self.jina_api_key:
            return EmbeddingService(
                provider="jina",
                dimension=self.embedding_dimension,
                task="retrieval.passage",
            )

        # Fallback to local embeddings
        return EmbeddingService(
            provider="local",
            model="BAAI/bge-large-en-v1.5",
        )

    def get_llm_provider(self) -> FireworksProvider:
        """Get configured LLM provider.

        Returns Fireworks by default for hackathon.
        """
        if not self.fireworks_api_key:
            raise ValueError("FIREWORKS_API_KEY required for LLM provider")

        return FireworksProvider(
            api_key=self.fireworks_api_key,
            default_model=self.default_model,
        )

    def get_openai_client(self) -> FireworksOpenAIClient:
        """Get OpenAI-compatible client (routes to Fireworks).

        Drop-in replacement for openai.AsyncOpenAI.
        """
        if not self.fireworks_api_key:
            raise ValueError("FIREWORKS_API_KEY required for OpenAI client")

        return FireworksOpenAIClient(api_key=self.fireworks_api_key)

    async def get_memory_backend(self) -> AtlasMemoryBackend:
        """Get configured memory backend.

        Returns Atlas by default for hackathon.
        """
        if self.memory_backend != "atlas":
            raise ValueError(f"Memory backend {self.memory_backend} not supported in hackathon mode")

        if not self.mongodb_uri:
            raise ValueError("MONGODB_URI or ATLAS_URI required for Atlas backend")

        backend = AtlasMemoryBackend(
            uri=self.mongodb_uri,
            db_name=self.atlas_db_name,
            embedding_dimension=self.embedding_dimension,
        )
        await backend.connect()
        return backend

    def get_evaluator(self) -> GalileoEvaluator:
        """Get configured Galileo evaluator.

        Works without API key (falls back to local heuristics).
        """
        return GalileoEvaluator(
            api_key=self.galileo_api_key,
            console_url=self.galileo_console_url,
            project_name=self.project_name,
            thresholds=self.eval_thresholds or None,
        )

    def get_quality_gate(
        self,
        metrics: list[str] | None = None,
        thresholds: dict[str, float] | None = None,
    ) -> QualityGate:
        """Get a quality gate for commit/deploy decisions."""
        evaluator = self.get_evaluator()
        return evaluator.create_quality_gate(
            metrics=metrics,
            thresholds=thresholds,
        )

    def validate(self) -> list[str]:
        """Validate configuration and return list of issues."""
        issues = []

        if self.memory_backend == "atlas" and not self.mongodb_uri:
            issues.append("MONGODB_URI or ATLAS_URI required for Atlas backend")

        if self.embedding_provider == "jina" and not self.jina_api_key:
            issues.append("JINA_API_KEY required for Jina embeddings (will fallback to local)")

        if self.llm_provider == "fireworks" and not self.fireworks_api_key:
            issues.append("FIREWORKS_API_KEY required for Fireworks LLM")

        if not self.galileo_api_key:
            issues.append("GALILEO_API_KEY not set (will use local heuristic evaluation)")

        return issues

    def print_status(self) -> None:
        """Print configuration status."""
        print("=" * 60)
        print("CCv3 Hackathon Configuration Status")
        print("=" * 60)

        print(f"\n📦 Memory Backend: {self.memory_backend}")
        print(f"   Atlas URI: {'✓ Set' if self.mongodb_uri else '✗ Not set'}")

        print(f"\n🧠 Embedding Provider: {self.embedding_provider}")
        print(f"   Jina API Key: {'✓ Set' if self.jina_api_key else '✗ Not set (fallback to local)'}")
        print(f"   Dimension: {self.embedding_dimension}")

        print(f"\n🤖 LLM Provider: {self.llm_provider}")
        print(f"   Fireworks API Key: {'✓ Set' if self.fireworks_api_key else '✗ Not set'}")
        print(f"   Default Model: {self.default_model}")

        print(f"\n📊 Evaluation: Galileo")
        print(f"   Galileo API Key: {'✓ Set' if self.galileo_api_key else '✗ Not set (local fallback)'}")

        issues = self.validate()
        if issues:
            print(f"\n⚠️  Issues ({len(issues)}):")
            for issue in issues:
                print(f"   - {issue}")
        else:
            print("\n✅ All configurations valid!")

        print("=" * 60)


# Global config instance
_config: HackathonConfig | None = None


def get_config() -> HackathonConfig:
    """Get the global hackathon configuration.

    Creates a new instance if not already initialized.
    """
    global _config
    if _config is None:
        _config = HackathonConfig()
    return _config


def set_config(config: HackathonConfig) -> None:
    """Set the global hackathon configuration."""
    global _config
    _config = config


def reset_config() -> None:
    """Reset the global configuration."""
    global _config
    _config = None
