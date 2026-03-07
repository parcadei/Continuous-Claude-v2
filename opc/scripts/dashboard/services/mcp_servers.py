"""MCP servers pillar service -- parses ~/.claude/settings.json for mcpServers config."""

import json
import logging
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.base import BasePillarService
from dashboard.models import PillarHealth, PillarStatus

logger = logging.getLogger(__name__)

CLAUDE_HOME = Path.home() / ".claude"
DEFAULT_SETTINGS_PATH = CLAUDE_HOME / "settings.json"


class MCPServersPillarService(BasePillarService):
    """Service for reading MCP server configurations from settings.json."""

    def __init__(self, settings_path: Path | None = None):
        super().__init__("mcp-servers")
        self._settings_path = settings_path or DEFAULT_SETTINGS_PATH

    def _load_settings(self) -> dict[str, Any] | None:
        """Load and parse settings.json, returning None on any failure."""
        if not self._settings_path.exists():
            return None
        try:
            return json.loads(self._settings_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to load settings.json: {e}")
            return None

    def get_servers(self) -> list[dict[str, Any]]:
        """Parse mcpServers section and return normalized server list.

        Each server dict contains:
          - name: str
          - command: str | None
          - args: list[str]
          - transport: "stdio" | "http" | "sse"
          - enabled: bool
          - url: str | None (for http/sse transport)
          - env_keys: list[str] (env var names, values masked)
        """
        settings = self._load_settings()
        if not settings:
            return []

        mcp_servers = settings.get("mcpServers", {})
        if not isinstance(mcp_servers, dict):
            return []

        result: list[dict[str, Any]] = []
        for name, config in mcp_servers.items():
            if not isinstance(config, dict):
                continue

            # Determine transport type
            transport = config.get("type", "stdio")
            if transport not in ("stdio", "http", "sse"):
                transport = "stdio"

            # Determine enabled status (default True if not explicitly disabled)
            enabled = not config.get("disabled", False)

            # Extract env var key names (mask values)
            env_keys = list(config.get("env", {}).keys()) if isinstance(config.get("env"), dict) else []

            server: dict[str, Any] = {
                "name": name,
                "command": config.get("command"),
                "args": config.get("args", []),
                "transport": transport,
                "enabled": enabled,
                "env_keys": env_keys,
            }

            # Include URL for http/sse transports
            if transport in ("http", "sse"):
                server["url"] = config.get("url")

            result.append(server)

        return result

    async def get_details(self) -> dict[str, Any]:
        """Get full MCP server details for the detail panel."""
        servers = self.get_servers()
        enabled_count = sum(1 for s in servers if s["enabled"])
        disabled_count = sum(1 for s in servers if not s["enabled"])

        return {
            "servers": servers,
            "total": len(servers),
            "enabled_count": enabled_count,
            "disabled_count": disabled_count,
        }

    async def check_health(self) -> PillarHealth:
        """Check MCP servers pillar health based on config presence."""
        servers = self.get_servers()

        if not servers:
            return PillarHealth(
                name=self._name,
                status=PillarStatus.OFFLINE,
                count=0,
                error="No MCP servers configured or settings.json not found",
            )

        enabled = sum(1 for s in servers if s["enabled"])
        if enabled == 0:
            return PillarHealth(
                name=self._name,
                status=PillarStatus.DEGRADED,
                count=len(servers),
                error="All MCP servers are disabled",
            )

        return PillarHealth(
            name=self._name,
            status=PillarStatus.ONLINE,
            count=len(servers),
        )
