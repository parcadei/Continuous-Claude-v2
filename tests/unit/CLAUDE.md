# Unit Tests

Unit tests verify MCP client state machine, type conversion, field normalization, and schema inference using mocks. No external servers required.

## Test Files

| File | Purpose |
|------|---------|
| `test_mcp_client.py` | State machine, lazy init, tool caching, cleanup, response handling |
| `test_generate_wrappers.py` | JSON schema → Python type conversion |
| `test_normalize_fields.py` | ADO field normalization (system.* → System.*) |
| `test_schema_inference.py` | Type inference from response objects |
| `test_env_loading.py` | ${VAR} expansion, .env file loading |
| `test_discover_schemas_mock.py` | Schema discovery with mocks |
| `test_generate_test_params.py` | Test parameter generation |
| `test_artifact_schema.py` | Artifact structure validation |

## Key Test Patterns

### Async Tests
```python
@pytest.mark.asyncio
async def test_something():
    result = await some_async_function()
    assert result is not None
```

### Mocking MCP Components
```python
from unittest.mock import AsyncMock, patch

@patch("runtime.mcp_client.stdio_client")
async def test_with_mocks(mock_stdio):
    mock_session = AsyncMock()
    # ...
```

### Error Testing
```python
with pytest.raises(ToolNotFoundError, match="pattern"):
    await manager.call_tool("unknown__tool", {})
```

## Running Tests

```bash
pytest tests/unit/                    # All unit tests
pytest tests/unit/test_mcp_client.py  # Specific file
pytest tests/unit/ -v                 # Verbose
pytest tests/unit/ -s                 # Show print statements
```
