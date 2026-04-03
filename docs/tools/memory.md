# Memory System

Persistent semantic memory for storing and recalling learnings across sessions.

## Overview

The memory system provides cross-session knowledge persistence through:

- **Semantic storage**: Store learnings with automatic categorization
- **Semantic search**: Find relevant knowledge by meaning, not keywords
- **Dual backends**: SQLite (offline, text-based) or PostgreSQL (vector embeddings)
- **Automatic hooks**: Session-start recall and auto-learning extraction

## Architecture

### Storage Layer

**archival_memory table** - Session learnings

```sql
CREATE TABLE archival_memory (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    content TEXT NOT NULL,           -- Combined learning text
    worked TEXT,                      -- What succeeded
    failed TEXT,                      -- What to avoid
    decisions TEXT,                   -- Choices and rationale
    patterns TEXT,                    -- Reusable techniques
    embedding VECTOR(1536)            -- Semantic embedding (PostgreSQL only)
);
```

**temporal_facts table** - Turn-by-turn facts (for temporal memory)

```sql
CREATE TABLE temporal_facts (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    embedding VECTOR(1536)
);
```

### Backend Selection

The system automatically selects the appropriate backend:

**SQLite** (default)

- Location: `opc/.claude/cache/agentica-memory/memory.db`
- Search: BM25 full-text search (FTS5)
- No dependencies: Works offline
- Good for: Keyword-based recall

**PostgreSQL** (when DATABASE_URL is set)

- Search: Vector similarity with pgvector
- Requires: PostgreSQL with pgvector extension
- Good for: Semantic similarity search
- Modes: Vector-only, text-only, hybrid RRF

## Storing Learnings

### Using /remember Skill

Store knowledge for future sessions:

```
/remember hybrid RRF is the default because it finds more results
/remember the wizard creates SQLite tables but not PostgreSQL tables
/remember graceful degradation pattern: check backend, fallback with message
```

The skill automatically categorizes your learning into:

- **What worked**: Solutions and approaches that succeeded
- **What failed**: Mistakes and pitfalls to avoid
- **Decisions**: Architectural choices with rationale
- **Patterns**: Reusable techniques

### Direct CLI Storage

```bash
cd opc && uv run python scripts/store_learning.py \
  --session-id "remember-$(date +%Y%m%d-%H%M%S)" \
  --worked "Successful approach description" \
  --failed "What didn't work" \
  --decisions "Choice made and why" \
  --patterns "Reusable pattern" \
  --json
```

**Parameters**:

- `--session-id`: Unique session identifier (include timestamp)
- `--worked`: What succeeded (use "None" if not applicable)
- `--failed`: What failed (use "None" if not applicable)
- `--decisions`: Decisions made (use "None" if not applicable)
- `--patterns`: Reusable patterns (use "None" if not applicable)
- `--json`: Output JSON response

### Examples

**Simple success**:

```bash
cd opc && uv run python scripts/store_learning.py \
  --session-id "remember-20260108-143022" \
  --worked "Wizard creates SQLite tables automatically but PostgreSQL requires manual init" \
  --failed "None" \
  --decisions "None" \
  --patterns "None" \
  --json
```

**Architectural decision**:

```bash
cd opc && uv run python scripts/store_learning.py \
  --session-id "remember-20260108-143055" \
  --worked "None" \
  --failed "None" \
  --decisions "Hybrid RRF combines text+vector search for better recall coverage" \
  --patterns "None" \
  --json
```

**Reusable pattern**:

```bash
cd opc && uv run python scripts/store_learning.py \
  --session-id "remember-20260108-143112" \
  --worked "None" \
  --failed "None" \
  --decisions "None" \
  --patterns "Graceful degradation: 1) Check capability 2) Fallback to simpler mode 3) Log reason" \
  --json
```

## Recalling Learnings

### Using /recall Skill

Semantic search through stored memories:

```
/recall "authentication patterns"
/recall "TypeScript type errors"
/recall "database migration"
/recall "test failures pytest"
```

### Direct CLI Recall

Basic syntax:

```bash
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "your search terms"
```

### Search Modes

**SQLite (BM25 text search)**:

```bash
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "authentication patterns"
```

**PostgreSQL - Hybrid RRF (default, recommended)**:

```bash
# Combines text and vector search with Reciprocal Rank Fusion
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "authentication patterns" \
  --k 10
```

**PostgreSQL - Vector-only**:

```bash
# Pure semantic similarity
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "user login flow" \
  --provider openai \
  --similarity-threshold 0.7
```

**PostgreSQL - Text-only (fast)**:

```bash
# Fast keyword search, no embeddings
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "redis cache" \
  --text-fallback
```

