---
name: ast-grep-find
description: AST-based code search and refactoring via ast-grep MCP
allowed-tools: [Bash, Read]
---

# AST-Grep Find

Structural code search that understands syntax. Find patterns like function calls, imports, class definitions - not just text.

## When to Use

- Find code patterns (ignores strings/comments)
- Search for function calls, class definitions, imports
- Refactor code with AST precision
- Rename variables/functions across codebase

## Usage

### Search for a pattern
```bash
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "import asyncio" --language python
```

### Search in specific directory
```bash
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "async def \$FUNC(\$\$\$)" --language python --path "./src"
```

### Refactor/replace pattern
```bash
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "console.log(\$MSG)" --replace "logger.info(\$MSG)" \
    --language javascript
```

### Dry run (preview changes)
```bash
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "print(\$X)" --replace "logger.info(\$X)" \
    --language python --dry-run
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--pattern` | AST pattern to search (required) |
| `--language` | Language: `python`, `javascript`, `typescript`, `go`, etc. |
| `--path` | Directory to search (default: `.`) |
| `--glob` | File glob pattern (e.g., `**/*.py`) |
| `--replace` | Replacement pattern for refactoring |
| `--dry-run` | Preview changes without applying |
| `--context` | Lines of context (default: 2) |

## Pattern Syntax

| Syntax | Meaning |
|--------|---------|
| `$NAME` | Match single node (variable, expression) |
| `$$$` | Match multiple nodes (arguments, statements) |
| `$_` | Match any single node (wildcard) |

## Examples

```bash
# Find all function definitions
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "def \$FUNC(\$\$\$):" --language python

# Find console.log calls
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "console.log(\$\$\$)" --language javascript

# Replace print with logging
uv run python -m runtime.harness scripts/ast_grep_find.py \
    --pattern "print(\$X)" --replace "logging.info(\$X)" \
    --language python --dry-run
```

## vs morph/warpgrep

| Tool | Best For |
|------|----------|
| **ast-grep** | Structural patterns (understands code syntax) |
| **warpgrep** | Fast text/regex search (20x faster grep) |

Use ast-grep when you need syntax-aware matching. Use warpgrep for raw speed.

## MCP Server Required

Requires `ast-grep` server in mcp_config.json.
