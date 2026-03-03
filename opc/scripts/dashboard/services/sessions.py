"""Sessions service for listing active Claude sessions.

Queries the sessions, file_claims, and agent_runs tables
to provide a unified view of all Claude sessions.
"""
from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from core.db.postgres_pool import get_pool

logger = logging.getLogger(__name__)

# Status thresholds in minutes
ACTIVE_THRESHOLD = 5
IDLE_THRESHOLD = 60


def _derive_status(last_heartbeat: datetime | None) -> str:
    """Derive session status from heartbeat age."""
    if not last_heartbeat:
        return "stale"
    now = datetime.now(timezone.utc)
    # Handle naive datetimes from DB
    if last_heartbeat.tzinfo is None:
        last_heartbeat = last_heartbeat.replace(tzinfo=timezone.utc)
    age_minutes = (now - last_heartbeat).total_seconds() / 60
    if age_minutes < ACTIVE_THRESHOLD:
        return "active"
    elif age_minutes < IDLE_THRESHOLD:
        return "idle"
    return "stale"


class SessionsService:
    """Service for listing and inspecting Claude sessions."""

    async def list_sessions(self, include_stale: bool = True) -> dict[str, Any]:
        """List all sessions with file claims and agent summaries.

        Args:
            include_stale: Whether to include sessions older than 60 minutes.

        Returns:
            Dict with sessions list and summary counts.
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Fetch sessions
                rows = await conn.fetch(
                    "SELECT id, project, working_on, last_heartbeat, started_at "
                    "FROM sessions ORDER BY last_heartbeat DESC"
                )

                sessions = []
                counts = {"active": 0, "idle": 0, "stale": 0}

                for row in rows:
                    status = _derive_status(row["last_heartbeat"])
                    if not include_stale and status == "stale":
                        continue

                    counts[status] = counts.get(status, 0) + 1

                    # Heartbeat age in human-readable form
                    heartbeat_iso = None
                    if row["last_heartbeat"]:
                        hb = row["last_heartbeat"]
                        if hb.tzinfo is None:
                            hb = hb.replace(tzinfo=timezone.utc)
                        heartbeat_iso = hb.isoformat()

                    sessions.append({
                        "id": row["id"],
                        "project": row["project"],
                        "working_on": row["working_on"],
                        "status": status,
                        "last_heartbeat": heartbeat_iso,
                        "started_at": row["started_at"].isoformat() if row["started_at"] else None,
                    })

                # Fetch file claims grouped by session
                claims_rows = await conn.fetch(
                    "SELECT session_id, file_path, claimed_at FROM file_claims "
                    "ORDER BY claimed_at DESC"
                )
                claims_by_session: dict[str, list[dict]] = {}
                for cr in claims_rows:
                    sid = cr["session_id"]
                    if sid not in claims_by_session:
                        claims_by_session[sid] = []
                    claims_by_session[sid].append({
                        "file_path": cr["file_path"],
                        "claimed_at": cr["claimed_at"].isoformat() if cr["claimed_at"] else None,
                    })

                # Fetch agent run counts by session (if table exists)
                agent_by_session: dict[str, dict] = {}
                table_exists = await conn.fetchval(
                    "SELECT EXISTS (SELECT FROM information_schema.tables "
                    "WHERE table_name = 'agent_runs')"
                )
                if table_exists:
                    agent_rows = await conn.fetch(
                        "SELECT session_id, COUNT(*) as cnt, "
                        "COUNT(*) FILTER (WHERE status = 'failed') as failed "
                        "FROM agent_runs GROUP BY session_id"
                    )
                    for ar in agent_rows:
                        agent_by_session[ar["session_id"]] = {
                            "total": ar["cnt"],
                            "failed": ar["failed"],
                        }

                # Attach to sessions
                for s in sessions:
                    s["file_claims"] = claims_by_session.get(s["id"], [])
                    s["agent_summary"] = agent_by_session.get(s["id"], {"total": 0, "failed": 0})

                return {
                    "sessions": sessions,
                    "counts": counts,
                    "total": len(sessions),
                }

        except Exception as e:
            logger.warning(f"Sessions list failed: {e}")
            return {
                "sessions": [],
                "counts": {"active": 0, "idle": 0, "stale": 0},
                "total": 0,
                "error": str(e),
            }

    async def get_session(self, session_id: str) -> dict[str, Any] | None:
        """Get detailed info for a single session."""
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT id, project, working_on, last_heartbeat, started_at "
                    "FROM sessions WHERE id = $1",
                    session_id,
                )
                if not row:
                    return None

                status = _derive_status(row["last_heartbeat"])
                heartbeat_iso = None
                if row["last_heartbeat"]:
                    hb = row["last_heartbeat"]
                    if hb.tzinfo is None:
                        hb = hb.replace(tzinfo=timezone.utc)
                    heartbeat_iso = hb.isoformat()

                claims = await conn.fetch(
                    "SELECT file_path, claimed_at FROM file_claims "
                    "WHERE session_id = $1 ORDER BY claimed_at DESC",
                    session_id,
                )

                agent_runs = []
                table_exists = await conn.fetchval(
                    "SELECT EXISTS (SELECT FROM information_schema.tables "
                    "WHERE table_name = 'agent_runs')"
                )
                if table_exists:
                    agent_runs = await conn.fetch(
                        "SELECT agent_type, status, started_at, finished_at "
                        "FROM agent_runs WHERE session_id = $1 "
                        "ORDER BY started_at DESC LIMIT 20",
                        session_id,
                    )

                return {
                    "id": row["id"],
                    "project": row["project"],
                    "working_on": row["working_on"],
                    "status": status,
                    "last_heartbeat": heartbeat_iso,
                    "started_at": row["started_at"].isoformat() if row["started_at"] else None,
                    "file_claims": [
                        {"file_path": c["file_path"], "claimed_at": c["claimed_at"].isoformat() if c["claimed_at"] else None}
                        for c in claims
                    ],
                    "agent_runs": [
                        {
                            "agent_type": a["agent_type"],
                            "status": a["status"],
                            "started_at": a["started_at"].isoformat() if a["started_at"] else None,
                            "finished_at": a["finished_at"].isoformat() if a["finished_at"] else None,
                        }
                        for a in agent_runs
                    ],
                }

        except Exception as e:
            logger.warning(f"Session detail failed: {e}")
            return None
