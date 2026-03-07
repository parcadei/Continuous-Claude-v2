"""Skills drill-down router for skill catalog and graph data."""

import logging
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.skills import SkillsPillarService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pillars/skills", tags=["skills"])

_service = SkillsPillarService()


@router.get("/details")
async def get_skills_details() -> dict[str, Any]:
    """Get full skill detail data: catalog, graph, hook health, activations."""
    try:
        return await _service.get_details()
    except Exception:
        logger.exception("Failed to fetch skills details")
        raise HTTPException(status_code=503, detail="Skills details unavailable")


@router.get("/graph")
async def get_skills_graph() -> dict[str, Any]:
    """Get arscontexta DAG nodes + edges for visualization."""
    try:
        return await _service.get_graph()
    except Exception:
        logger.exception("Failed to fetch skills graph")
        raise HTTPException(status_code=503, detail="Skills graph unavailable")


@router.get("/activations")
async def get_skill_activations() -> dict[str, Any]:
    """Get hook/skill activation counts from session-activity data."""
    try:
        return await _service.get_activations()
    except Exception:
        logger.exception("Failed to fetch skill activations")
        raise HTTPException(status_code=503, detail="Skill activations unavailable")
