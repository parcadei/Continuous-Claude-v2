"""File claims router for active file lock monitoring."""

import logging
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from core.db.postgres_pool import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/file-claims", tags=["file-claims"])

# Only show claims from sessions with heartbeat in last 5 minutes
ACTIVE_THRESHOLD_MINUTES = 5


@router.get("/active")
async def get_active_claims() -> dict[str, Any]:
    """Return active file claims joined with session data.

    Active means the owning session has a heartbeat within the last 5 minutes.
    Results are grouped by project for the frontend panel.

    Returns:
        Dict with claims list, total count, and by_project grouping.
    """
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT
                    fc.file_path,
                    fc.session_id,
                    s.project,
                    fc.claimed_at
                FROM file_claims fc
                JOIN sessions s ON fc.session_id = s.id
                WHERE fc.released_at IS NULL
                  AND s.last_heartbeat > NOW() - INTERVAL '5 minutes'
                ORDER BY fc.claimed_at DESC
                """
            )

        claims = []
        by_project: dict[str, int] = defaultdict(int)

        for row in rows:
            claimed_at_iso = None
            if row["claimed_at"]:
                ca = row["claimed_at"]
                if ca.tzinfo is None:
                    ca = ca.replace(tzinfo=timezone.utc)
                claimed_at_iso = ca.isoformat()

            project = row["project"] or "Unknown"
            by_project[project] += 1

            claims.append({
                "file_path": row["file_path"],
                "session_id": row["session_id"],
                "project": project,
                "claimed_at": claimed_at_iso,
            })

        return {
            "claims": claims,
            "total": len(claims),
            "by_project": dict(by_project),
        }

    except Exception as e:
        logger.warning(f"Failed to fetch active file claims: {e}")
        return {
            "claims": [],
            "total": 0,
            "by_project": {},
            "error": str(e),
        }
