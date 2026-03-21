---
name: serena
description: Semantic code intelligence via Serena MCP server. Use when the user needs go-to-definition, find-references, symbol overview, code navigation, LSP diagnostics, or mentions "serena", "code intelligence", "semantic search", "where is this defined", "who calls this", "find usages", or wants to trace imports, check callers before refactoring, or navigate unfamiliar code. Also use when exploring large codebases where grep alone is insufficient.
---

# Serena Code Intelligence

Serena is an MCP server providing LSP-powered code intelligence across 30+ languages. It runs as a long-lived process that maintains language server connections for low-latency responses.

## Configuration

Registered in `~/.mcp.json` as `serena`. Uses `--context claude-code` to disable tools that overlap with Claude Code's built-in capabilities (reduces token waste).

## Available Tools

| Tool | Use When |
|------|----------|
| `go_to_definition` | Tracing imports, understanding where a function/class is defined |
| `find_references` | Before refactoring -- check all callers. Returns code snippets around each reference |
| `get_diagnostics` | After complex multi-file edits to catch type errors across the project |
| `get_symbol_overview` | Understanding a module's public API without reading the whole file |

## When to Use Serena vs Other Tools

| Need | Tool | Why |
|------|------|-----|
| Find where function is defined | Serena `go_to_definition` | Resolves through re-exports, aliases, type imports |
| Find all callers of a function | Serena `find_references` | Returns actual code context, not just file names |
| Quick text search | Grep/Glob | Faster for simple string matching |
| Type errors after edit | `post-edit-diagnostics` hook | Automatic, no manual invocation needed |
| Project-wide type check | `tsc --noEmit` or `tldr diagnostics` | Better for batch checking |
| Understand file structure | `tldr structure` | AST-level, no language server needed |

## Best Practices

1. **Before refactoring**: Always `find_references` on the function/method you plan to change. This catches callers in files you might not know about.

2. **Tracing imports**: Use `go_to_definition` instead of manually grep-ing for export statements. It resolves through barrel files and re-exports correctly.

3. **New codebase exploration**: Combine `get_symbol_overview` (what does this module expose?) with `go_to_definition` (where does this come from?) for efficient navigation.

4. **After complex edits**: If you edited 3+ files, use `get_diagnostics` to catch cross-file type errors that single-file checking misses.

## Architecture Notes

- MCP server (stdio transport via `cmd /c uvx`) -- not a CLI tool
- Keeps language servers warm between calls -- no cold-start latency
- Replaces the need for cclsp, Piebald-AI, boostvolt, and official Claude Code LSP plugins (all broken on Windows due to spawn ENOENT bug)
- Source: [oraios/serena](https://github.com/oraios/serena) -- most mature LSP MCP (900+ issues, very active)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "serena" not in MCP tools | Check `~/.mcp.json` has `serena` entry with `cmd /c uvx` wrapper |
| Slow first response | Normal -- language server initializing. Subsequent calls are fast |
| Missing language support | Install the language server binary (e.g., `npm install -g typescript` for TS) |
| uvx not found | `winget install astral-sh.uv` (Windows) or see [uv docs](https://docs.astral.sh/uv/getting-started/installation/) |
