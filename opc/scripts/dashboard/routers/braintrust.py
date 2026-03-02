"""Braintrust drill-down router for session analytics."""

import logging
import os
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.braintrust import BraintrustPillarService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pillars/braintrust", tags=["braintrust"])

_service = BraintrustPillarService()


@router.get("/weekly-summary")
async def get_weekly_summary() -> dict[str, Any]:
    """Get daily session + tool call counts for the last 7 days.

    Returns:
        Dict with daily array of {day, sessions, tool_calls}.
    """
    daily = await _service.weekly_summary()
    return {"daily": daily}


@router.get("/agent-stats")
async def get_agent_stats() -> dict[str, Any]:
    """Get agent usage statistics for the last 7 days.

    Returns:
        Dict with agents array of {agent, runs, sessions}.
    """
    agents = await _service.agent_stats()
    return {"agents": agents}


@router.get("/skill-stats")
async def get_skill_stats() -> dict[str, Any]:
    """Get skill usage statistics for the last 7 days.

    Returns:
        Dict with skills array of {skill, activations, sessions}.
    """
    skills = await _service.skill_stats()
    return {"skills": skills}


@router.get("/sessions")
async def get_recent_sessions(limit: int = Query(default=10, ge=1, le=50)) -> dict[str, Any]:
    """Get recent sessions.

    Args:
        limit: Max sessions to return (1-50).

    Returns:
        Dict with sessions array.
    """
    sessions = await _service.recent_sessions(limit=limit)
    return {"sessions": sessions}
