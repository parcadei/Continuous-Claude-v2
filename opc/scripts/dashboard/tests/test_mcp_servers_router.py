"""Tests for MCP servers router endpoints.

Uses a standalone FastAPI app with just the mcp_servers router to avoid
the dashboard.main import-path issue that affects all router tests in this
project.
"""

import os
import sys
import pytest
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


MOCK_DETAILS = {
    "servers": [
        {
            "name": "git",
            "command": "uvx",
            "args": ["mcp-server-git"],
            "transport": "stdio",
            "enabled": True,
            "env_keys": [],
        },
        {
            "name": "github",
            "command": None,
            "args": [],
            "transport": "http",
            "url": "https://api.githubcopilot.com/mcp/",
            "enabled": False,
            "env_keys": [],
        },
    ],
    "total": 2,
    "enabled_count": 1,
    "disabled_count": 1,
}


@pytest.fixture
def mock_mcp_service():
    """Create a mock MCP servers service and patch it before router import."""
    mock_service = AsyncMock()
    mock_service.get_details.return_value = MOCK_DETAILS
    with patch("dashboard.routers.mcp_servers._service", mock_service):
        yield mock_service


@pytest.fixture
def client(mock_mcp_service):
    """Create a minimal test client with just the MCP servers router."""
    from dashboard.routers.mcp_servers import router

    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as c:
        yield c


class TestMCPServersEndpoint:
    """Tests for GET /api/mcp-servers."""

    def test_returns_200(self, client):
        response = client.get("/api/mcp-servers")
        assert response.status_code == 200

    def test_returns_server_list(self, client):
        response = client.get("/api/mcp-servers")
        data = response.json()

        assert "servers" in data
        assert "total" in data
        assert "enabled_count" in data
        assert "disabled_count" in data
        assert len(data["servers"]) == 2

    def test_server_has_fields(self, client):
        response = client.get("/api/mcp-servers")
        data = response.json()
        server = data["servers"][0]

        assert "name" in server
        assert "transport" in server
        assert "enabled" in server

    def test_handles_service_error(self, client, mock_mcp_service):
        mock_mcp_service.get_details.side_effect = Exception("boom")
        response = client.get("/api/mcp-servers")
        assert response.status_code == 503
