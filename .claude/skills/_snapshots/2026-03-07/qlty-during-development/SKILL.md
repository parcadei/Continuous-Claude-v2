---
name: qlty-during-development
description: QLTY During Development
user-invocable: false
---

# QLTY During Development

Run QLTY checks during code writing to catch issues early.

## When to Run

Run QLTY after significant code changes:
- After completing a new file
- After substantial edits to existing files
- Before committing changes

## Commands

```bash
# Quick lint check
qlty check

# Format code
qlty fmt

# Check specific files
qlty check src/sdk/providers.ts

# Auto-fix issues
qlty check --fix
```

## Integration Pattern

After writing code:
1. Run `qlty check` on changed files
2. If errors, fix them before proceeding
3. Run `qlty fmt` to ensure formatting

## Don't Run When

- Just reading/exploring code
- Making single-line typo fixes
- In the middle of multi-file refactoring (run at end)
