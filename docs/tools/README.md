# CLI Tools and Integrations

Built-in tools for code analysis, formal verification, memory management, and external integrations.

## Deep-Dive Documentation

- [TLDR Code Analysis](tldr.md) - 5-layer analysis, CLI reference, Python API
- [Math and Formal Verification](math.md) - /prove, SymPy, Z3, Pint, Shapely
- [Memory System](memory.md) - Semantic recall, storage backends, hooks

## Overview

The workspace provides four categories of tools:

1. **TLDR CLI** - Token-efficient code analysis
2. **Formal Verification** - Lean 4 theorem proving with /prove
3. **Memory System** - Cross-session learning storage and recall
4. **MCP Integrations** - External tool servers (ast-grep, firecrawl, etc.)

## TLDR CLI

Token-efficient code analysis tool that provides structured insights with 95% token savings.

### Core Commands

```bash
# Project structure
tldr tree [path]                    # File tree with optional extension filter
tldr structure [path] --lang <lang> # Code structure (functions, classes, imports)
tldr extract <file>                 # Full file info with metadata

# Search and context
tldr search <pattern> [path]        # Structured search results
tldr context <entry> --project .    # LLM-ready context for a function/class
```

### Flow Analysis

```bash
# Control and data flow
tldr cfg <file> <function>          # Control flow graph (branches, complexity)
tldr dfg <file> <function>          # Data flow graph (variable dependencies)
tldr slice <file> <func> <line>     # Program slice (what affects this line)
tldr calls [path]                   # Cross-file call graph
```

### Codebase Analysis

```bash
# Advanced analysis
tldr impact <func> [path]           # Reverse call graph (who calls this?)
tldr dead [path]                    # Find unreachable/dead code
tldr arch [path]                    # Detect architectural layers
```

**Impact Analysis**: Before refactoring, check what would break

```bash
tldr impact process_data src/ --depth 3 --file "*.py"
```

**Dead Code Detection**: Find unused functions for cleanup

```bash
tldr dead src/ --entry main cli test_
```

**Architecture Detection**: Understand layer structure

```bash
tldr arch src/
# Output:
# - Entry layer: controllers, handlers
# - Middle layer: services, business logic
# - Leaf layer: utilities, helpers
# - Circular dependencies (if any)
```

### Supported Languages

- Python
- TypeScript
- Go
- Rust

### Example Workflow

```bash
# 1. Get project overview
tldr tree src/ --ext .py

# 2. Find relevant code
tldr search "authentication" src/

# 3. Get context for a function (includes dependencies)
tldr context authenticate --project src/ --depth 2

# 4. Understand control flow
tldr cfg src/auth.py authenticate

# 5. Check refactoring impact
tldr impact authenticate src/ --depth 3

# 6. Clean up dead code
tldr dead src/ --entry main
```

### Output Format

All commands output JSON except `context` (which outputs LLM-ready text).

### When to Use TLDR

- Before reading files - get structure first
- Instead of grep - structured results with context
- Before refactoring - impact analysis
- Understanding complexity - CFG metrics
- Finding dependencies - call graphs
- Cleaning up - dead code detection

## Formal Verification (/prove)

Machine-verified mathematical proofs using Lean 4 and Mathlib.

### Usage

```
/prove every group homomorphism preserves identity
/prove Monsky's theorem
/prove continuous functions on compact sets are uniformly continuous
```

### 5-Phase Workflow

**Phase 1: RESEARCH** - Understand if/how this can be formalized

- Search Mathlib for existing formalizations
- Find proof strategies using Nia MCP, Perplexity MCP, or WebSearch
- Identify obstacles (missing lemmas, required axioms)

**Phase 2: DESIGN** - Build proof structure with sorries

- Create Lean file with imports, definitions, theorem statement
- Add helper lemmas as `sorry` placeholders
- Annotate each sorry with complexity estimate

**Phase 3: TEST** - Catch false lemmas before proving

- Generate test cases for axiom candidates
- Run counterexample search with `#eval`
- Reformulate if counterexamples found

**Phase 4: IMPLEMENT** - Fill in the proofs

- Compiler-in-the-loop checks on every write
- Godel-Prover suggests tactics on errors
- Iterate until all sorries filled

**Phase 5: VERIFY** - Audit proof quality

- Check axioms used (propext, Classical.choice are standard)
- Confirm zero sorries remaining
- Generate summary with proof strategy

### Research Tool Priority

The workflow uses available tools in priority order:

