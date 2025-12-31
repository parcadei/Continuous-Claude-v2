# src/ - Source Code Overview

## Directory Structure

```
src/
├── __init__.py           # Package marker
├── prompts/              # LLM prompt templates
│   └── generate_test_params.txt
├── mcp_execution/        # MCP execution package
│   └── __init__.py
└── runtime/              # Core runtime (12 modules)
    ├── mcp_client.py     # MCP Client Manager
    ├── harness.py        # Script execution
    ├── config.py         # Configuration models
    ├── exceptions.py     # Exception hierarchy
    ├── generate_wrappers.py
    ├── discover_schemas.py
    ├── schema_utils.py
    ├── schema_inference.py
    ├── normalize_fields.py
    ├── env_utils.py
    └── generate_test_params.py
```

## Module Purposes

| Module | Purpose |
|--------|---------|
| **runtime/** | Core MCP execution engine |
| **prompts/** | LLM prompt templates |
| **mcp_execution/** | Public interface package |

## Key Design Patterns

1. **State Machine**: Explicit `ConnectionState` for client lifecycle
2. **Lazy Loading**: Servers connect on first `call_tool()`, not init
3. **Tool Caching**: Avoid repeated `list_tools()` calls
4. **Progressive Disclosure**: Generated wrappers (schema → Pydantic)
5. **Defensive Unwrapping**: Handle MCP response envelopes
6. **Field Normalization**: Server-specific casing (ADO PascalCase)

## Execution Flow

```
User runs script → harness.py initializes
→ Loads .env and .mcp.json
→ Creates McpClientManager (UNINITIALIZED)
→ Script imports tools
→ First call_tool(): UNINITIALIZED → INITIALIZED → CONNECTED
→ Script completes → Cleanup
```

## Commands

```bash
uv run mcp-generate    # Generate wrappers
uv run mcp-discover    # Discover schemas
uv run mcp-exec script.py  # Execute with MCP
```

## Configuration

Supports 3 transports: **stdio**, **SSE**, **HTTP**

Environment: `${VAR}` and `${VAR:-default}` expansion
