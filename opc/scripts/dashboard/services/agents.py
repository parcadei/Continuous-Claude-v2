"""Agents pillar service -- parses skill-telemetry.jsonl for agent spawn events."""

import asyncio
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
DEFAULT_TELEMETRY_PATH = CLAUDE_HOME / "cache" / "skill-telemetry.jsonl"
DEFAULT_AGENTS_DIR = CLAUDE_HOME / "cache" / "agents"


class AgentsPillarService(BasePillarService):
    """Service for agent spawn telemetry and agent type discovery."""

    def __init__(
        self,
        telemetry_path: Path | None = None,
        agents_dir: Path | None = None,
    ):
        super().__init__("agents")
        self._telemetry_path = telemetry_path or DEFAULT_TELEMETRY_PATH
        self._agents_dir = agents_dir or DEFAULT_AGENTS_DIR

    def _parse_telemetry(self) -> dict[str, Any]:
        """Parse skill-telemetry.jsonl for agent_spawned events.

        Returns a dict with:
          - by_agent: {agent_name: count}
          - total_spawns: int
          - success_count: int
          - failure_count: int
          - unique_sessions: int
          - recent_spawns: list of most recent events (up to 20)
        """
        by_agent: dict[str, int] = {}
        success_count = 0
        failure_count = 0
        sessions: set[str] = set()
        spawn_events: list[dict[str, Any]] = []

        if not self._telemetry_path.exists():
            return {
                "by_agent": {},
                "total_spawns": 0,
                "success_count": 0,
                "failure_count": 0,
                "unique_sessions": 0,
                "recent_spawns": [],
            }

        try:
            text = self._telemetry_path.read_text(encoding="utf-8")
        except OSError as e:
            logger.warning("Failed to read telemetry file: %s", e)
            return {
                "by_agent": {},
                "total_spawns": 0,
                "success_count": 0,
                "failure_count": 0,
                "unique_sessions": 0,
                "recent_spawns": [],
            }

        for line in text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue

            if event.get("type") != "agent_spawned":
                continue

            name = event.get("name", "unknown")
            by_agent[name] = by_agent.get(name, 0) + 1

            if event.get("success", True):
                success_count += 1
            else:
                failure_count += 1

            session_id = event.get("session_id", "")
            if session_id:
                sessions.add(session_id)

            spawn_events.append({
                "timestamp": event.get("timestamp", ""),
                "name": name,
                "session_id": session_id,
                "success": event.get("success", True),
            })

        # Sort by timestamp descending, take 20 most recent
        spawn_events.sort(key=lambda e: e["timestamp"], reverse=True)
        recent = spawn_events[:20]

        return {
            "by_agent": by_agent,
            "total_spawns": success_count + failure_count,
            "success_count": success_count,
            "failure_count": failure_count,
            "unique_sessions": len(sessions),
            "recent_spawns": recent,
        }

    def _list_agent_types(self) -> list[str]:
        """List agent type names from ~/.claude/cache/agents/ subdirectories."""
        if not self._agents_dir.exists():
            return []

        try:
            return sorted(
                d.name
                for d in self._agents_dir.iterdir()
                if d.is_dir()
            )
        except OSError as e:
            logger.warning("Failed to list agent types: %s", e)
            return []

    async def get_details(self) -> dict[str, Any]:
        """Get full agent detail data: telemetry + registered types."""
        telemetry = await asyncio.to_thread(self._parse_telemetry)
        agent_types = await asyncio.to_thread(self._list_agent_types)

        return {
            "telemetry": telemetry,
            "agent_types": agent_types,
        }

    async def check_health(self) -> PillarHealth:
        """Check agent health based on telemetry availability."""
        telemetry = await asyncio.to_thread(self._parse_telemetry)

        if telemetry["total_spawns"] == 0 and not self._telemetry_path.exists():
            return PillarHealth(
                name=self.name,
                status=PillarStatus.OFFLINE,
                count=0,
                error="No telemetry data found",
            )

        status = PillarStatus.ONLINE
        if telemetry["failure_count"] > telemetry["success_count"] * 0.2:
            status = PillarStatus.DEGRADED

        return PillarHealth(
            name=self.name,
            status=status,
            count=telemetry["total_spawns"],
        )
