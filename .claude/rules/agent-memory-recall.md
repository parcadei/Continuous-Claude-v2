# Agent Memory Recall

Before starting implementation tasks, agents should check for relevant learnings.

## When to Recall

Agents (kraken, architect, phoenix, spark) should consider running:

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py --query "<task keywords>" --k 3 --text-only
```

This is especially useful when:
- Implementing features similar to past work
- Working with hooks, skills, or wizard code
- Debugging errors that may have been solved before

## Quick Check

If the memory-awareness hook showed a MEMORY MATCH in context, the learning is likely relevant. Use the provided `/recall` skill for full content.
