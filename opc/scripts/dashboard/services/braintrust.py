"""Braintrust pillar health service — session analytics from BTQL API."""

import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.base import BasePillarService
from dashboard.models import PillarHealth, PillarStatus

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore[assignment]


def _load_api_key() -> str | None:
    """Load Braintrust API key from environment or .env files."""
    key = os.environ.get("BRAINTRUST_API_KEY")
    if key:
        return key

    for path in [Path.home() / ".claude", Path.cwd()]:
        env_file = path / ".env"
        if env_file.exists():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    if line.startswith("BRAINTRUST_API_KEY="):
                        return line.strip().split("=", 1)[1].strip("\"'")
            except OSError:
                pass
    return None


def _days_ago(n: int = 7) -> str:
    """ISO date string for N days ago."""
    return (datetime.utcnow() - timedelta(days=n)).strftime("%Y-%m-%dT%H:%M:%SZ")


class BraintrustPillarService(BasePillarService):
    """Service for Braintrust session analytics."""

    BTQL_URL = "https://api.braintrust.dev/btql"
    PROJECT_URL = "https://api.braintrust.dev/v1/project"
    CACHE_TTL = 60  # seconds

    def __init__(self):
        super().__init__("braintrust")
        self._api_key = _load_api_key()
        self._project_id: str | None = None
        self._project_name = os.environ.get("BRAINTRUST_CC_PROJECT", "claude-code")
        self._cache: dict[str, tuple[float, Any]] = {}

    def _get_cached(self, key: str) -> Any | None:
        """Get cached value if not expired."""
        if key in self._cache:
            ts, data = self._cache[key]
            if time.time() - ts < self.CACHE_TTL:
                return data
        return None

    def _set_cache(self, key: str, data: Any) -> None:
        self._cache[key] = (time.time(), data)

    async def _resolve_project_id(self) -> str | None:
        """Resolve project name to ID."""
        if self._project_id:
            return self._project_id

        if not self._api_key or not httpx:
            return None

        cached = self._get_cached("project_id")
        if cached:
            self._project_id = cached
            return cached

        headers = {"Authorization": f"Bearer {self._api_key}"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    self.PROJECT_URL,
                    headers=headers,
                    params={"project_name": self._project_name},
                )
                if resp.status_code == 200:
                    projects = resp.json().get("objects", [])
                    if projects:
                        self._project_id = projects[0]["id"]
                        self._set_cache("project_id", self._project_id)
                        return self._project_id

                # Fallback: list all and match
                resp = await client.get(self.PROJECT_URL, headers=headers)
                if resp.status_code == 200:
                    for p in resp.json().get("objects", []):
                        if p.get("name", "").lower() == self._project_name.lower():
                            self._project_id = p["id"]
                            self._set_cache("project_id", self._project_id)
                            return self._project_id
        except Exception:
            pass
        return None

    async def _btql(self, query: str) -> list[dict]:
        """Execute BTQL query against Braintrust logs.

        Args:
            query: SQL query using 'FROM logs' (auto-scoped to project).

        Returns:
            List of result rows.
        """
        project_id = await self._resolve_project_id()
        if not project_id or not self._api_key or not httpx:
            return []

        # Check cache
        cache_key = f"btql:{hash(query)}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        full_query = re.sub(
            r"\bFROM\s+logs\b",
            f"FROM project_logs('{project_id}')",
            query,
            flags=re.IGNORECASE,
        )

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    self.BTQL_URL,
                    headers=headers,
                    json={"query": full_query, "fmt": "json"},
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    self._set_cache(cache_key, data)
                    return data
        except Exception:
            pass
        return []

    async def check_health(self) -> PillarHealth:
        """Check Braintrust connectivity and recent session count.

        Returns:
            ONLINE with session count, DEGRADED if no API key, OFFLINE on error.
        """
        if not self._api_key:
            return PillarHealth(
                name=self.name,
                status=PillarStatus.DEGRADED,
                count=0,
                error="BRAINTRUST_API_KEY not configured",
            )

        if not httpx:
            return PillarHealth(
                name=self.name,
                status=PillarStatus.DEGRADED,
                count=0,
                error="httpx not installed",
            )

        since = _days_ago(7)
        rows = await self._btql(f"""
            SELECT COUNT(DISTINCT root_span_id) as session_count
            FROM logs
            WHERE created > '{since}'
        """)

        if rows:
            count = rows[0].get("session_count", 0)
            return PillarHealth(
                name=self.name,
                status=PillarStatus.ONLINE,
                count=count,
            )

        return PillarHealth(
            name=self.name,
            status=PillarStatus.OFFLINE,
            count=0,
            error="Could not query Braintrust API",
        )

    async def get_details(self) -> dict:
        """Get aggregate Braintrust analytics.

        Returns:
            Dict with total_sessions, total_tool_calls, top_agents, top_skills.
        """
        since = _days_ago(7)

        # Session count
        session_rows = await self._btql(f"""
            SELECT COUNT(DISTINCT root_span_id) as sessions
            FROM logs
            WHERE created > '{since}'
        """)
        total_sessions = session_rows[0].get("sessions", 0) if session_rows else 0

        # Tool call count
        tool_rows = await self._btql(f"""
            SELECT COUNT(*) as tool_calls
            FROM logs
            WHERE span_attributes['type'] = 'tool'
              AND created > '{since}'
        """)
        total_tool_calls = tool_rows[0].get("tool_calls", 0) if tool_rows else 0

        return {
            "total_sessions": total_sessions,
            "total_tool_calls": total_tool_calls,
            "period_days": 7,
        }

    async def weekly_summary(self) -> list[dict]:
        """Daily session + tool call counts for the last 7 days.

        Returns:
            List of {day, sessions, tool_calls} dicts.
        """
        since = _days_ago(7)
        raw = await self._btql(f"""
            SELECT created, root_span_id, span_attributes['type'] as span_type
            FROM logs
            WHERE created > '{since}'
            ORDER BY created
            LIMIT 1000
        """)

        daily: dict[str, dict] = defaultdict(lambda: {"sessions": set(), "tool_calls": 0})
        for row in raw:
            day = str(row.get("created", ""))[:10]
            if day:
                daily[day]["sessions"].add(row.get("root_span_id"))
                if row.get("span_type") == "tool":
                    daily[day]["tool_calls"] += 1

        return [
            {"day": k, "sessions": len(v["sessions"]), "tool_calls": v["tool_calls"]}
            for k, v in sorted(daily.items())
        ]

    async def agent_stats(self) -> list[dict]:
        """Agent usage stats for last 7 days.

        Returns:
            List of {agent, runs, sessions} dicts.
        """
        since = _days_ago(7)
        return await self._btql(f"""
            SELECT
                metadata['agent_type'] as agent,
                COUNT(*) as runs,
                COUNT(DISTINCT root_span_id) as sessions
            FROM logs
            WHERE metadata['agent_type'] IS NOT NULL
              AND created > '{since}'
            GROUP BY 1
            ORDER BY runs DESC
        """)

    async def skill_stats(self) -> list[dict]:
        """Skill usage stats for last 7 days.

        Returns:
            List of {skill, activations, sessions} dicts.
        """
        since = _days_ago(7)
        return await self._btql(f"""
            SELECT
                metadata['skill_name'] as skill,
                COUNT(*) as activations,
                COUNT(DISTINCT root_span_id) as sessions
            FROM logs
            WHERE metadata['skill_name'] IS NOT NULL
              AND created > '{since}'
            GROUP BY 1
            ORDER BY activations DESC
        """)

    async def recent_sessions(self, limit: int = 10) -> list[dict]:
        """List recent sessions.

        Args:
            limit: Max sessions to return.

        Returns:
            List of {session_id, started, ended, span_count, tool_count} dicts.
        """
        return await self._btql(f"""
            SELECT
                root_span_id as session_id,
                MIN(created) as started,
                MAX(created) as ended,
                COUNT(*) as span_count
            FROM logs
            GROUP BY root_span_id
            ORDER BY started DESC
            LIMIT {limit}
        """)
