---
name: async-repl-protocol
description: Async REPL Protocol
user-invocable: false
---

# Async REPL Protocol

When working with Agentica's async REPL harness for testing.

## Rules

### 1. Use `await` for Future-returning tools

```python
content = await view_file(path)  # NOT view_file(path)
answer = await ask_memory("...")
```

### 2. Single code block per response

Compute AND return in ONE block. Multiple blocks means only first executes.

```python
# GOOD: Single block
content = await view_file(path)
return any(c.isdigit() for c in content)

# BAD: Split blocks (second block never runs)
content = await view_file(path)
