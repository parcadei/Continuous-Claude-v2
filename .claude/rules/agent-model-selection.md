# Agent Model Selection

**Default:** Omit `model` parameter - agents inherit parent model (usually Opus).

## When to use Haiku

Only use `model: haiku` for truly mechanical tasks:

- Simple file formatting
- Single-file renames
- Trivial string replacements
- Repetitive bulk operations

## Never use Haiku for

- **scout** - Needs accuracy for codebase exploration
- **oracle** - External research requires comprehension
- **architect/phoenix** - Planning requires nuanced judgment
- **kraken** - Implementation needs to understand context
- **Any exploration/research task** - Understanding > speed

## Why This Matters

Haiku optimizes for cost/latency at the expense of accuracy. Research tasks often seem "quick" but require tracing relationships across files. A cheap model that misses connections wastes more time than it saves.

## Rule

When in doubt, **omit the model parameter**. Let the agent inherit Opus.