| Tool                | Best For                 |
| ------------------- | ------------------------ |
| Mathlib grep/loogle | Existing formalizations  |
| Nia MCP             | Library documentation    |
| Perplexity MCP      | Proof strategies, papers |
| WebSearch           | General references       |
| WebFetch            | Specific paper content   |

### Checkpoints

The workflow pauses for user input when:

- Research finds obstacles requiring decisions
- Testing finds counterexamples
- Implementation hits unfillable sorry after N attempts

### Output Example

```
┌─────────────────────────────────────────────────────┐
│ ✓ MACHINE VERIFIED                                  │
│                                                     │
│ Theorem: ∀ φ : G →* H, φ(1_G) = 1_H                │
│                                                     │
│ Proof Strategy: Direct application of              │
│ MonoidHom.map_one from Mathlib.                    │
│                                                     │
│ Phases:                                             │
│   📚 Research: Found in Mathlib.Algebra.Group.Hom  │
│   🏗️ Design: Single lemma, no sorries needed       │
│   🧪 Test: N/A (trivial)                           │
│   ⚙️ Implement: 3 lines                            │
│   ✅ Verify: 0 custom axioms, 0 sorries            │
│                                                     │
│ File: proofs/group_hom_identity.lean               │
└─────────────────────────────────────────────────────┘
```

### What Can Be Proven

| Domain           | Examples                                  |
| ---------------- | ----------------------------------------- |
| Category Theory  | Functors, natural transformations, Yoneda |
| Abstract Algebra | Groups, rings, homomorphisms              |
| Topology         | Continuity, compactness, connectedness    |
| Analysis         | Limits, derivatives, integrals            |
| Logic            | Propositional, first-order                |

### Behind the Scenes

- **Lean 4.26.0** - Theorem prover
- **Mathlib** - 100K+ formalized theorems
- **Godel-Prover** - AI tactic suggestions (via LMStudio)
- **Compiler-in-the-loop** - Automatic verification on every write

## Memory System

Persistent storage and semantic search of learnings across sessions.

### Storing Learnings (/remember)

Store knowledge for future sessions:

```
/remember hybrid RRF is the default because it finds more results
/remember the wizard creates SQLite tables but not PostgreSQL tables
/remember graceful degradation pattern: check backend, fallback with message
```

**Storage command (direct)**:

```bash
cd opc && uv run python scripts/store_learning.py \
  --session-id "remember-$(date +%Y%m%d-%H%M%S)" \
  --worked "<what_worked>" \
  --failed "<what_failed_or_None>" \
  --decisions "<decisions_or_None>" \
  --patterns "<patterns_or_None>" \
  --json
```

### Recalling Learnings (/recall)

Semantic search through stored memories:

```bash
# Basic recall (top 5 results, text search)
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "authentication patterns"

# More results
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "error handling" --k 10

# With OpenAI embeddings (better semantic matching)
cd opc && PYTHONPATH=. uv run python scripts/recall_learnings.py \
  --query "database schema" --provider openai
```

### What's Stored

The memory system contains session learnings:

- **What worked**: Successful approaches and solutions
- **What failed**: Pitfalls to avoid
- **Decisions**: Architectural choices and rationale
- **Patterns**: Reusable approaches

### Example Queries

```bash
# Find past implementations
/recall "hook development patterns"

# Recall debugging approaches
/recall "TypeScript type errors"

# Find architectural decisions
/recall "database migration"

# Search for test patterns
/recall "test failures pytest"
```

### Backend Support

- **SQLite** (default): BM25 text search, no dependencies
- **PostgreSQL**: Vector embeddings with pgvector
  - Hybrid RRF mode (combines text + vector)
  - Similarity threshold filtering
  - Recency weighting

### Search Modes

**Text-only (SQLite/Postgres)**:

```bash
# Fast keyword search
recall_learnings.py --query "redis cache"
```

**Hybrid RRF (Postgres only)**:

```bash
# Combines text + vector rankings (default for postgres)
recall_learnings.py --query "authentication" --k 10
```

**Vector-only (Postgres)**:

```bash
# Semantic similarity only
recall_learnings.py --query "user login" --provider openai
```

### When to Use Recall

Query memory proactively when:

- Starting work on something you may have done before
- Encountering an error or tricky situation
- Making architectural or design decisions
- Looking for patterns or approaches that worked

## MCP Integrations

Model Context Protocol servers extend Claude Code with external tools.

### Available MCP Servers

**ast-grep** - Structural code search

```bash
# Search by AST pattern, not text
mcp__ast-grep__search --pattern "function $NAME($ARGS) { $BODY }"
```

**firecrawl** - Web scraping and crawling

```bash
# Extract structured data from websites
mcp__firecrawl__scrape --url "https://example.com"
```

