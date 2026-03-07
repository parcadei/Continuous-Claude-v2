"""Sessions router for listing active Claude sessions."""
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from dashboard.services.sessions import SessionsService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
service = SessionsService()

# Default activity directory - can be patched in tests
_home = os.environ.get("USERPROFILE") or os.environ.get("HOME", "")
DEFAULT_ACTIVITY_DIR = str(Path(_home) / ".claude" / "cache" / "session-activity")


@router.get("")
async def list_sessions(include_stale: bool = Query(True, description="Include stale sessions")):
    """List all sessions with status, file claims, and agent summaries."""
    return await service.list_sessions(include_stale=include_stale)


@router.get("/{session_id}/activity")
async def get_session_activity(session_id: str):
    """Get hook/skill activity data for a specific session.

    Reads from ~/.claude/cache/session-activity/{session_id}.json
    """
    result = await service.get_session_activity(
        session_id, activity_dir=DEFAULT_ACTIVITY_DIR
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Session activity not found")
    return result


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get detailed info for a single session."""
    result = await service.get_session(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return result
