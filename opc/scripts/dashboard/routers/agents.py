"""Agents drill-down router for agent activity and telemetry data."""

import logging
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.agents import AgentsPillarService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pillars/agents", tags=["agents"])

_service = AgentsPillarService()


@router.get("/details")
async def get_agents_details() -> dict[str, Any]:
    """Get full agent detail data: telemetry stats, recent spawns, registered types."""
    try:
        return await _service.get_details()
    except Exception:
        logger.exception("Failed to fetch agents details")
        raise HTTPException(status_code=503, detail="Agents details unavailable")