**github-search** - GitHub repository search

```bash
# Search across GitHub codebases
mcp__github-search__code --query "authentication typescript"
```

**morph** - Fast file editing

```bash
# Efficient bulk edits
mcp__morph__edit --file "src/config.ts" --changes "..."
```

**nia** - Documentation search

```bash
# Search library docs
mcp__nia__search --query "React hooks useEffect"
```

**perplexity** - AI-powered web research

```bash
# Get research summaries
mcp__perplexity__search --query "best practices for API design"
```

### MCP Configuration

MCP servers can be configured in:

- Project: `.mcp.json` (committed to repo)
- User: `~/.claude/mcp-config.json` (personal tools)

Example configuration:

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "npx",
      "args": ["@ast-grep/mcp-server"]
    },
    "perplexity": {
      "command": "python",
      "args": ["-m", "mcp_perplexity"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    }
  }
}
```

### Managing MCP Servers

```bash
# List servers
claude mcp list

# Enable/disable
/mcp enable ast-grep
/mcp disable firecrawl

# @-mention to toggle
@ast-grep  # Enable/disable in conversation
```

### When to Use MCP Tools

| Tool          | Use Case                                     |
| ------------- | -------------------------------------------- |
| ast-grep      | Structural refactoring, pattern-based search |
| firecrawl     | Web scraping, data extraction                |
| github-search | Cross-repo code search                       |
| morph         | Bulk file edits                              |
| nia           | Library documentation lookup                 |
| perplexity    | Research, proof strategies, current info     |

## Tool Selection Guide

### Code Analysis

- **Structure overview**: `tldr structure` or `tldr tree`
- **Find functions**: `tldr search` or `ast-grep`
- **Understand flow**: `tldr cfg` or `tldr dfg`
- **Check impact**: `tldr impact`

### Research

- **Math proofs**: Nia MCP, then Perplexity MCP, then WebSearch
- **Library docs**: Nia MCP
- **Current events**: Perplexity MCP or WebSearch
- **Code examples**: GitHub MCP

### Memory

- **Store learning**: `/remember` or `store_learning.py`
- **Recall patterns**: `/recall` or `recall_learnings.py`
- **Check past work**: Recall with specific keywords

### Verification

- **Math proofs**: `/prove` (Lean 4)
- **Code correctness**: Unit tests, type checking
- **Architectural review**: `tldr arch`, dead code analysis

## Performance Characteristics

| Tool                     | Speed  | Token Usage | Best For                  |
| ------------------------ | ------ | ----------- | ------------------------- |
| TLDR                     | Fast   | 95% savings | Structure, flow, analysis |
| /prove                   | Slow   | High        | Mathematical correctness  |
| Recall (SQLite)          | Fast   | Low         | Text search               |
| Recall (Postgres+vector) | Medium | Medium      | Semantic search           |
| ast-grep                 | Fast   | Low         | Structural patterns       |
| Perplexity MCP           | Medium | Medium      | Research summaries        |

## Environment Variables

```bash
# Memory system
OPENAI_API_KEY=<key>              # For OpenAI embeddings in recall

# Formal verification
LEAN_PATH=/path/to/lean           # Lean 4 installation
GODEL_PROVER_URL=http://localhost:1234  # LM Studio with Godel-Prover

# TLDR
TLDR_MAX_DEPTH=3                  # Max call graph depth
TLDR_TIMEOUT=30                   # Analysis timeout (seconds)

# MCP
MCP_TIMEOUT=10000                 # Server startup timeout (ms)
MCP_TOOL_TIMEOUT=30000            # Tool execution timeout (ms)
```

## Troubleshooting

### TLDR not found

```bash
# Install from PyPI
uv tool install llm-tldr
# or: pip install llm-tldr
```

### Recall returns no results

```bash
# Check backend
cd opc && uv run python scripts/recall_learnings.py --query "test"

# SQLite: Check database exists
ls -l opc/.claude/cache/agentica-memory/memory.db

# Postgres: Check connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM archival_memory"
```

### /prove fails to start

```bash
# Check Lean installation
lean --version

# Check Godel-Prover (if using)
curl http://localhost:1234/health
```

### MCP server won't connect

```bash
# List servers and status
claude mcp list

# Check logs
tail -f ~/.claude/logs/mcp-*.log
```

## See Also

- [Skills Documentation](/docs/skills/) - Workflow automation
- [Hooks Documentation](/docs/hooks/) - Lifecycle extensions
- [Agent Documentation](/docs/agents/) - Specialist agents
- [CLAUDE.md](/.claude/CLAUDE.md) - Project configuration
