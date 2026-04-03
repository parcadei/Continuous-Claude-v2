# TLDR-Code: Token-Efficient Code Analysis

TLDR-Code is a 5-layer code analysis system that provides 95% token savings when working with large codebases. Instead of reading raw source files, it extracts structured summaries using Abstract Syntax Trees (AST), call graphs, control flow graphs (CFG), data flow graphs (DFG), and program dependence graphs (PDG).

## Why TLDR-Code Exists

Large Language Models have token limits. A medium-sized codebase can easily exceed context windows, forcing you to choose between:

- Reading only part of the code (incomplete context)
- Reading everything (hitting token limits)
- Manual summarization (time-consuming, error-prone)

TLDR-Code solves this by providing structured summaries that preserve the essential information while reducing token usage by 95%.

### Token Savings Comparison

| Approach        | Tokens | Savings |
| --------------- | ------ | ------- |
| Read raw files  | 23,314 | 0%      |
| TLDR all layers | 1,189  | **95%** |

The key insight: Call graphs navigate to relevant code, then layers provide structured summaries. You don't need to read irrelevant code.

## The 5-Layer Architecture

TLDR-Code builds understanding progressively:

```
Layer 1: AST         → ~500 tokens  (function signatures, imports, classes)
Layer 2: Call Graph  → +440 tokens  (cross-file call relationships)
Layer 3: CFG         → +110 tokens  (control flow, complexity metrics)
Layer 4: Data Flow   → +130 tokens  (variable definitions, uses, modifications)
Layer 5: PDG         → +150 tokens  (program dependencies, slicing)
────────────────────────────────────────
Total: ~1,200 tokens vs 23,000 raw
```

### Layer 1: AST (Abstract Syntax Tree)

Extracts code structure without implementation details:

- Function and method signatures
- Class definitions
- Import statements
- Module structure
- Docstrings

**Use when:** You need to understand what code exists and how it's organized.

### Layer 2: Call Graph

Maps function call relationships across files:

- What functions call what
- Cross-file dependencies
- Module boundaries
- Entry points

**Use when:** You need to trace execution flow or understand dependencies.

### Layer 3: CFG (Control Flow Graph)

Analyzes control flow within functions:

- Basic blocks (sequential code)
- Control flow edges (branches, loops)
- Cyclomatic complexity
- Unreachable code detection

**Use when:** You need to understand code complexity or identify dead code.

### Layer 4: DFG (Data Flow Graph)

Tracks variable lifecycle:

- Variable definitions
- Variable uses (reads)
- Variable modifications (writes)
- Reaching definitions

**Use when:** You need to track how data flows through a function.

### Layer 5: PDG (Program Dependence Graph)

Combines control and data dependencies:

- Control dependencies (what affects execution)
- Data dependencies (what variables affect)
- Program slicing (what affects a specific line)
- Backward/forward slicing

**Use when:** You need to understand what code affects a specific line or variable.

## Installation

TLDR-Code is available on PyPI as `llm-tldr`:

```bash
# Recommended: Install as a tool (adds to PATH automatically)
uv tool install llm-tldr

# Alternative: pip install
pip install llm-tldr
```

The `tldr` CLI will be available on your PATH after installation.

