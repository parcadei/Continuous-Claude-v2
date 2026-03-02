"""Ralph drill-down router for task state and progress."""

import logging
import os
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.ralph import RalphPillarService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pillars/ralph", tags=["ralph"])

_service = RalphPillarService()


@router.get("/tasks")
async def get_ralph_tasks() -> dict[str, Any]:
    """Get all Ralph tasks grouped by status.

    Returns:
        Dict with tasks array and tasks_by_status breakdown.
    """
    details = await _service.get_details()
    return {
        "tasks": details.get("tasks", []),
        "tasks_by_status": details.get("tasks_by_status", {}),
    }


@router.get("/state")
async def get_ralph_state() -> dict[str, Any]:
    """Get Ralph session state summary.

    Returns:
        Dict with story_id, stage, iteration, progress, retry_queue.
    """
    details = await _service.get_details()
    return {
        "active": details.get("active", False),
        "story_id": details.get("story_id", ""),
        "stage": details.get("stage", ""),
        "iteration": details.get("iteration", 0),
        "max_iterations": details.get("max_iterations", 0),
        "progress": details.get("progress", {}),
        "retry_queue": details.get("retry_queue", []),
    }