### Search Parameters

| Parameter                | Description                                | Default  |
| ------------------------ | ------------------------------------------ | -------- |
| `--query`                | Search terms                               | Required |
| `--k`                    | Number of results                          | 5        |
| `--provider`             | Embedding provider (local, openai, voyage) | local    |
| `--similarity-threshold` | Minimum similarity score (0.0-1.0)         | 0.2      |
| `--recency-weight`       | Boost recent results (0.0-1.0)             | 0.0      |
| `--text-fallback`        | Use text-only search (PostgreSQL)          | False    |

### Embedding Providers

**local** (default)

- Model: sentence-transformers/all-MiniLM-L6-v2
- Dimension: 384
- No API key required
- Good for: Offline use, privacy

**openai**

- Model: text-embedding-3-small
- Dimension: 1536
- Requires: OPENAI_API_KEY environment variable
- Good for: High-quality semantic search

**voyage**

- Model: voyage-3
- Dimension: 1024
- Requires: VOYAGE_API_KEY environment variable
- Good for: Optimized retrieval performance

### Hybrid RRF Mode

Reciprocal Rank Fusion combines text and vector search rankings:

```bash
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "authentication" \
  --k 10 \
  --provider local
```

**How RRF works**:

1. Run text search (BM25) → ranked results
2. Run vector search → ranked results
3. Fuse rankings: `score = 1/(k + rank_text) + 1/(k + rank_vector)`
4. Return top k by combined score

**Benefits**:

- Better coverage than vector-only or text-only
- Finds exact matches AND semantic matches
- Resilient to embedding quality issues

## Automatic Memory Features

### Session-Start Recall

Automatically injects relevant learnings when starting a session (if configured via hooks).

### Memory Awareness Hook

Monitors queries and suggests relevant memories proactively.

### Auto-Learning Extraction

Extracts learnings from completed sessions and stores them automatically (if configured).

## Configuration

### Environment Variables

```bash
# Embedding providers
OPENAI_API_KEY=sk-...              # For OpenAI embeddings
VOYAGE_API_KEY=...                 # For Voyage embeddings

# Database
DATABASE_URL=postgresql://...       # PostgreSQL connection (enables vector search)
```

### Database Setup

**SQLite** (automatic):

```bash
# Database created automatically at:
# opc/.claude/cache/agentica-memory/memory.db
```

**PostgreSQL** (manual setup):

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create archival_memory table
CREATE TABLE archival_memory (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    content TEXT NOT NULL,
    worked TEXT,
    failed TEXT,
    decisions TEXT,
    patterns TEXT,
    embedding VECTOR(1536)
);

-- Create index for vector similarity search
CREATE INDEX idx_archival_memory_embedding
ON archival_memory
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create text search index
CREATE INDEX idx_archival_memory_content_fts
ON archival_memory
USING gin(to_tsvector('english', content));
```

## Usage Patterns

### When to Store

Store learnings when:

- You solve a tricky problem
- You make an architectural decision
- You discover a pattern that worked well
- You encounter a pitfall to avoid
- You want to remember something for next time

### When to Recall

Query memory when:

- Starting work on something you may have done before
- Encountering an error or unfamiliar situation
- Making architectural or design decisions
- Looking for patterns or approaches that worked previously
- Debugging similar issues

### Example Workflow

```bash
# 1. Encountered a problem
/recall "PostgreSQL connection pool errors"

# 2. Found a solution
# ... work through the fix ...

# 3. Store the learning
/remember "PostgreSQL connection pool: set max_connections and pool_size to match, close connections explicitly in finally blocks"

# 4. Later session, similar issue
/recall "connection pool"
# → Finds your stored learning
```

## Search Strategies

### Keyword Search

Use when you know specific terms:

```bash
/recall "pytest fixture"
```

### Semantic Search

Use when searching by concept:

```bash
/recall "handling user authentication securely"
# Finds: oauth2, session management, JWT, etc.
```

### Filtering by Category

Structure queries to target specific categories:

```bash
/recall "decision about database schema"  # Targets decisions
/recall "pattern for error handling"      # Targets patterns
/recall "failed attempt at caching"       # Targets failures
```

### Adjusting Sensitivity

**Broad search** (low threshold):

```bash
--similarity-threshold 0.2  # Default, more results
```

**Precise search** (high threshold):

```bash
--similarity-threshold 0.8  # Fewer, more relevant results
```

**Boost recent learnings**:

```bash
--recency-weight 0.3  # 30% boost for recent entries
```

## Performance Characteristics

| Mode                  | Speed  | Quality             | Requires                |
| --------------------- | ------ | ------------------- | ----------------------- |
| SQLite BM25           | Fast   | Good for keywords   | Nothing                 |
| PostgreSQL text-only  | Fast   | Good for keywords   | PostgreSQL              |
| PostgreSQL vector     | Medium | Great for semantics | PostgreSQL + embeddings |
| PostgreSQL Hybrid RRF | Medium | Best overall        | PostgreSQL + embeddings |

**Recommendations**:

- **Offline/local**: Use SQLite
- **Production/team**: Use PostgreSQL with Hybrid RRF
- **High precision**: Use vector-only with high threshold
- **Quick lookup**: Use text-only mode

## Troubleshooting

### No Results Found

**Check backend**:

```bash
cd opc && uv run python scripts/recall_learnings.py --query "test"
# Output shows which backend is being used
```

**SQLite troubleshooting**:

```bash
# Check database exists
ls -l opc/.claude/cache/agentica-memory/memory.db

