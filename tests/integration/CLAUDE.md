# Integration Tests

Integration tests call real MCP servers (git, fetch) to verify end-to-end behavior.

## Requirements

- `mcp_config.json` in project root with server definitions
- Git repository (for git server tests)
- Network access (for fetch server tests)
- Node.js (MCP servers run via npx)

## Test Files

| File | Purpose |
|------|---------|
| `test_harness_integration.py` | Script execution via harness (subprocess) |
| `test_git_server.py` | git_status, git_log with real git server |
| `test_fetch_server.py` | URL fetching with real fetch server |
| `conftest.py` | MCP config fixture, manager cleanup |

## conftest.py Fixtures

```python
@pytest.fixture(scope="session", autouse=True)
def mcp_config_for_tests():
    """Verify .mcp.json or mcp_config.json exists."""

@pytest.fixture(autouse=True)
async def cleanup_mcp_manager():
    """Cleanup MCP client manager after each test."""
    yield
    # Cleanup: manager.cleanup() + cache_clear()
```

## Running Tests

```bash
pytest tests/integration/                  # All integration tests
pytest tests/integration/test_git_server.py  # Specific file
pytest tests/integration/ -v               # Verbose
```

## Writing New Integration Tests

```python
@pytest.mark.asyncio
async def test_my_integration():
    manager = get_mcp_client_manager()
    config_path = Path.cwd() / "mcp_config.json"
    await manager.initialize(config_path)

    result = await manager.call_tool("server__tool", {"param": "value"})
    assert result is not None
```
