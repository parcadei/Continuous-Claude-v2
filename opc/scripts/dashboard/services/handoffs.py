"""Handoffs pillar health service.

Provides health checks and statistics for handoffs from:
1. Database handoffs table (if it exists)
2. HANDOFF-*.md files in .claude/ directory
"""
from __future__ import annotations

import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from core.db.postgres_pool import get_pool
from dashboard.models import PillarHealth, PillarStatus
from dashboard.services.base import BasePillarService

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent
HANDOFF_PATTERN = "HANDOFF-*.md"
THOUGHTS_HANDOFFS_DIR = Path(os.environ.get(
    "THOUGHTS_HANDOFFS_DIR",
    str(Path.home() / "thoughts" / "shared" / "handoffs")
))


def _collect_all_handoff_files() -> list[tuple[Path, str]]:
    """Collect handoff files from all known directories.

    Scans:
    1. PROJECT_ROOT/.claude/ for HANDOFF-*.md (legacy pattern)
    2. ~/thoughts/shared/handoffs/ recursively for *.md, *.yaml, *.yml

    Returns:
        List of (path, source_label) tuples, deduplicated by filename stem.
    """
    seen_stems: set[str] = set()
    results: list[tuple[Path, str]] = []

    # Legacy: .claude/HANDOFF-*.md
    claude_dir = PROJECT_ROOT / ".claude"
    if claude_dir.exists():
        for f in claude_dir.glob(HANDOFF_PATTERN):
            if f.stem not in seen_stems:
                seen_stems.add(f.stem)
                results.append((f, "claude"))

    # Primary: thoughts/shared/handoffs/ (recursive)
    if THOUGHTS_HANDOFFS_DIR.exists():
        for ext in ("*.md", "*.yaml", "*.yml"):
            for f in THOUGHTS_HANDOFFS_DIR.rglob(ext):
                if f.stem not in seen_stems:
                    seen_stems.add(f.stem)
                    results.append((f, "thoughts"))

    return results


class HandoffsPillarService(BasePillarService):
    """Service for checking handoffs pillar health."""

    def __init__(self):
        """Initialize the handoffs pillar service."""
        super().__init__("handoffs")
        self._claude_dir = PROJECT_ROOT / ".claude"

    async def check_health(self) -> PillarHealth:
        """Check health of the handoffs pillar.

        Combines counts from:
        - handoffs table (if exists)
        - HANDOFF-*.md files in .claude/ directory

        Returns:
            PillarHealth with ONLINE status if either source available.
        """
        db_count = 0
        file_count = 0
        db_available = False
        files_available = False
        last_activity = None
        errors = []

        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                db_count = await conn.fetchval("SELECT COUNT(*) FROM handoffs") or 0
                db_available = True
                last_activity = await conn.fetchval(
                    "SELECT MAX(created_at) FROM handoffs"
                )
        except Exception as e:
            error_msg = str(e)
            if "does not exist" not in error_msg:
                errors.append(f"DB: {error_msg}")
            logger.debug(f"Handoffs DB check: {e}")

        try:
            all_files = _collect_all_handoff_files()
            file_count = len(all_files)
            files_available = True

            if all_files and not last_activity:
                newest = max(all_files, key=lambda t: t[0].stat().st_mtime)
                last_activity = datetime.fromtimestamp(newest[0].stat().st_mtime)
        except Exception as e:
            errors.append(f"Files: {str(e)}")
            logger.debug(f"Handoffs file check: {e}")

        total_count = db_count + file_count
        is_online = db_available or files_available

        return PillarHealth(
            name="handoffs",
            status=PillarStatus.ONLINE if is_online else PillarStatus.OFFLINE,
            count=total_count,
            last_activity=last_activity,
            error="; ".join(errors) if errors and not is_online else None,
        )

    async def get_details(self) -> dict[str, Any]:
        """Get detailed information about handoffs.

        Returns:
            Dict with:
            - db_handoffs: Recent handoffs from database
            - file_handoffs: List of HANDOFF-*.md files
        """
        details: dict[str, Any] = {}

        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, name, created_at
                    FROM handoffs
                    ORDER BY created_at DESC
                    LIMIT 10
                    """
                )
                details["recent_handoffs"] = [
                    {
                        "id": row["id"],
                        "name": row["name"],
                        "created_at": row["created_at"].isoformat()
                        if row["created_at"]
                        else None,
                    }
                    for row in rows
                ]
        except Exception as e:
            logger.debug(f"Handoffs details DB fetch failed: {e}")

        try:
            all_files = _collect_all_handoff_files()
            details["file_handoffs"] = [
                {
                    "name": f.name,
                    "path": str(f),
                    "source": source,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                }
                for f, source in sorted(
                    all_files, key=lambda t: t[0].stat().st_mtime, reverse=True
                )
            ]
        except Exception as e:
            logger.debug(f"Handoffs file details fetch failed: {e}")

        return details
