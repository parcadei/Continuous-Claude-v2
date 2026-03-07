---
name: qlty-check
description: Code quality checks, formatting, and metrics via qlty CLI
allowed-tools: [Bash, Read]
---

# Qlty Code Quality

Universal code quality tool supporting 70+ linters for 40+ languages via qlty CLI.

## When to Use

- Check code for linting issues before commit/handoff
- Auto-fix formatting and style issues
- Calculate code metrics (complexity, duplication)
- Find code smells

## Quick Reference

```bash
# Check changed files with auto-fix
uv run python -m runtime.harness scripts/qlty_check.py --fix

# Check all files
uv run python -m runtime.harness scripts/qlty_check.py --all

# Format files
uv run python -m runtime.harness scripts/qlty_check.py --fmt

# Get metrics
uv run python -m runtime.harness scripts/qlty_check.py --metrics

# Find code smells
uv run python -m runtime.harness scripts/qlty_check.py --smells
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--check` | Run linters (default) |
| `--fix` | Auto-fix issues |
| `--all` | Process all files, not just changed |
| `--fmt` | Format files instead |
| `--metrics` | Calculate code metrics |
| `--smells` | Find code smells |
| `--paths` | Specific files/directories |
| `--level` | Min issue level: note/low/medium/high |
| `--cwd` | Working directory |
| `--init` | Initialize qlty in a repo |
| `--plugins` | List available plugins |

## Common Workflows

### After Implementation
```bash
# Auto-fix what's possible, see what remains
uv run python -m runtime.harness scripts/qlty_check.py --fix
```

### Quality Report
```bash
# Get metrics for changed code
uv run python -m runtime.harness scripts/qlty_check.py --metrics

# Find complexity hotspots
uv run python -m runtime.harness scripts/qlty_check.py --smells
```

### Initialize in New Repo
```bash
uv run python -m runtime.harness scripts/qlty_check.py --init --cwd /path/to/repo
```

## Direct CLI (if qlty installed)

```bash
# Check changed files
qlty check

# Auto-fix
qlty check --fix

# JSON output
qlty check --json

# Format
qlty fmt
```

## Requirements

- **qlty CLI**: https://github.com/qltysh/qlty
- **MCP server**: `servers/qlty/server.py` wraps CLI
- **Config**: `.qlty/qlty.toml` in repo (run `qlty init` first)

## vs Other Tools

| Tool | Use Case |
|------|----------|
| **qlty** | Unified linting, formatting, metrics for any language |
| **ast-grep** | Structural code patterns and refactoring |
| **morph** | Fast text search |
