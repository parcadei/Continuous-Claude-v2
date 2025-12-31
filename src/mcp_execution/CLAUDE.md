# src/mcp_execution/ - Package Definition

Public-facing module for MCP code execution capabilities.

## Structure

```
src/mcp_execution/
└── __init__.py  # Package marker
```

## Purpose

- Marks MCP execution module as a Python package
- Documents MCP execution capabilities
- Entry point for public exports

## Relationship to runtime/

- `mcp_execution` = **public interface** package
- `runtime` = **implementation** package
- Users import from `mcp_execution` at package level
- Implementation details live in `runtime`

## Extension Points

Future additions:
- Public API classes
- Package-level documentation
- Version info (`__version__`)
- Convenience wrappers for common patterns
