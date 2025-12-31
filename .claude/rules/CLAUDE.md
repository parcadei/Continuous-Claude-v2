# Rules System

Operational guidelines Claude follows automatically. Always active, context-sensitive.

## What is a Rule?

- **Always active** - Applied every session
- **Structural** - Triggered by context, not keywords
- **Guideline** - Describes how to work
- **Persistent** - Applies across all conversations

## Rule Format

```yaml
---
globs: ["src/**/*.ts"]  # Optional file patterns
---

# Rule Name

Description of what to do and why...
```

## Available Rules

| Rule | Purpose |
|------|---------|
| `agent-orchestration.md` | When to use agents vs direct execution |
| `continuity.md` | Multi-phase work tracking with ledgers |
| `git-commits.md` | Git commit patterns and verification |
| `search-tools.md` | Search tool selection (Grep, Glob, Read) |
| `observe-before-editing.md` | Always read context before changes |
| `skill-development.md` | Creating new skills |
| `mcp-scripts.md` | Writing MCP scripts with argparse |
| `idempotent-redundancy.md` | Safe operational patterns |
| `explicit-identity.md` | Project identity markers |
| `index-at-creation.md` | Immediate indexing |
| `hooks.md` | Working with hooks |

## Key Rules

### agent-orchestration.md
- Agents for multi-file complexity
- Direct for single-line fixes
- Preserves main context (2000+ → ~200 tokens)

### continuity.md
- Ledger location: `thoughts/ledgers/CONTINUITY_CLAUDE-*.md`
- Checkbox states: `[x]` done, `[→]` in progress, `[ ]` pending
- Survives `/clear` with full fidelity

### search-tools.md
- **Glob**: Find files by pattern
- **Grep**: Search contents with regex
- **Read**: Read specific known files
- **NOT Bash**: Don't use bash for grep/find

## Rules vs Skills

| Aspect | Rules | Skills |
|--------|-------|--------|
| Purpose | Follow a pattern | Do a task |
| Activation | Always active | Triggered by prompts |
| Scope | Operational guidelines | Single workflow |
