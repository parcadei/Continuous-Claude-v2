# TLDR-Code: Advanced Features Reference

---

## Extended CLI Flags

Flag variants not shown in the main SKILL.md quick reference.

### Navigation Flags

```bash
tldr tree . --show-hidden           # Include hidden files
tldr structure src/ --max 100       # Max files to analyze
```

### Search Flags

```bash
tldr search "class.*Error" . --ext .py  # Filter by extension
tldr search "func" . --max 50           # Limit results
```

### Extract Flags

```bash
tldr extract src/api.py --class UserService      # Filter to class
tldr extract src/api.py --method UserService.get  # Filter to method
```

### Context Flags

```bash
tldr context UserService.create --project . --lang typescript  # Specify language
```

### Slice Flags

```bash
tldr slice src/processor.py process_data 42 --direction forward  # Forward slice
```

### Impact Flags

```bash
tldr impact authenticate . --file auth  # Filter by file pattern
```

### Dead Code Flags

```bash
tldr dead . --lang typescript  # Specify language
```

### Architecture Flags

```bash
tldr arch src/ --lang python  # Specify language
```

### Import Flags

```bash
tldr imports src/api.ts --lang typescript        # Specify language
tldr importers UserService . --lang typescript   # Reverse lookup with lang
```

---

## Daemon (Faster Queries)

The daemon holds indexes in memory for instant repeated queries.

### Daemon Commands

```bash
# Start daemon (backgrounds automatically)
tldr daemon start
tldr daemon start --project /path/to/project

# Check status
tldr daemon status

# Stop daemon
tldr daemon stop

# Send raw command
tldr daemon query ping
tldr daemon query status

# Notify file change (for hooks)
tldr daemon notify <file>
tldr daemon notify src/api.py
```

### Daemon Features

| Feature | Description |
|---------|-------------|
| Auto-shutdown | 30 minutes idle |
| Query caching | SalsaDB memoization |
| Content hashing | Skip unchanged files |
| Dirty tracking | Incremental re-indexing |
| Cross-platform | Unix sockets / Windows TCP |

### Daemon Socket Protocol

Send JSON to socket, receive JSON response:

```json
// Request
{"cmd": "search", "pattern": "process", "max_results": 10}

// Response
{"status": "ok", "results": [...]}
```

**All 22 daemon commands:**
```
ping, status, shutdown, search, extract, impact, dead, arch,
cfg, dfg, slice, calls, warm, semantic, tree, structure,
context, imports, importers, notify, diagnostics, change_impact
```

---

## Semantic Search (P6)

Natural language code search using embeddings.

### Setup

```bash
# Build index (downloads model on first run)
tldr semantic index .

# Default model: bge-large-en-v1.5 (1.3GB, best quality)
# Smaller model: all-MiniLM-L6-v2 (80MB, faster)
tldr semantic index . --model all-MiniLM-L6-v2
```

### Search

```bash
tldr semantic search "authentication flow"
tldr semantic search "error handling patterns" --k 10
tldr semantic search "database connection" --expand  # Follow call graph
```

### Configuration

In `.claude/settings.json`:
```json
{
  "semantic_search": {
    "enabled": true,
    "auto_reindex_threshold": 20,
    "model": "bge-large-en-v1.5"
  }
}
```

---

## Python API

```python
from tldr.api import (
    # L1: AST
    extract_file, extract_functions, get_imports,
    # L2: Call Graph
    build_project_call_graph, get_intra_file_calls,
    # L3: CFG
    get_cfg_context,
    # L4: DFG
    get_dfg_context,
    # L5: PDG
    get_slice, get_pdg_context,
    # Unified
    get_relevant_context,
    # Analysis
    analyze_dead_code, analyze_architecture, analyze_impact,
)

# Example: Get context for LLM
ctx = get_relevant_context("src/", "main", depth=2, language="python")
print(ctx.to_llm_string())
```

---

## Languages Supported

| Language | AST | Call Graph | CFG | DFG | PDG |
|----------|-----|------------|-----|-----|-----|
| Python | Yes | Yes | Yes | Yes | Yes |
| TypeScript | Yes | Yes | Yes | Yes | Yes |
| JavaScript | Yes | Yes | Yes | Yes | Yes |
| Go | Yes | Yes | Yes | Yes | Yes |
| Rust | Yes | Yes | Yes | Yes | Yes |
| Java | Yes | Yes | - | - | - |
| C/C++ | Yes | Yes | - | - | - |
| Ruby | Yes | - | - | - | - |
| PHP | Yes | - | - | - | - |
| Kotlin | Yes | - | - | - | - |
| Swift | Yes | - | - | - | - |
| C# | Yes | - | - | - | - |
| Scala | Yes | - | - | - | - |
| Lua | Yes | - | - | - | - |
| Elixir | Yes | - | - | - | - |

---

## Ignore Patterns

TLDR respects `.tldrignore` (gitignore syntax):

```gitignore
# .tldrignore
.venv/
__pycache__/
node_modules/
*.min.js
dist/
```

First run creates `.tldrignore` with sensible defaults.
Use `--no-ignore` to bypass.

---

## Caching

```bash
# Pre-build call graph cache
tldr warm <path>
tldr warm src/ --lang python
tldr warm . --background                  # Build in background

# Build semantic index (one-time)
tldr semantic index [path]
tldr semantic index . --lang python
tldr semantic index . --model all-MiniLM-L6-v2  # Smaller model (80MB)
```

---

## Token Savings Evidence

```
Raw file read:    23,314 tokens
TLDR all layers:   1,189 tokens
─────────────────────────────────
Savings:              95%
```

The insight: Call graph navigates to relevant code, then layers give structured summaries. You don't read irrelevant code.
