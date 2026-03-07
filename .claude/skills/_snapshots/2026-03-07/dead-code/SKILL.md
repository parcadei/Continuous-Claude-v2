---
name: dead-code
description: Find unused functions and dead code in the codebase
allowed-tools: [Bash]
keywords: [dead code, unused, cleanup, refactor, unreachable]
---

# Dead Code Detection

Find unused functions and dead code using TLDR static analysis.

## Quick Start

```bash
# Scan entire project
tldr dead .

# Scan specific directory
tldr dead src/

# Specify entry points (functions to exclude from analysis)
tldr dead . --entry main cli test_

# Specify language
tldr dead . --lang python
tldr dead . --lang typescript
```

## Output Format

```
Dead code analysis:
  Total functions: 150
  Dead functions: 12

Unused functions:
  - old_helper (src/utils.py:42)
  - deprecated_func (src/legacy.py:15)
  - _unused_method (src/api.py:230)
```

## Cross-Platform

Works on Windows, Mac, and Linux (including WSL).

```bash
# Windows (PowerShell)
tldr dead .

# Mac/Linux
tldr dead .
```

## Entry Points

Functions matching entry patterns are excluded from dead code analysis:
- `main`, `cli` - Application entry points
- `test_*`, `*_test` - Test functions
- `setup`, `teardown` - Fixtures
- `@app.route`, `@api.endpoint` - Framework handlers

```bash
# Custom entry points
tldr dead src/ --entry main api_handler background_job
```

## Integration

This skill replaces the session-start-dead-code hook with on-demand analysis.

| Approach | Pros | Cons |
|----------|------|------|
| Hook (removed) | Automatic | Slowed startup by 3s |
| Skill (this) | On-demand, fast | Manual invocation |

## Related Commands

```bash
# Impact analysis (who calls this?)
tldr impact func_name .

# Architecture layers
tldr arch src/

# Full codebase structure
tldr structure . --lang python
```
