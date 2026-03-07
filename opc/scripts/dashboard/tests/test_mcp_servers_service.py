"""Tests for MCP servers service — parses settings.json for mcpServers config."""

import json
import os
import sys
import pytest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


@pytest.fixture
def sample_settings(tmp_path):
    """Create a sample settings.json with MCP server entries."""
    settings = {
        "mcpServers": {
            "git": {
                "type": "stdio",
                "command": "uvx",
                "args": ["mcp-server-git", "--repository", "."],
            },
            "fetch": {
                "type": "stdio",
                "command": "uvx",
                "args": ["mcp-server-fetch"],
            },
            "github": {
                "type": "http",
                "url": "https://api.githubcopilot.com/mcp/",
                "headers": {"Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"},
                "disabled": True,
            },
            "firecrawl": {
                "type": "stdio",
                "command": "npx",
                "args": ["-y", "firecrawl-mcp"],
                "env": {"FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"},
                "disabled": True,
            },
            "pageindex": {
                "type": "stdio",
                "command": "cmd",
                "args": ["/c", "npx", "-y", "@pageindex/mcp"],
            },
        },
        "otherSetting": "should be ignored",
    }
    settings_path = tmp_path / "settings.json"
    settings_path.write_text(json.dumps(settings), encoding="utf-8")
    return settings_path


@pytest.fixture
def empty_settings(tmp_path):
    """Create a settings.json without mcpServers."""
    settings = {"hooks": {}, "permissions": {}}
    settings_path = tmp_path / "settings.json"
    settings_path.write_text(json.dumps(settings), encoding="utf-8")
    return settings_path


@pytest.fixture
def malformed_settings(tmp_path):
    """Create a malformed settings.json."""
    settings_path = tmp_path / "settings.json"
    settings_path.write_text("not valid json {{{", encoding="utf-8")
    return settings_path


class TestMCPServersService:
    """Tests for MCPServersPillarService."""

    def test_parses_all_servers(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        servers = service.get_servers()

        assert len(servers) == 5
        names = [s["name"] for s in servers]
        assert "git" in names
        assert "fetch" in names
        assert "github" in names
        assert "firecrawl" in names
        assert "pageindex" in names

    def test_server_has_required_fields(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        servers = service.get_servers()

        for server in servers:
            assert "name" in server
            assert "command" in server
            assert "args" in server
            assert "transport" in server
            assert "enabled" in server

    def test_stdio_transport_detection(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        servers = service.get_servers()

        git = next(s for s in servers if s["name"] == "git")
        assert git["transport"] == "stdio"
        assert git["command"] == "uvx"
        assert git["args"] == ["mcp-server-git", "--repository", "."]

    def test_http_transport_detection(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        servers = service.get_servers()

        github = next(s for s in servers if s["name"] == "github")
        assert github["transport"] == "http"
        # HTTP servers have a url instead of command
        assert github["url"] == "https://api.githubcopilot.com/mcp/"

    def test_enabled_status(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        servers = service.get_servers()

        git = next(s for s in servers if s["name"] == "git")
        assert git["enabled"] is True

        github = next(s for s in servers if s["name"] == "github")
        assert github["enabled"] is False

        firecrawl = next(s for s in servers if s["name"] == "firecrawl")
        assert firecrawl["enabled"] is False

    def test_missing_settings_file(self, tmp_path):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(
            settings_path=tmp_path / "nonexistent.json"
        )
        servers = service.get_servers()
        assert servers == []

    def test_no_mcp_servers_section(self, empty_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=empty_settings)
        servers = service.get_servers()
        assert servers == []

    def test_malformed_json(self, malformed_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=malformed_settings)
        servers = service.get_servers()
        assert servers == []

    def test_env_vars_not_leaked(self, sample_settings):
        """Env var values should be masked or excluded."""
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        servers = service.get_servers()

        firecrawl = next(s for s in servers if s["name"] == "firecrawl")
        # env should show key names but not raw values
        assert "env_keys" in firecrawl
        assert "FIRECRAWL_API_KEY" in firecrawl["env_keys"]
        # raw env dict should NOT be exposed
        assert "env" not in firecrawl or all(
            "${" in v for v in firecrawl.get("env", {}).values()
        )

    @pytest.mark.asyncio
    async def test_get_details(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        details = await service.get_details()

        assert "servers" in details
        assert "total" in details
        assert "enabled_count" in details
        assert "disabled_count" in details
        assert details["total"] == 5
        assert details["enabled_count"] == 3  # git, fetch, pageindex
        assert details["disabled_count"] == 2  # github, firecrawl

    @pytest.mark.asyncio
    async def test_check_health_online(self, sample_settings):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(settings_path=sample_settings)
        health = await service.check_health()

        assert health.name == "mcp-servers"
        assert health.status.value == "online"
        assert health.count == 5

    @pytest.mark.asyncio
    async def test_check_health_offline_when_no_file(self, tmp_path):
        from dashboard.services.mcp_servers import MCPServersPillarService

        service = MCPServersPillarService(
            settings_path=tmp_path / "nonexistent.json"
        )
        health = await service.check_health()

        assert health.status.value == "offline"
        assert health.count == 0
