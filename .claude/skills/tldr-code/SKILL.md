---
name: tldr-code
description: Token-efficient code analysis via 5-layer stack (AST, Call Graph, CFG, DFG, PDG). 95% token savings.
allowed-tools: [Bash]
metadata:
  keywords: [debug, refactor, understand, complexity, "call graph", "data flow", "what calls", "how complex", search, explore, analyze, dead code, architecture, imports]
---

# TLDR-Code

Token-efficient code analysis. **95% savings** vs raw file reads.

Advanced features (daemon, semantic search, Python API, language table): `references/advanced-features.md`

## Quick Reference

| Task | Command |
|------|---------|
| File tree | `tldr tree src/` |
| Code structure | `tldr structure . --lang python` |
| Search code | `tldr search "pattern" .` |
| Call graph | `tldr calls src/` |
| Who calls X? | `tldr impact func_name .` |
| Control flow | `tldr cfg file.py func` |
| Data flow | `tldr dfg file.py func` |
| Program slice | `tldr slice file.py func 42` |
| Dead code | `tldr dead src/` |
| Architecture | `tldr arch src/` |
| Imports | `tldr imports file.py` |
| Who imports X? | `tldr importers module_name .` |
| Affected tests | `tldr change-impact --git` |
| Type check | `tldr diagnostics file.py` |
| Semantic search | `tldr semantic search "auth flow"` |

---

## The 5-Layer Stack

```
Layer 1: AST         ~500 tokens   Function signatures, imports
Layer 2: Call Graph  +440 tokens   What calls what (cross-file)
Layer 3: CFG         +110 tokens   Complexity, branches, loops
Layer 4: DFG         +130 tokens   Variable definitions/uses
Layer 5: PDG         +150 tokens   Dependencies, slicing
───────────────────────────────────────────────────────────────
Total:              ~1,200 tokens  vs 23,000 raw = 95% savings
```

---

## CLI Commands

### Navigation & Search

```bash
tldr tree src/ --ext .py .ts           # File tree, filter by extension
tldr structure . --lang python          # Code structure (codemaps)
tldr search "def process" src/          # Text search
tldr search "TODO" . -C 3              # 3 lines context
tldr semantic search "auth flow"        # Natural language search
```

### File Analysis

```bash
tldr extract src/api.py                           # Full file info
tldr extract src/api.py --function process        # Filter to function
tldr context main --project src/ --depth 3        # LLM context (follows call graph)
```

### Flow Analysis

```bash
tldr cfg src/processor.py process_data   # Control flow: complexity, branches, loops
tldr dfg src/processor.py process_data   # Data flow: variable definitions/uses
tldr slice src/processor.py process_data 42             # What affects line 42
tldr slice src/processor.py process_data 42 --var result # Track specific variable
```

### Codebase Analysis

```bash
tldr calls src/ --lang python           # Cross-file call graph
tldr impact process_data src/ --depth 5 # Who calls this function?
tldr dead src/ --entry main cli test_   # Find unreachable code
tldr arch src/                          # Detect architectural layers
```

### Import Analysis

```bash
tldr imports src/api.py                 # What does this file import?
tldr importers datetime src/            # Who imports this module?
```

### Quality & Testing

```bash
tldr diagnostics src/api.py             # Type check + lint (pyright/ruff)
tldr diagnostics . --project            # Whole project
tldr diagnostics src/ --format text     # Human-readable output
tldr change-impact --git                # Tests affected by git diff
tldr change-impact --git-base main      # Diff against branch
tldr change-impact --run                # Actually run affected tests
```

---

## When to Use TLDR vs Grep

| Task | Use TLDR | Use Grep |
|------|----------|----------|
| Find function definition | `tldr extract file --function X` | - |
| Search code patterns | `tldr search "pattern"` | - |
| String literal search | - | `grep "literal"` |
| Config values | - | `grep "KEY="` |
| Cross-file calls | `tldr calls` | - |
| Reverse deps | `tldr impact func` | - |
| Complexity analysis | `tldr cfg file func` | - |
| Variable tracking | `tldr dfg file func` | - |
| Natural language query | `tldr semantic search` | - |

---

## Bug Fixing Workflow

**Key insight:** TLDR navigates, then you read. Don't fix bugs from summaries alone.

```bash
# 1. NAVIGATE: Find which files matter
tldr imports file.py              # What does buggy file depend on?
tldr impact func_name .           # Who calls the buggy function?
tldr calls .                      # Cross-file edges

# 2. READ: Get actual code for critical files (2-4 files, not all 50)
tldr search "def buggy_func" . -C 20   # Code with context
# Then use Read tool for full implementation if needed
```

For cross-file bugs (field name mismatch, type mismatch): TLDR finds which files matter, then you read them.

---

## Decision Tree: Which Command?

```
Need to find code?
  └─ By name/pattern → tldr search
  └─ By meaning → tldr semantic search

Need to understand code?
  └─ What it calls → tldr calls / tldr extract
  └─ Who calls it → tldr impact
  └─ How complex → tldr cfg
  └─ Variable flow → tldr dfg
  └─ What affects line X → tldr slice

Need to analyze codebase?
  └─ Dead code → tldr dead
  └─ Architecture → tldr arch
  └─ Import graph → tldr imports / tldr importers

Need to validate changes?
  └─ Type errors → tldr diagnostics
  └─ Affected tests → tldr change-impact
```
