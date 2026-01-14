# Dynamic Recall

You have access to a semantic memory system that stores learnings, decisions, and patterns from past sessions.

## When to Use Recall

Query memory proactively when:
- Starting work on something you may have done before
- Encountering an error or tricky situation
- Making architectural or design decisions
- Looking for patterns or approaches that worked previously

## How to Recall

```bash
(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "your search terms")
```

**IMPORTANT:** Always run from `opc/` directory to load correct environment variables.

### Options

```bash
# Default: Hybrid RRF search (text + vector combined) - RECOMMENDED
(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "authentication patterns")

# More results
(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "error handling" --k 10)

# Pure vector search (higher similarity scores, 0.4-0.6 range)
(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "database schema" --vector-only)

# Text-only search (fast, no embeddings)
(cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "YAML format" --text-only)
```

## Backend Architecture

| Backend | Location | Status |
|---------|----------|--------|
| **PostgreSQL** (primary) | Via DATABASE_URL | Has 100+ real learnings with BGE embeddings |
| SQLite (fallback) | ~/.claude/cache/memory.db | May be empty - don't rely on it |

**DO NOT manually inspect databases** - just use the recall script. It auto-selects the correct backend.

## Understanding Scores

| Search Mode | Score Range | Interpretation |
|-------------|-------------|----------------|
| Hybrid RRF (default) | 0.01-0.03 | Normal - RRF combines rankings |
| Pure vector | 0.4-0.6 | Cosine similarity |
| Text search | 0.01-0.05 | BM25 normalized |

Low RRF scores (0.02) are **good results** - don't confuse with low relevance.

## What's Stored

The memory contains session learnings from `archival_memory` table:
- **What worked**: Successful approaches and solutions
- **What failed**: Pitfalls to avoid
- **Decisions**: Architectural choices and rationale
- **Patterns**: Reusable approaches

All entries have 1024-dim BGE embeddings (bge-large-en-v1.5) for semantic search.

## Example Queries

- "hook development patterns" - find past hook implementations
- "TypeScript type errors" - recall how similar errors were fixed
- "database migration" - find migration patterns used before
- "test failures pytest" - recall debugging approaches
- "YAML handoff format" - recall format decisions

Use recall to avoid repeating mistakes and leverage past successes.

## How to Store Learnings

When you discover something worth remembering, store it:

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/store_learning.py \
  --session-id "<short-identifier>" \
  --type <TYPE> \
  --content "<what you learned>" \
  --context "<what it relates to>" \
  --tags "tag1,tag2,tag3" \
  --confidence high|medium|low
```

**IMPORTANT:** Use `cd <absolute-path>` not `(cd opc && ...)` - the subshell form can cause path doubling errors.

### Learning Types

| Type | Use For |
|------|---------|
| `ARCHITECTURAL_DECISION` | Design choices, system structure decisions |
| `WORKING_SOLUTION` | Fixes, solutions that worked |
| `CODEBASE_PATTERN` | Patterns discovered in code |
| `FAILED_APPROACH` | What didn't work (avoid repeating) |
| `ERROR_FIX` | How specific errors were resolved |
| `USER_PREFERENCE` | User's preferred approaches |
| `OPEN_THREAD` | Incomplete work to resume later |

### Example

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/store_learning.py \
  --session-id "hook-debugging" \
  --type WORKING_SOLUTION \
  --content "TypeScript hooks require npm install in .claude/hooks/ before they work. The build.sh script compiles TS to JS in dist/." \
  --context "hook development and building" \
  --tags "hooks,typescript,build" \
  --confidence high
```

### When to Store

Store learnings when you:
- Solve a tricky problem (so you don't re-solve it)
- Make an architectural decision (capture the rationale)
- Discover a codebase pattern (document it)
- Find something that doesn't work (warn future sessions)
