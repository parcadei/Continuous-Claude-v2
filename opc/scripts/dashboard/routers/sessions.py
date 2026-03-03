"""Sessions router for listing active Claude sessions."""
from fastapi import APIRouter, HTTPException, Query

from dashboard.services.sessions import SessionsService

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
service = SessionsService()


@router.get("")
async def list_sessions(include_stale: bool = Query(True, description="Include stale sessions")):
    """List all sessions with status, file claims, and agent summaries."""
    return await service.list_sessions(include_stale=include_stale)


@router.get("/{session_id}")
async def get_session(session_id: str):
    """Get detailed info for a single session."""
    result = await service.get_session(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return result