**Source:** [github.com/parcadei/tldr-code](https://github.com/parcadei/tldr-code)

## CLI Reference

### Core Analysis Commands

#### `tldr tree [path]`

Show file tree structure.

```bash
# Basic tree
tldr tree src/

# Filter by extensions
tldr tree src/ --ext .py .ts

# Include hidden files
tldr tree src/ --show-hidden
```

**Output:** JSON with nested directory structure.

#### `tldr structure [path] --lang <language>`

Extract code structure (codemaps) for all files.

```bash
# Python structure
tldr structure src/ --lang python

# TypeScript structure
tldr structure src/ --lang typescript

# Limit results
tldr structure src/ --lang python --max 50
```

**Output:** JSON with functions, classes, imports per file.

**Supported languages:** `python`, `typescript`, `javascript`, `go`, `rust`

#### `tldr search <pattern> [path]`

Search files for regex pattern.

```bash
# Basic search
tldr search "def process" src/

# Filter by extension
tldr search "class.*Controller" src/ --ext .py

# Include context lines
tldr search "error" src/ -C 3
```

**Output:** JSON with matches, file paths, line numbers, and optional context.

#### `tldr extract <file>`

Extract full file information (L1: AST).

```bash
tldr extract src/main.py
```

**Output:** JSON with complete module structure:

- Functions with signatures and docstrings
- Classes with methods
- Imports (stdlib, third-party, local)
- Module-level variables

#### `tldr context <entry> --project <path>`

Get LLM-ready context starting from an entry point (L1+L2).

```bash
# Get context for main() function
tldr context main --project src/ --depth 2

# Custom depth
tldr context process_data --project src/ --depth 3

# For TypeScript
tldr context handleRequest --project src/ --lang typescript
```

**Output:** Human-readable text with:

- Entry point signature and docstring
- Called functions with their signatures
- Transitive dependencies up to depth limit

### Flow Analysis Commands

#### `tldr cfg <file> <function>`

Get control flow graph for a function (L3).

```bash
tldr cfg src/processor.py process_data
```

**Output:** JSON with:

- Basic blocks with line ranges
- Control flow edges (branch targets)
- Cyclomatic complexity
- Entry/exit blocks

#### `tldr dfg <file> <function>`

Get data flow graph for a function (L4).

```bash
tldr dfg src/processor.py process_data
```

**Output:** JSON with:

- Variable definitions (where assigned)
- Variable uses (where read)
- Variable modifications (where updated)
- Data flow edges

#### `tldr slice <file> <function> <line>`

Get program slice for a specific line (L5).

```bash
# Backward slice (what affects line 42)
tldr slice src/processor.py process_data 42

# Forward slice (what line 42 affects)
tldr slice src/processor.py process_data 42 --direction forward

# Track specific variable
tldr slice src/processor.py process_data 42 --var amount
```

**Output:** Set of line numbers in the slice.

#### `tldr calls [path]`

Build cross-file call graph (L2).

```bash
tldr calls src/
```

**Output:** JSON with all function call relationships across the project.

### Codebase Analysis Commands

#### `tldr impact <function> [path]`

Find all callers of a function (reverse call graph).

```bash
# Find who calls process_payment
tldr impact process_payment src/

# Custom depth
tldr impact process_payment src/ --depth 5

# Filter by file
tldr impact process_payment src/ --file payment
```

**Use case:** Before refactoring, check what would break.

**Output:** JSON with caller chains up to specified depth.

#### `tldr dead [path]`

Find unreachable (dead) code.

```bash
# Find dead code
tldr dead src/

# Specify entry points
tldr dead src/ --entry main cli serve

# For Go
tldr dead src/ --lang go
```

**Output:** JSON with functions that are never called (excluding standard entry points like `main`, `test_*`, `__init__`).

#### `tldr arch [path]`

Detect architectural layers from call patterns.

```bash
tldr arch src/
```

**Output:** JSON with:

- **Entry layer:** Controllers/handlers (many callers, few calls)
- **Middle layer:** Services (moderate calls in/out)
- **Leaf layer:** Utilities (few callers, many calls)
- **Circular dependencies:** Problematic cycles

### Performance Commands

#### `tldr warm <path>`

Pre-build call graph cache for faster queries.

```bash
# Warm cache
tldr warm src/

# Background process
tldr warm src/ --background
```

**Use case:** Run once before intensive analysis work to speed up subsequent queries.

#### `tldr semantic index <path>`

Build semantic search index (experimental).

```bash
tldr semantic index src/
```

#### `tldr semantic search <query>`

Search code semantically using embeddings (experimental).

```bash
tldr semantic search "payment processing logic" --path src/ --k 5

# With call graph expansion
tldr semantic search "authentication" --path src/ --expand
```

## Python API

### Unified API

The simplest way to get all layers:

```python
from tldr.api import get_relevant_context

# Get all layers for a function
context = get_relevant_context(
    project="src/",
    entry_point="process_payment",
    depth=2,
    language="python"
)

# Convert to LLM-ready string
llm_context = context.to_llm_string()
```

### Layer 1: AST

Extract code structure:

```python
from tldr.api import extract_file, get_imports

# Get complete file structure
file_info = extract_file("src/services/payment.py")
# Returns: {
#   "functions": [...],
#   "classes": [...],
#   "imports": {...}
# }

# Get just imports
imports = get_imports("src/services/payment.py")
# Returns: [
#   {"type": "stdlib", "module": "json", ...},
#   {"type": "third_party", "module": "requests", ...}
# ]
```

### Layer 2: Call Graph

Build and query call relationships:

```python
from tldr.api import build_function_index, get_intra_file_calls

# Build project-wide function index
index = build_function_index("src/", language="python")

# Get calls within a single file
calls = get_intra_file_calls("src/services/payment.py")
# Returns: {
#   "process_payment": ["validate_card", "charge_card"],
#   "validate_card": ["check_expiry"]
# }
```

### Layer 3: CFG

Analyze control flow:

```python
from tldr.api import get_cfg_context, get_cfg_blocks, get_cfg_edges

# Get full CFG context
cfg = get_cfg_context("src/services/payment.py", "process_payment")
# Returns: {
#   "blocks": [...],
#   "edges": [...],
#   "cyclomatic_complexity": 12
# }

# Get just blocks
blocks = get_cfg_blocks("src/services/payment.py", "process_payment")

# Get just edges
edges = get_cfg_edges("src/services/payment.py", "process_payment")
```

### Layer 4: DFG

Track data flow:

```python
from tldr.api import get_dfg_context

dfg = get_dfg_context("src/services/payment.py", "process_payment")
# Returns: {
#   "variables": [
#     {
#       "name": "amount",
#       "definitions": [10],
#       "uses": [15, 22],
#       "modifications": [30]
#     }
#   ]
# }
```

### Layer 5: PDG

Program slicing and dependencies:

```python
from tldr.api import get_pdg_context, get_slice

# Get program dependence graph
pdg = get_pdg_context("src/services/payment.py", "process_payment")

# Get backward slice (what affects line 45)
slice_lines = get_slice(
    source_or_path="src/services/payment.py",
    function_name="process_payment",
    line=45,
    direction="backward"
)
# Returns: {10, 12, 15, 42, 45}

# Get forward slice (what line 45 affects)
slice_lines = get_slice(
    source_or_path="src/services/payment.py",
    function_name="process_payment",
    line=45,
    direction="forward"
)

# Track specific variable
slice_lines = get_slice(
    source_or_path="src/services/payment.py",
    function_name="process_payment",
    line=45,
    variable="amount"
)
```

### Utility Functions

```python
from tldr.api import (
    scan_project_files,
    get_file_tree,
    search,
    get_code_structure
)

# Find all Python files
files = scan_project_files("src/", language="python")

# Get directory tree
tree = get_file_tree("src/", extensions={".py"}, exclude_hidden=True)

# Search for pattern
results = search(
    pattern=r"def process_\w+",
    root="src/",
    extensions={".py"},
    context_lines=2
)

# Get code structure for all files
structure = get_code_structure(
    root="src/",
    language="python",
    max_results=100
)
```

### Working with Source Strings

Most API functions accept either file paths or source code strings:

```python
from tldr.api import get_cfg_context

# From file path
cfg = get_cfg_context("src/main.py", "main")

# From source string
source = """
def process(data):
    if data:
        return clean(data)
    return None
"""
cfg = get_cfg_context(source, "process")
```

## Language Support

TLDR-Code supports multiple languages with varying feature levels:

| Language   | AST  | Call Graph | CFG   | DFG   | PDG   |
| ---------- | ---- | ---------- | ----- | ----- | ----- |
| Python     | Full | Full       | Full  | Full  | Full  |
| TypeScript | Full | Full       | Full  | Basic | Basic |
| JavaScript | Full | Full       | Full  | Basic | Basic |
| Go         | Full | Full       | Basic | Basic | -     |
| Rust       | Full | Full       | Basic | Basic | -     |

**Full:** Complete support with all features
**Basic:** Core features implemented, edge cases may be incomplete
**-:** Not yet implemented

### Language-Specific Notes

**Python:**

- Handles async/await
- Supports decorators
- Tracks imports (stdlib, third-party, local)

**TypeScript/JavaScript:**

- Distinguishes TypeScript from JavaScript
- Handles ES6+ features (arrow functions, classes)
- Tracks imports/exports

**Go:**

- Handles package imports
- Supports interfaces and structs
- Tracks goroutines

**Rust:**

- Handles traits and implementations
- Supports macros (basic)
- Tracks crate dependencies

## Integration with Claude Code

### TLDR Read Enforcer Hook

When you try to read a large file, the `tldr-read-enforcer` hook automatically provides TLDR context instead:

```bash
# You type:
Read src/services/payment.py

# Hook intercepts and returns TLDR context:
# L1: Functions, classes, imports
# L2: Call graph
# L3: Complexity metrics
```

To bypass and read the full file:

```bash
Read src/services/payment.py with offset/limit
```

### TLDR Context Inject Hook

The `tldr-context-inject` hook enriches agent prompts with relevant TLDR context when spawning subagents.

### Using TLDR in Skills

Reference TLDR in your skill documentation:

```markdown
## Before Reading Files

Check TLDR structure first:
\`\`\`bash
tldr structure src/ --lang python
\`\`\`

This shows what exists before reading 23K tokens.
```

## Practical Workflows

### Exploring a New Codebase

```bash
# 1. Get directory structure
tldr tree src/ --ext .py

# 2. Get high-level code structure
tldr structure src/ --lang python

# 3. Find entry points
tldr search "def main" src/

# 4. Get context from entry point
tldr context main --project src/ --depth 3
```

### Before Refactoring

```bash
# 1. Find who calls the function
tldr impact old_function src/ --depth 5

# 2. Check complexity
tldr cfg src/module.py old_function

# 3. Understand data flow
tldr dfg src/module.py old_function

# 4. Find what would be affected
tldr slice src/module.py old_function 42 --direction forward
```

### Debugging

```bash
# 1. Find the bug location
tldr search "ERROR.*payment" src/

# 2. Get control flow
tldr cfg src/payment.py process_payment

# 3. Trace what affects the buggy line
tldr slice src/payment.py process_payment 127 --direction backward

# 4. Check data flow for suspicious variable
tldr dfg src/payment.py process_payment
```

### Code Review

```bash
# 1. Detect architectural violations
tldr arch src/

# 2. Find dead code
tldr dead src/

# 3. Check complexity of changed functions
tldr cfg src/new_feature.py complex_function
```

### Cleanup

```bash
# 1. Find unused code
tldr dead src/

# 2. Verify nothing calls it
tldr impact dead_function src/

# 3. Check for circular dependencies
tldr arch src/
```

## Performance Considerations

### Caching

TLDR-Code caches analysis results. The cache is stored in:

```
.tldr/cache/   # In your project directory
```

To warm the cache:

```bash
tldr warm src/
```

### Incremental Updates

TLDR-Code supports incremental updates (P4 implementation). When files change:

1. Dirty flags track changed files
2. Only affected call graphs are rebuilt
3. Patches are applied to existing graphs

### Large Codebases

For projects with 1000+ files:

1. Use `--max` to limit initial analysis
2. Pre-warm the cache with `tldr warm`
3. Use file filters (`--file`, `--ext`) to narrow scope

## Testing

Run the test suite (for contributors):

```bash
git clone https://github.com/parcadei/tldr-code
cd tldr-code
uv sync
uv run pytest tests/ -v
```

Current test status: **265 tests passing**

## Output Formats

### JSON Structure

All commands (except `context`) output JSON:

```json
{
  "command": "extract",
  "file": "src/main.py",
  "language": "python",
  "functions": [
    {
      "name": "process_data",
      "line": 42,
      "signature": "def process_data(data: List[str]) -> Dict[str, Any]",
      "docstring": "Process input data and return results.",
      "calls": ["validate", "transform"]
    }
  ],
  "classes": [...],
  "imports": [...]
}
```

### LLM-Ready Text

The `context` command and `RelevantContext.to_llm_string()` produce human-readable text:

```
Entry: process_payment (src/services/payment.py:42)
"""Process a payment transaction."""

Calls:
  → validate_card (src/services/payment.py:120)
    """Validate credit card details."""

  → charge_card (src/services/billing.py:15)
    """Charge the card via payment gateway."""
```

## Comparison with Other Tools

| Tool             | Purpose        | Token Savings | Call Graphs | Flow Analysis |
| ---------------- | -------------- | ------------- | ----------- | ------------- |
| **TLDR-Code**    | LLM context    | 95%           | Yes         | CFG/DFG/PDG   |
| AST Parser       | Structure only | 60%           | No          | No            |
| ctags/etags      | Navigation     | 50%           | No          | No            |
| LSP              | Editor support | N/A           | Limited     | No            |
| Static analyzers | Bug finding    | N/A           | No          | Yes           |

TLDR-Code is specifically designed for LLM context preparation, not general static analysis.

## Limitations

### Current Limitations

1. **Complexity:** Functions with 100+ statements may have incomplete CFG/DFG
2. **Dynamic code:** `eval()`, `exec()`, dynamic imports not tracked
3. **Inter-procedural analysis:** Limited to call graph depth
4. **Alias analysis:** Basic support only
5. **Concurrency:** Goroutines, async tasks not fully modeled

### Not Supported

- Type inference (use mypy/TypeScript compiler)
- Bug detection (use pylint/ESLint)
- Performance profiling (use cProfile/perf)
- Security scanning (use Bandit/Semgrep)

## Troubleshooting

### "No tree-sitter parser found"

Install language-specific parsers:

```bash
uv pip install tree-sitter-typescript tree-sitter-go tree-sitter-rust
```

### "Function not found"

Check the function name exactly matches (case-sensitive):

```bash
# List all functions first
tldr extract src/module.py | jq '.functions[].name'
```

### "Cache out of sync"

Clear the cache:

```bash
rm -rf .tldr/cache/
tldr warm src/
```

### High memory usage

Limit the scope:

```bash
tldr structure src/ --max 50  # Limit files analyzed
```

## Contributing

TLDR-Code is a separate package. To contribute:

1. Source: [github.com/parcadei/tldr-code](https://github.com/parcadei/tldr-code)
2. Tests: Run `uv run pytest tests/` before submitting
3. Documentation: Update this file for API changes
4. Issues: File in the tldr-code repository

## Architecture Notes

### Meta-Patterns

CFG, DFG, and PDG use meta-patterns that work across languages:

- **CFG:** Basic blocks + edges (same structure for all languages)
- **DFG:** VarRef + DataflowEdge (language-agnostic)
- **PDG:** Combines CFG and DFG dependencies

This design allows adding new languages without changing the analysis algorithms.

### Design Decisions

1. **Simple reaching definitions:** Line-order based, not SSA (sufficient for v1)
2. **No alias analysis:** Would require complex pointer analysis
3. **Incremental updates:** P4 implementation with dirty flags and patches
4. **Cache-first:** Pre-build graphs for interactive performance

## References

- PyPI: [pypi.org/project/llm-tldr](https://pypi.org/project/llm-tldr/)
- Source: [github.com/parcadei/tldr-code](https://github.com/parcadei/tldr-code)
- Skills: `.claude/skills/tldr-code/SKILL.md`
- Hooks: `.claude/hooks/dist/tldr-*.mjs`

## License

See LICENSE file in the repository root.
