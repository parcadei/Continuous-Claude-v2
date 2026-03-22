# Use Scout, Not Explore

For codebase exploration tasks, use `scout` (Sonnet) instead of `Explore` (Haiku).

## Why

- **Explore** uses Haiku - fast but produces inaccurate results
- **Scout** uses Sonnet with a detailed 197-line prompt - accurate results

## When exploring codebases

```
Agent tool with:
  subagent_type: "scout"  ← use this
  NOT: "Explore"          ← not this
```

## Agent alternatives by task

| Task | Use | Not |
|------|-----|-----|
| Codebase exploration | scout | Explore |
| External research | oracle | Explore |
| Pattern finding | scout | Explore |
| Documentation lookup | claude-code-guide | Explore |

If on Opus and need high accuracy, use tools directly (Grep, Glob, Read) instead of spawning agents.
