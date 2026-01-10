# CCv3 Hackathon Edition - Sponsor Integration Guide

This document explains the sponsor integrations for the hackathon.

## Quick Start

```bash
# 1. Install hackathon dependencies
cd opc
uv sync --extra hackathon

# 2. Configure environment
cp .env.hackathon.example .env
# Edit .env with your API keys

# 3. Run the demo dashboard
uvicorn scripts.hackathon_dashboard:app --reload --port 8080

# 4. Open http://localhost:8080
```

## Architecture

```
           ┌───────────────────────────────────────────────────────┐
           │                    Developer / Agent                   │
           │   CLI: /build /fix /premortem /handoff /query          │
           └───────────────────────────┬───────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CCv3 Daemon (Local)                                  │
│  - file watcher + incremental indexer                                    │
│  - graph builder: AST, call graph, CFG, DFG, PDG                         │
│  - handoff compiler: YAML/MD bundles w/ citations                         │
│  - orchestrator: plan → patch → validate → eval → commit                 │
│  - session manager: file claims + worktrees                              │
└───────────────┬───────────────────────────────────────────────────┬─────┘
                │                                                   │
                ▼                                                   ▼
   ┌────────────────────────┐                   ┌──────────────────────────────┐
   │ MongoDB Atlas (P0)      │                   │ Model Providers (P0/P1)       │
   │ - artifacts + runs      │                   │ - Fireworks (default)         │
   │ - vector search         │                   │ - NVIDIA Nemotron (alt)       │
   │ - queries + retrieval   │                   │ - Jina Embeddings (v3)        │
   └─────────────┬──────────┘                   └───────────────┬──────────────┘
                 │                                               │
                 ▼                                               ▼
        ┌──────────────────┐                          ┌─────────────────────────┐
        │ Galileo (P0)      │                          │ Tooling / Validation     │
        │ - eval suites     │                          │ - typecheck/lint hooks   │
        │ - traces/results  │                          │ - tests, format, build   │
        └──────────────────┘                          └─────────────────────────┘
```

## Sponsor Integrations

### P0: MongoDB Atlas (Memory Backend)

**File:** `opc/scripts/core/db/atlas_backend.py`

**Features:**
- Document storage for handoffs, runs, learnings
- Atlas Vector Search for semantic retrieval
- Session tracking and file claims
- Change Streams for real-time sync

**Usage:**
```python
from scripts.core.db.atlas_backend import AtlasMemoryBackend

backend = AtlasMemoryBackend()
await backend.connect()

# Store learning with embedding
memory_id = await backend.store(
    content="Important finding",
    metadata={"type": "session_learning"},
    embedding=[0.1, 0.2, ...]
)

# Vector search
results = await backend.vector_search(
    query_embedding=[0.1, 0.2, ...],
    limit=10
)
```

**Setup Vector Search Index:**
1. Go to Atlas UI → Your Cluster → Search
2. Create Index with:
   - Index Name: `vector_index`
   - Collection: `archival_memory`
   - Field: `embedding` (vector, 1024 dims)
   - Similarity: `cosine`

---

### P0: Fireworks AI (LLM Inference)

**File:** `opc/scripts/core/db/fireworks_provider.py`

**Features:**
- OpenAI-compatible API
- 4x lower latency than vLLM
- Multiple models (Llama, Qwen, DeepSeek, Mixtral)
- Streaming support

**Usage:**
```python
from scripts.core.db.fireworks_provider import FireworksProvider

provider = FireworksProvider()

# Chat completion
response = await provider.chat_completion(
    messages=[{"role": "user", "content": "Hello!"}],
    model="llama-v3p1-70b-instruct"
)

# Streaming
async for chunk in provider.chat_completion_stream(messages=...):
    print(chunk)
```

**OpenAI Drop-in Replacement:**
```python
from scripts.core.db.fireworks_provider import FireworksOpenAIClient

client = FireworksOpenAIClient()
response = await client.chat.completions.create(
    model="llama-v3p1-70b-instruct",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

### P0: Galileo AI (Evaluation Gates)

**File:** `opc/scripts/core/db/galileo_eval.py`

**Features:**
- 20+ built-in metrics (groundedness, relevance, safety)
- Quality gates for commit decisions
- Agentic evaluations for multi-step workflows
- Local fallback when API unavailable

**Usage:**
```python
from scripts.core.db.galileo_eval import GalileoEvaluator

