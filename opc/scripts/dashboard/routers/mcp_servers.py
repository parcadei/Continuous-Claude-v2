"""MCP servers router for MCP server configuration data."""

import logging
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.mcp_servers import MCPServersPillarService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mcp-servers", tags=["mcp-servers"])

_service = MCPServersPillarService()


@router.get("")
async def get_mcp_servers() -> dict[str, Any]:
    """Get list of configured MCP servers with transport and enabled status."""
    try:
        return await _service.get_details()
    except Exception:
        logger.exception("Failed to fetch MCP servers")
        raise HTTPException(status_code=503, detail="MCP servers data unavailable")
