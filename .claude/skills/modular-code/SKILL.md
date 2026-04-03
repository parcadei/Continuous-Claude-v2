---
name: modular-code
description: Modular Code Organization
user-invocable: false
---

# Modular Code Organization

Write modular Python code with files sized for maintainability and AI-assisted development.

## When to Use

This skill is invoked when organizing or refactoring Python code. Not user-invocable directly.

## File Size Guidelines

| Lines | Status | Action |
|-------|--------|--------|
| 150-500 | Optimal | Sweet spot for AI code editors and human comprehension |
| 500-1000 | Large | Look for natural split points |
| 1000-2000 | Too large | Refactor into focused modules |
| 2000+ | Critical | Must split - causes tooling issues and cognitive overload |

## When to Split

Split when ANY of these apply:
- File exceeds 500 lines
- Multiple unrelated concerns in same file
- Scroll fatigue finding functions
- Tests for the file are hard to organize
- AI tools truncate or miss context

## How to Split

### Natural Split Points

1. **By domain concept**: `auth.py` → `auth/login.py`, `auth/tokens.py`, `auth/permissions.py`
2. **By abstraction layer**: Separate interface from implementation
3. **By data type**: Group operations on related data structures
4. **By I/O boundary**: Isolate database, API, file operations

### Package Structure

```
feature/
├── __init__.py      # Keep minimal, just exports
├── core.py          # Main logic (under 500 lines)
├── models.py        # Data structures
├── handlers.py      # I/O and side effects
└── utils.py         # Pure helper functions
```

## DO

- Use meaningful module names (`data_storage.py` not `utils2.py`)
- Keep `__init__.py` files minimal or empty
- Group related functions together
- Isolate pure functions from side effects
- Use snake_case for module names

## DON'T

- Split files arbitrarily by line count alone
- Create single-function modules
- Over-modularize into "package hell"
- Use dots or special characters in module names
- Hide dependencies with "magic" imports

## Refactoring Large Files

When splitting an existing large file:

1. **Identify clusters**: Find groups of related functions
2. **Extract incrementally**: Move one cluster at a time
3. **Update imports**: Fix all import statements
4. **Run tests**: Verify nothing broke after each move
5. **Document**: Update any references to old locations

## Current Codebase Candidates

Files over 2000 lines that need attention:
- Math compute modules (scipy, mpmath, numpy) - domain-specific, may be acceptable
- patterns.py - consider splitting by pattern type
- memory_backfill.py - consider splitting by operation type

## Sources

- [The Hitchhiker's Guide to Python](https://docs.python-guide.org/writing/structure/)
- [Python Project Best Practices - Dagster](https://dagster.io/blog/python-project-best-practices)
- [Right-Sizing Python Files for AI Editors](https://medium.com/@eamonn.faherty_58176/right-sizing-your-python-files-the-150-500-line-sweet-spot-for-ai-code-editors-340d550dcea4)
- [PEP 8 Style Guide](https://peps.python.org/pep-0008/)
