---
name: memory
description: Query and store learnings in the persistent memory system
user-invocable: true
---

# Memory System

Unified interface for storing and retrieving learnings across sessions.

## When to Use

- "What did we do before with X?"
- "Remember this for next time"
- Starting work similar to past sessions
- Looking for patterns that worked/failed
- Debugging recurring issues

---

## Recall (Query Memory)

### Quick Usage
```
/recall <query>
```

### Examples
```bash
# Semantic search
/recall hook development patterns
/recall TypeScript errors
/recall wizard installation

# With options
/recall hook patterns --k 10 --vector-only
```

### Execution
```bash
cd $CLAUDE_PROJECT_DIR/opc && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "<QUERY>" --k 5
```

### Options
| Flag | Description |
|------|-------------|
| `--k N` | Return N results (default: 5) |
| `--vector-only` | Pure vector search (higher precision) |
| `--text-only` | Text search only (faster) |

### Output Format
```
## Memory Recall: "<query>"

### 1. [TYPE] (confidence: high, id: abc123)
<full content>

### 2. [TYPE] (confidence: medium, id: def456)
<full content>
```

---

## Remember (Store Learning)

### Quick Usage
```
/remember <what you learned>
```

### With Explicit Type
```
/remember --type WORKING_SOLUTION <what you learned>
```

### Examples
```bash
/remember TypeScript hooks require npm install before they work
/remember --type ARCHITECTURAL_DECISION Session affinity uses terminal PID
/remember --type FAILED_APPROACH Don't use subshell for store_learning command
```

### Learning Types

| Type | Use For |
|------|---------|
| `WORKING_SOLUTION` | Fixes, solutions that worked (default) |
| `ARCHITECTURAL_DECISION` | Design choices, system structure |
| `CODEBASE_PATTERN` | Patterns discovered in code |
| `FAILED_APPROACH` | What didn't work |
| `ERROR_FIX` | Specific error resolutions |
| `USER_PREFERENCE` | User's preferred approaches |
| `OPEN_THREAD` | Incomplete work to resume |

### Execution
```bash
cd $CLAUDE_PROJECT_DIR/opc && PYTHONPATH=. uv run python scripts/core/store_learning.py \
  --session-id "manual-$(date +%Y%m%d-%H%M)" \
  --type <TYPE or WORKING_SOLUTION> \
  --content "<CONTENT>" \
  --context "manual entry via /remember" \
  --confidence medium
```

### Auto-Type Detection
If no `--type` specified, infer from content:
- Contains "error", "fix", "bug" → ERROR_FIX
- Contains "decided", "chose", "architecture" → ARCHITECTURAL_DECISION
- Contains "pattern", "always", "convention" → CODEBASE_PATTERN
- Contains "failed", "didn't work", "don't" → FAILED_APPROACH
- Default → WORKING_SOLUTION

---

## Recall Reasoning (Artifact Index)

Search artifact index for handoffs, plans, and post-mortems.

### When to Use
- Find what worked/failed in past sessions
- Look up architectural decisions
- Review post-mortems from completed work

### Usage
```bash
uv run python scripts/artifact_query.py "<query>" [--outcome SUCCEEDED|FAILED] [--limit N]
```

### Examples
```bash
# Search for auth work
uv run python scripts/artifact_query.py "authentication OAuth"

# Only successful approaches
uv run python scripts/artifact_query.py "implement agent" --outcome SUCCEEDED

# What failed (avoid repeating)
uv run python scripts/artifact_query.py "hook implementation" --outcome FAILED
```

### Interpreting Results
- `✓` = SUCCEEDED (follow this pattern)
- `✗` = FAILED (avoid this pattern)
- `?` = UNKNOWN (not yet marked)

---

## Memory Architecture

| Component | Purpose |
|-----------|---------|
| PostgreSQL | Primary storage with pgvector |
| BGE Embeddings | 1024-dim vectors (bge-large-en-v1.5) |
| Hybrid Search | RRF combining text + vector |
| Artifact Index | Handoffs/plans with post-mortems |

### Score Interpretation

| Search Mode | Score Range | Meaning |
|-------------|-------------|---------|
| Hybrid RRF (default) | 0.01-0.03 | Good (RRF ranking) |
| Vector-only | 0.4-0.6 | Cosine similarity |
| Text-only | 0.01-0.05 | BM25 normalized |

**Note:** Low RRF scores (0.02) are GOOD - it's a ranking fusion metric.

---

## Proactive Memory Usage

### Before Starting Work
```bash
/recall <task keywords>
```

### After Solving Problems
```bash
/remember <what worked and why>
```

### Before Similar Tasks
Check artifact index for past approaches that succeeded or failed.
