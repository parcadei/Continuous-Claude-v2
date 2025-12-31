# Test Suite Guide

## Overview

MCP Execution is tested via unit tests (mocks) and integration tests (real MCP servers). All tests use pytest with async support.

## Test Structure

```
tests/
├── unit/                     # Unit tests with mocks
│   ├── test_mcp_client.py    # State machine, lazy init, caching
│   ├── test_generate_wrappers.py
│   ├── test_normalize_fields.py
│   ├── test_schema_inference.py
│   ├── test_env_loading.py
│   └── ...
├── integration/              # Integration tests with real servers
│   ├── conftest.py           # MCP config fixture, cleanup
│   ├── test_harness_integration.py
│   ├── test_git_server.py
│   └── test_fetch_server.py
├── test_artifact_index.py
└── test_artifact_query.py
```

## Running Tests

```bash
# All tests
pytest

# By category
pytest tests/unit/
pytest tests/integration/

# Specific test
pytest tests/unit/test_mcp_client.py::TestStateTransitions

# With options
pytest -v              # Verbose
pytest -s              # Show prints
pytest -x              # Stop on first failure
```

## Configuration (pyproject.toml)

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
testpaths = ["tests"]
pythonpath = ["src"]
```

## Key Testing Patterns

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

## Test Coverage Areas

| File | Tests |
|------|-------|
| test_mcp_client.py | State machine, lazy init, caching, cleanup |
| test_generate_wrappers.py | JSON schema → Python types |
| test_normalize_fields.py | ADO field normalization |
| test_schema_inference.py | Type inference |
| test_harness_integration.py | Script execution |
| test_git_server.py | git_status, git_log |
| test_fetch_server.py | URL fetching |