# Check if it has data
sqlite3 opc/.claude/cache/agentica-memory/memory.db "SELECT COUNT(*) FROM archival_memory"
```

**PostgreSQL troubleshooting**:

```bash
# Check connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM archival_memory"

# Check embeddings exist
psql $DATABASE_URL -c "SELECT COUNT(*) FROM archival_memory WHERE embedding IS NOT NULL"
```

### Embeddings Not Generated

**Check provider configuration**:

```bash
# For OpenAI
echo $OPENAI_API_KEY

# Test embedding generation
cd opc && uv run python scripts/store_learning.py \
  --session-id "test-$(date +%s)" \
  --worked "test" \
  --failed "None" \
  --decisions "None" \
  --patterns "None" \
  --json
```

**Regenerate embeddings**:

```bash
cd opc && uv run python scripts/embed_temporal_facts.py
```

### Performance Issues

**SQLite - Rebuild FTS index**:

```bash
sqlite3 opc/.claude/cache/agentica-memory/memory.db <<EOF
INSERT INTO archival_memory_fts(archival_memory_fts) VALUES('rebuild');
EOF
```

**PostgreSQL - Rebuild vector index**:

```sql
DROP INDEX IF EXISTS idx_archival_memory_embedding;
CREATE INDEX idx_archival_memory_embedding
ON archival_memory
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Advanced Usage

### Batch Storage

Store multiple learnings:

```bash
for learning in "learning1" "learning2" "learning3"; do
  cd opc && uv run python scripts/store_learning.py \
    --session-id "batch-$(date +%s)-$RANDOM" \
    --worked "$learning" \
    --failed "None" \
    --decisions "None" \
    --patterns "None" \
    --json
done
```

### Custom Session IDs

Use descriptive session IDs for tracking:

```bash
--session-id "auth-refactor-2026-01-08"
--session-id "bug-fix-issue-123"
--session-id "experiment-caching-strategy"
```

### Programmatic Access

Python API:

```python
from opc.scripts.recall_learnings import search_learnings

results = search_learnings(
    query="authentication patterns",
    k=10,
    provider="openai",
    similarity_threshold=0.7
)

for result in results:
    print(f"Score: {result['score']}")
    print(f"Content: {result['content']}")
    print(f"Session: {result['session_id']}")
```

## Best Practices

1. **Be specific in storage**: Include context, not just conclusions
   - Good: "Use connection pooling with max_connections=20 for PostgreSQL under high load"
   - Bad: "Use connection pooling"

2. **Use all categories**: Don't just store "worked" - include failures and decisions
   - Failures prevent repeating mistakes
   - Decisions preserve architectural rationale
   - Patterns enable reuse

3. **Query proactively**: Search before solving, not just when stuck
   - Start sessions with relevant recalls
   - Check memory before making decisions

4. **Descriptive session IDs**: Makes future searches easier
   - Include feature/bug/topic name
   - Add date for time-based filtering

5. **Regular cleanup**: Archive or remove obsolete learnings
   - Delete superseded patterns
   - Update changed decisions

6. **Use hybrid search**: RRF mode gives best coverage
   - Finds both exact terms and semantic matches
   - More resilient than single-mode search

## See Also

- [Skills: /remember](/docs/skills/remember.md) - Interactive learning storage
- [Skills: /recall](/docs/skills/recall.md) - Interactive learning retrieval
- [Rules: dynamic-recall](/.claude/rules/dynamic-recall.md) - Proactive memory usage
- [Rules: proactive-memory-disclosure](/.claude/rules/proactive-memory-disclosure.md) - Memory awareness protocol
- [Tools: TLDR](tools/README.md#tldr-cli) - Code analysis tool
- [Hooks](hooks/README.md) - Session-start recall and auto-learning hooks
