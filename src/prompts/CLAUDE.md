# src/prompts/ - Prompt Templates

Contains Jinja2 templates for LLM-based code generation.

## Files

### `generate_test_params.txt`

Template for Claude LLM to generate minimal test parameters from MCP tool schemas.

**Variables**:
- `{tool_name}` - Name of MCP tool
- `{description_line}` - Tool description
- `{schema_json}` - Tool's JSON Schema (inputSchema)

**Output**: Valid JSON with minimal values (empty strings, 0, 1, [], {})

**Used by**: `src/runtime/generate_test_params.py`

## Generation Workflow

```
Tool Definition → Template Population → Claude LLM → JSON Extraction → Validation
```

## Integration

- **Phase 1**: `uv run mcp-generate-discovery` - Creates `discovery_config.json`
- **Phase 2**: `uv run mcp-discover` - Uses parameters to infer response types
