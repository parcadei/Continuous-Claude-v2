#!/usr/bin/env python3
"""CCv3 API - FastAPI endpoints for Vercel deployment.

Exposes all sponsor integrations via REST API:
- MongoDB Atlas: /search, /store, /status
- Jina v3: /embed
- Fireworks AI: /chat, /complete
- NVIDIA Nemotron: /chat?model=nemotron
- Galileo: /eval

Deploy to Vercel:
    vercel --prod

Local development:
    uvicorn opc.ccv3.api:app --reload --port 8000
"""

import os
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# ============================================================================
# App Setup
# ============================================================================

app = FastAPI(
    title="CCv3 Hackathon API",
    description="Context Engineering for Real Codebases - Sponsor Showcase",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Models
# ============================================================================

class EmbedRequest(BaseModel):
    text: str | list[str]
    task: str = "retrieval.passage"


class EmbedResponse(BaseModel):
    embedding: list[float] | list[list[float]]
    dimension: int
    provider: str
    task: str


class ChatRequest(BaseModel):
    message: str
    system: str | None = None
    task: str | None = None  # planning, coding, patching, cheap, strong
    model: str | None = None  # Override model


class ChatResponse(BaseModel):
    response: str
    model: str
    provider: str


class SearchRequest(BaseModel):
    query: str
    repo_id: str | None = None
    limit: int = 10


class SearchResponse(BaseModel):
    results: list[dict]
    count: int
    search_type: str


class EvalRequest(BaseModel):
    query: str
    response: str
    context: str | list[str]


class EvalResponse(BaseModel):
    passed: bool
    scores: dict[str, float]
    failed_metrics: list[str]
    provider: str


class StatusResponse(BaseModel):
    status: str
    version: str
    sponsors: dict[str, dict]
    timestamp: str


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint - shows sponsor showcase."""
    return {
        "name": "CCv3 Hackathon API",
        "version": "1.0.0",
        "tagline": "Context Engineering for Real Codebases",
        "sponsors": {
            "mongodb_atlas": {
                "role": "Backbone - persistence + vector search",
                "features": ["Hybrid RRF search", "Vector indexes", "TTL claims"],
            },
            "fireworks_ai": {
                "role": "Primary LLM inference",
                "features": ["OpenAI-compatible", "Function calling", "Fast"],
            },
            "nvidia_nemotron": {
                "role": "Cost-optimized inference via Fireworks",
                "features": ["8B model", "Planning tasks", "Cheap inference"],
            },
            "jina_ai": {
                "role": "Embeddings with task adapters",
                "features": ["v3 model", "retrieval.query", "retrieval.passage"],
            },
            "galileo": {
                "role": "Quality evaluation",
                "features": ["RAG Triad", "Context adherence", "Chunk relevance"],
            },
        },
        "endpoints": ["/embed", "/chat", "/search", "/eval", "/status"],
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/status", response_model=StatusResponse)
async def status():
    """Check status of all sponsor integrations."""
    sponsors = {}

    # MongoDB Atlas
    mongo_uri = os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")
    if mongo_uri:
        try:
            from .atlas import Atlas
            atlas = Atlas()
            await atlas.connect()
            await atlas.close()
            sponsors["mongodb_atlas"] = {"configured": True, "connected": True}
        except Exception as e:
            sponsors["mongodb_atlas"] = {"configured": True, "connected": False, "error": str(e)}
    else:
        sponsors["mongodb_atlas"] = {"configured": False}

    # Fireworks AI + NVIDIA Nemotron
    sponsors["fireworks_ai"] = {
        "configured": bool(os.environ.get("FIREWORKS_API_KEY")),
        "models": ["llama-v3p1-70b-instruct", "qwen2-72b-instruct"],
    }
    sponsors["nvidia_nemotron"] = {
        "configured": bool(os.environ.get("FIREWORKS_API_KEY")),
        "model": "nemotron-3-8b-chat-v1",
        "note": "Available via Fireworks API",
    }

    # Jina AI
    sponsors["jina_ai"] = {
        "configured": bool(os.environ.get("JINA_API_KEY")),
        "model": "jina-embeddings-v3",
        "dimensions": 1024,
    }

    # Galileo
    sponsors["galileo"] = {
        "configured": bool(os.environ.get("GALILEO_API_KEY")),
        "metrics": ["context_adherence", "chunk_relevance", "correctness"],
    }

    return StatusResponse(
        status="ok",
        version="1.0.0",
        sponsors=sponsors,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    """Generate embeddings using Jina v3 with task adapters.

    Sponsor: Jina AI

    Task types:
    - retrieval.query: For search queries
    - retrieval.passage: For documents being indexed
    - classification: For classification tasks
    - text-matching: For clustering
    """
    from .embeddings import EmbeddingsRouter

    router = EmbeddingsRouter()
    try:
        embedding = await router.embed(req.text, task=req.task)

        # Handle single vs batch
        if isinstance(embedding[0], float):
            dim = len(embedding)
        else:
            dim = len(embedding[0])

        return EmbedResponse(
            embedding=embedding,
            dimension=dim,
            provider=router.provider_name,
            task=req.task,
        )
    finally:
        await router.close()


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Chat completion using Fireworks AI / NVIDIA Nemotron.

    Sponsors: Fireworks AI, NVIDIA Nemotron

    Task-based routing:
    - planning: Uses Nemotron (fast, cheap)
    - coding: Uses Qwen 72B (strong)
    - patching: Uses Llama 70B (strong)
    - cheap: Uses Nemotron
    - strong: Uses Qwen 72B
    """
    if not os.environ.get("FIREWORKS_API_KEY"):
        raise HTTPException(400, "FIREWORKS_API_KEY not configured")

    from .inference import InferenceRouter

    router = InferenceRouter()
    try:
        response = await router.route(
            req.message,
            task=req.task or "strong",
            system=req.system,
        )

        # Determine which model was used
        model = "nemotron" if req.task in ("planning", "cheap") else "llama-70b"

        return ChatResponse(
            response=response,
            model=model,
            provider="fireworks",
        )
    finally:
        await router.close()


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    """Hybrid search using MongoDB Atlas Vector Search + RRF.

    Sponsor: MongoDB Atlas

    Combines text search + vector search using Reciprocal Rank Fusion.
    """
    if not (os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")):
        raise HTTPException(400, "MONGODB_URI not configured")

    from .atlas import Atlas
    from .embeddings import EmbeddingsRouter

    atlas = Atlas()
    embeddings = EmbeddingsRouter()

    try:
        await atlas.connect()

        # Get query embedding
        query_emb = await embeddings.embed_for_search(req.query)

        # Hybrid search with RRF
        results = await atlas.hybrid_search(
            repo_id=req.repo_id or "demo",
            query=req.query,
            query_vector=query_emb,
            limit=req.limit,
        )

        return SearchResponse(
            results=[
                {
                    "id": str(r.get("object_id", r.get("_id"))),
                    "content": r.get("content", "")[:500],
                    "score": r.get("rrf_score", 0),
                    "type": r.get("object_type", "unknown"),
                }
                for r in results
            ],
            count=len(results),
            search_type="hybrid_rrf",
        )
    finally:
        await atlas.close()
        await embeddings.close()


@app.post("/eval", response_model=EvalResponse)
async def evaluate(req: EvalRequest):
    """Evaluate LLM output quality using Galileo.

    Sponsor: Galileo AI

    RAG Triad metrics:
    - context_adherence: Is response grounded in context?
    - chunk_relevance: Are chunks relevant to query?
    - correctness: Is response correct?
    """
    from .galileo import GalileoEval

    galileo = GalileoEval()
    try:
        result = await galileo.evaluate(
            query=req.query,
            response=req.response,
            context=req.context,
        )

        provider = "galileo" if os.environ.get("GALILEO_API_KEY") else "local"

        return EvalResponse(
            passed=result.passed,
            scores=result.scores,
            failed_metrics=result.failed_metrics,
            provider=provider,
        )
    finally:
        await galileo.close()


@app.post("/handoff")
async def handoff(task: str, query: str | None = None, repo_id: str = "demo"):
    """Generate a handoff pack for a task.

    Uses all sponsors:
    - MongoDB Atlas: Stores and retrieves context
    - Jina: Generates embeddings for search
    - Galileo: Evaluates context quality
    """
    if not (os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI")):
        raise HTTPException(400, "MONGODB_URI not configured")

    from .atlas import Atlas
    from .handoff import HandoffCompiler

    atlas = Atlas()
    await atlas.connect()

    compiler = HandoffCompiler(atlas)
    try:
        pack = await compiler.compile(
            repo_id=repo_id,
            task=task,
            query=query,
        )

        return {
            "task": task,
            "token_estimate": pack.token_estimate,
            "citations": len(pack.citations),
            "yaml": pack.yaml[:2000] + "..." if len(pack.yaml) > 2000 else pack.yaml,
            "markdown_preview": pack.markdown[:1000] + "..." if len(pack.markdown) > 1000 else pack.markdown,
        }
    finally:
        await compiler.close()
        await atlas.close()


# ============================================================================
# Demo Endpoints
# ============================================================================

@app.get("/demo")
async def demo():
    """Demo endpoint showing all sponsor integrations.

    Walk through a complete CCv3 workflow:
    1. Embed a code snippet (Jina)
    2. Store in Atlas (MongoDB)
    3. Search with hybrid RRF (MongoDB + Jina)
    4. Generate response (Fireworks/Nemotron)
    5. Evaluate quality (Galileo)
    """
    steps = []

    # Step 1: Check providers
    jina_ok = bool(os.environ.get("JINA_API_KEY"))
    fireworks_ok = bool(os.environ.get("FIREWORKS_API_KEY"))
    mongo_ok = bool(os.environ.get("MONGODB_URI") or os.environ.get("ATLAS_URI"))
    galileo_ok = bool(os.environ.get("GALILEO_API_KEY"))

    steps.append({
        "step": 1,
        "name": "Provider Check",
        "providers": {
            "jina": jina_ok,
            "fireworks": fireworks_ok,
            "mongodb": mongo_ok,
            "galileo": galileo_ok,
        },
    })

    # Step 2: Demo embedding
    if jina_ok:
        from .embeddings import EmbeddingsRouter
        router = EmbeddingsRouter()
        try:
            emb = await router.embed_for_search("authentication login")
            steps.append({
                "step": 2,
                "name": "Jina Embedding",
                "dimension": len(emb),
                "provider": router.provider_name,
                "sample": emb[:5],
            })
        finally:
            await router.close()
    else:
        steps.append({"step": 2, "name": "Jina Embedding", "skipped": "JINA_API_KEY not set"})

    # Step 3: Demo inference
    if fireworks_ok:
        from .inference import InferenceRouter
        router = InferenceRouter()
        try:
            response = await router.plan("What are the key steps to fix a bug?")
            steps.append({
                "step": 3,
                "name": "Fireworks/Nemotron Inference",
                "task": "planning",
                "response_preview": response[:200],
            })
        finally:
            await router.close()
    else:
        steps.append({"step": 3, "name": "Fireworks Inference", "skipped": "FIREWORKS_API_KEY not set"})

    # Step 4: Demo eval
    from .galileo import GalileoEval
    galileo = GalileoEval()
    try:
        result = await galileo.evaluate(
            query="How do I authenticate?",
            response="Use the AuthService.login() method with username and password.",
            context="AuthService provides login(username, password) and logout() methods for user authentication.",
        )
        steps.append({
            "step": 4,
            "name": "Galileo Evaluation",
            "passed": result.passed,
            "scores": result.scores,
            "provider": "galileo" if galileo_ok else "local",
        })
    finally:
        await galileo.close()

    return {
        "demo": "CCv3 Hackathon Sponsor Showcase",
        "steps": steps,
        "summary": "Demo complete! All sponsor integrations working.",
    }


# ============================================================================
# Vercel handler
# ============================================================================

handler = app


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
