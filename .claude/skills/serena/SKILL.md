---
name: serena
description: Semantic code intelligence via Serena MCP server. Use when the user needs go-to-definition, find-references, symbol overview, code navigation, LSP diagnostics, or mentions "serena", "code intelligence", "semantic search", "where is this defined", "who calls this", "find usages", or wants to trace imports, check callers before refactoring, or navigate unfamiliar code. Also use when exploring large codebases where grep alone is insufficient.
---

# Serena Code Intelligence

Serena is an MCP server providing LSP-powered code intelligence across 30+ languages. It runs as a long-lived process that maintains language server connections for low-latency responses.

## MCP Registration

Registered in `~/.mcp.json` as `serena`. Uses `--context claude-code` to disable tools that overlap with Claude Code's built-in capabilities (reduces token waste).

## New Project Setup

When activating a new project for the first time:

1. **Activate**: `mcp__serena__activate_project` with the project path
2. **Check onboarding**: `mcp__serena__check_onboarding_performed`
3. **Run onboarding** (if not done): `mcp__serena__onboarding` -- then write memory files via `mcp__serena__write_memory` covering: project overview, suggested commands, style conventions, task completion steps
4. **Verify**: Test `get_symbols_overview` on a root-level source file to confirm the language server indexes correctly

## Configuring Languages and Projects

Configuration lives in `.serena/project.yml` (created on first `activate_project`).

**Add a language** -- edit the `languages` list in `.serena/project.yml`:
```yaml
languages:
- typescript
- python        # add more languages here
```

Supported languages (60+): typescript, python, go, rust, java, kotlin, csharp, cpp, ruby, php, swift, dart, elixir, lua, haskell, scala, and many more. Full list in the `project.yml` comments or [Serena docs](https://oraios.github.io/serena/01-about/020_programming-languages.html).

**Key config options** in `.serena/project.yml`:
| Setting | Default | Purpose |
|---------|---------|---------|
| `languages` | `[typescript]` | Which language servers to start |
| `ignore_all_files_in_gitignore` | `true` | Skip gitignored files for code analysis |
| `ignored_paths` | `[]` | Additional paths to exclude |
| `read_only` | `false` | Prevent Serena from editing files |
| `encoding` | `utf-8` | Text file encoding |

**Local overrides**: Use `.serena/project.local.yml` (not committed) to override any setting for your machine.

**Memories**: Serena stores per-project memories in `.serena/memories/`. These persist across sessions and are loaded on demand by the agent.

## Available MCP Tools

### Navigation & Analysis
| Tool | Use When |
|------|----------|
| `get_symbols_overview` | Understanding a module's exports/structure without reading it |
| `find_symbol` | Searching for a class/function by name across the codebase |
| `find_referencing_symbols` | Before refactoring -- find all callers/references |
| `search_for_pattern` | Regex search across files (respects gitignore) |

### File Operations
| Tool | Use When |
|------|----------|
| `list_dir` | Browse directory structure |
| `replace_symbol_body` | Edit an entire function/class definition |
| `insert_before_symbol` / `insert_after_symbol` | Add code adjacent to a symbol |

### Project Management
| Tool | Use When |
|------|----------|
| `activate_project` | Switch to a different project directory |
| `get_current_config` | See active languages, tools, modes |
| `onboarding` | First-time project setup (writes memories) |
| `write_memory` / `read_memory` / `list_memories` | Persist project-specific notes |

## When to Use Serena vs Other Tools

| Need | Tool | Why |
|------|------|-----|
| Find symbol definition | Serena `find_symbol` | Resolves through re-exports, aliases, type imports |
| Find all callers of a function | Serena `find_referencing_symbols` | Returns actual code context, not just file names |
| Quick text search | Grep/Glob | Faster for simple string matching |
| Type errors after edit | `post-edit-diagnostics` hook | Automatic, no manual invocation needed |
| Project-wide type check | `tsc --noEmit` or `tldr diagnostics` | Better for batch checking |
| Understand file structure | `tldr structure` | AST-level, no language server needed |

## Best Practices

1. **Before refactoring**: Always `find_referencing_symbols` on the function/method you plan to change. This catches callers in files you might not know about.

2. **Tracing imports**: Use `find_symbol` with `include_body=true` instead of manually grep-ing for export statements. It resolves through barrel files and re-exports correctly.

3. **New codebase exploration**: Combine `get_symbols_overview` (what does this module expose?) with `find_symbol` (where does this come from?) for efficient token-efficient navigation.

4. **After complex edits**: If you edited 3+ files, use `tsc --noEmit` or `tldr diagnostics` to catch cross-file type errors.

5. **Symbolic editing**: Use `replace_symbol_body` for precise edits to entire functions/methods. Use `insert_after_symbol` / `insert_before_symbol` for adding new code.

## Examples

**Example 1 -- Explore an unfamiliar module:**
```
User: "What does the session-register hook do?"
→ activate_project (if needed)
→ get_symbols_overview on .claude/hooks/src/session-register.ts (depth=1)
→ find_symbol "registerSession" with include_body=true
```

**Example 2 -- Pre-refactor safety check:**
```
User: "Rename the runHook function"
→ find_symbol "runHook" to locate it
→ find_referencing_symbols to find all 12 callers across the codebase
→ Show user the impact before making changes
```

**Example 3 -- Add a new language to a project:**
```
User: "I need Serena to understand the Python code in opc/"
→ Edit .serena/project.yml: add "python" to the languages list
→ Restart the language server (or re-activate project)
→ Verify with get_symbols_overview on a .py file
```

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| Files in gitignored dirs (e.g., `.claude/hooks/src/`) return "Cannot extract symbols" | Set `ignore_all_files_in_gitignore: false` in `.serena/project.yml` or use Grep/Read directly |
| Nested TS projects with own `tsconfig.json` may not resolve | Ensure root `tsconfig.json` includes the nested project paths |
| `find_symbol` returns `[]` for imported (not locally defined) symbols | Use `search_for_pattern` as fallback for imports |
| First call per language is slow | Normal -- language server cold start. Subsequent calls are fast |

## Architecture Notes

- MCP server (stdio transport via `cmd /c uvx`) -- not a CLI tool
- Keeps language servers warm between calls -- no cold-start latency
- Config: `.serena/project.yml` (versioned) + `.serena/project.local.yml` (local overrides)
- Memories: `.serena/memories/*.md` (per-project persistent notes)
- Source: [oraios/serena](https://github.com/oraios/serena)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "serena" not in MCP tools | Check `~/.mcp.json` has `serena` entry with `cmd /c uvx` wrapper |
| "No active project" | Call `activate_project` with the project path first |
| "Cannot extract symbols" on a file | File is likely gitignored. Check `.serena/project.yml` `ignore_all_files_in_gitignore` |
| Symbols empty after activation | Run `onboarding` to bootstrap, then verify with `get_symbols_overview` on a root `.ts` file |
| Missing language support | Install the language server binary (e.g., `npm install -g typescript` for TS) |
| uvx not found | `winget install astral-sh.uv` (Windows) or see [uv docs](https://docs.astral.sh/uv/getting-started/installation/) |