evaluator = GalileoEvaluator()

# Evaluate response
result = await evaluator.evaluate(
    input="What is the capital of France?",
    output="The capital of France is Paris.",
    context="France is a country in Western Europe."
)

if result.passes_threshold():
    print("✓ Commit approved")
else:
    print(f"✗ Failed: {result.failed_metrics}")
```

**Quality Gate:**
```python
gate = evaluator.create_quality_gate(
    metrics=["groundedness", "factuality"],
    thresholds={"groundedness": 0.8}
)

result = await gate.check(input="...", output="...")
if result.passed:
    # Proceed with commit
```

---

### P1: Jina Embeddings v3

**File:** `opc/scripts/core/db/jina_embeddings.py`

**Features:**
- Task-specific LoRA adapters
- Matryoshka dimensions (32-1024)
- 89 language support
- 8192 token context

**Usage:**
```python
from scripts.core.db.embedding_service import EmbeddingService

# Via unified service
embedder = EmbeddingService(provider="jina", dimension=1024)
embedding = await embedder.embed("Hello world")

# Task-specific
embedder = EmbeddingService(
    provider="jina",
    task="retrieval.query"  # for queries
)
query_emb = await embedder.embed("search query")

# retrieval.passage for documents (default)
```

---

### P1: NVIDIA Nemotron (via Fireworks)

NVIDIA models are available through Fireworks AI.

**Usage:**
```python
from scripts.core.db.fireworks_provider import FireworksProvider

provider = FireworksProvider(
    default_model="accounts/nvidia/models/nemotron-3-8b-chat-hf"
)
```

---

## Unified Configuration

**File:** `opc/scripts/core/db/hackathon_config.py`

```python
from scripts.core.db.hackathon_config import get_config

config = get_config()

# Print status of all integrations
config.print_status()

# Get configured services
embedder = config.get_embedding_service()
llm = config.get_llm_provider()
memory = await config.get_memory_backend()
evaluator = config.get_evaluator()

# OpenAI-compatible client
client = config.get_openai_client()
```

---

## Demo Dashboard

**File:** `opc/scripts/hackathon_dashboard.py`

**Run:**
```bash
uvicorn scripts.hackathon_dashboard:app --reload --port 8080
```

**Features:**
- Provider status badges
- Real-time run history
- Evaluation results
- Token savings metrics
- TLDR demo visualization

---

## Demo Script (3-5 minutes)

1. **"Repo is huge. Raw code is 23k tokens. We don't feed raw code."**
   ```bash
   tldr structure src/
   ```

2. **"What affects line 42?"**
   ```bash
   tldr slice src/main.py main 42
   ```

3. **Generate handoff to Atlas**
   ```bash
   # Shows handoff being stored in MongoDB Atlas
   ```

4. **Run /fix workflow**
   ```bash
   /fix bug --description "Auth failing on Safari"
   # Watch: sleuth → premortem → kraken → test → eval → commit
   ```

5. **Galileo eval gate**
   ```bash
   # Show eval fail → fix → eval pass
   ```

6. **Provider swap**
   ```bash
   # --provider fireworks vs --provider nvidia
   ```

7. **Close**
   - "This is compounding sessions. Context compounds, not token spam."

---

## Files Created

```
opc/scripts/core/db/
├── atlas_backend.py      # MongoDB Atlas memory backend
├── fireworks_provider.py # Fireworks AI LLM provider
├── jina_embeddings.py    # Jina Embeddings v3 adapter
├── galileo_eval.py       # Galileo AI evaluation gates
└── hackathon_config.py   # Unified configuration

opc/scripts/
└── hackathon_dashboard.py # FastAPI demo dashboard

opc/
├── .env.hackathon.example # Environment template
└── pyproject.toml         # Updated with hackathon extras
```

---

## Sources

- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [Fireworks AI Docs](https://docs.fireworks.ai/)
- [Jina Embeddings v3](https://jina.ai/embeddings/)
- [Galileo AI Docs](https://docs.galileo.ai/)
- [NVIDIA Nemotron](https://developer.nvidia.com/nemotron)
