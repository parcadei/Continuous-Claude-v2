# src/runtime/ - MCP Execution Engine

The core MCP (Model Context Protocol) execution engine providing lazy-loading client management, schema-driven code generation, and script execution harness.

## Key Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `mcp_client.py` | MCP server connection management | `McpClientManager`, `get_mcp_client_manager()`, `call_mcp_tool()` |
| `harness.py` | Script execution entry point | `main()` |
| `config.py` | Configuration validation | `McpConfig`, `ServerConfig` |
| `exceptions.py` | Error hierarchy | `McpExecutionError`, `ToolNotFoundError`, `ToolExecutionError` |
| `generate_wrappers.py` | Generate typed Python wrappers | `generate_tool_wrapper()` |
| `discover_schemas.py` | Infer types from API responses | `discover_server_schemas()` |
| `schema_utils.py` | JSON Schema → Python types | `json_schema_to_python_type()`, `generate_pydantic_model()` |
| `schema_inference.py` | Type inference from data | `infer_pydantic_model_from_response()` |
| `normalize_fields.py` | Field name normalization | `normalize_field_names()` |
| `env_utils.py` | Environment variable utilities | `expand_env_vars()`, `load_project_env()` |
| `generate_test_params.py` | LLM-based test parameter generation | `classify_tool_safety()` |

## State Machine (mcp_client.py)

```
UNINITIALIZED → initialize() → INITIALIZED → call_tool() → CONNECTED
                                                              ↓
                                              cleanup() → UNINITIALIZED
```

- **UNINITIALIZED**: No config loaded
- **INITIALIZED**: Config loaded, no connections
- **CONNECTED**: At least one server connected (lazy on first call)

## Key Patterns

### Lazy Loading
Servers connect only on first `call_tool()`, not on initialization:
```python
manager = get_mcp_client_manager()
await manager.initialize(config_path)  # Just loads config
result = await manager.call_tool("server__tool", {})  # NOW connects
```

### Tool ID Format
`"serverName__toolName"` (double underscore)

### Defensive Unwrapping
Handles MCP response envelopes: `result.value`, `result.content`, raw result

### Field Normalization
Per-server casing (e.g., ADO: `system.title` → `System.title`)

## Configuration

Supports 3 transports in `mcp_config.json`:
- **stdio**: Subprocess-based servers
- **SSE**: Server-sent events
- **HTTP**: Streamable HTTP

Environment variables: `${VAR}` and `${VAR:-default}` expansion

## Commands

```bash
uv run mcp-generate          # Generate wrappers from tool definitions
uv run mcp-discover          # Discover schemas from API responses
uv run mcp-exec script.py    # Execute script with MCP available
```

## Module Dependencies

```
harness.py → mcp_client.py → config.py, exceptions.py, normalize_fields.py
generate_wrappers.py → schema_utils.py
discover_schemas.py → schema_inference.py
```
