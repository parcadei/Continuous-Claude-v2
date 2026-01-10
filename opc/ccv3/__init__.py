"""CCv3 Hackathon Edition - Continuous Context Engineering for Real Codebases.

A daemon + CLI that turns a repo into structured, queryable "context layers"
(AST → call graph → control/data flow → PDG → handoff packs), then lets an
LLM agent reliably build/fix/ship with fast retrieval, evals, and guardrails.

Sponsors:
- MongoDB Atlas: Backbone for all persistence + Vector Search
- Fireworks AI: Default LLM inference provider
- NVIDIA Nemotron: Alternative model path via Fireworks
- Jina AI: Embeddings (v3 with task adapters)
- Galileo AI: Evaluation harness + quality gates
"""

__version__ = "1.0.0"

# Export all components
from .atlas import Atlas
from .embeddings import JinaEmbeddings, EmbeddingsRouter
from .inference import InferenceLLM, InferenceRouter, NemotronLLM
from .galileo import GalileoEval, QualityGate, EvalResult
from .handoff import HandoffCompiler, HandoffLoader, HandoffPack

__all__ = [
    # Atlas backbone
    "Atlas",
    # Embeddings
    "JinaEmbeddings",
    "EmbeddingsRouter",
    # Inference
    "InferenceLLM",
    "InferenceRouter",
    "NemotronLLM",
    # Evaluation
    "GalileoEval",
    "QualityGate",
    "EvalResult",
    # Handoff
    "HandoffCompiler",
    "HandoffLoader",
    "HandoffPack",
]
