"""Hook events collector — receives and serves real-time hook events.

Security model: localhost-only, no auth required. POST accepts events from
local hooks only (127.0.0.1 / ::1). GET is unrestricted for dashboard reads.
"""

import logging
import sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hook-events", tags=["hook-events"])

# In-memory ring buffer — 1000 events max
_event_buffer: deque[dict] = deque(maxlen=1000)

_LOCALHOST_ADDRS = {"127.0.0.1", "::1", "localhost"}
_MAX_DETAILS_KEYS = 20
_MAX_FIELD_LEN = 256


class HookEventPayload(BaseModel):
    """Payload for incoming hook events."""
    hook_name: str = Field(max_length=_MAX_FIELD_LEN)
    event_type: str = Field(default="", max_length=_MAX_FIELD_LEN)
    skill_matched: str | None = Field(default=None, max_length=_MAX_FIELD_LEN)
    details: dict = Field(default_factory=dict)

    @field_validator("details")
    @classmethod
    def cap_details_size(cls, v: dict) -> dict:
        if len(v) > _MAX_DETAILS_KEYS:
            raise ValueError(f"details must have at most {_MAX_DETAILS_KEYS} keys")
        return {
            k: val[:_MAX_FIELD_LEN] if isinstance(val, str) and len(val) > _MAX_FIELD_LEN else val
            for k, val in v.items()
        }


@router.post("")
async def receive_hook_event(payload: HookEventPayload, request: Request) -> dict[str, str]:
    """Receive a hook event and store in ring buffer. Broadcasts via WebSocket.

    Restricted to localhost clients only.
    """
    client_host = request.client.host if request.client else None
    if client_host not in _LOCALHOST_ADDRS:
        raise HTTPException(status_code=403, detail="Hook events only accepted from localhost")

    event = {
        "hook_name": payload.hook_name,
        "event_type": payload.event_type,
        "skill_matched": payload.skill_matched,
        "details": payload.details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _event_buffer.appendleft(event)

    # Broadcast via WebSocket if manager is available on app state
    manager = getattr(request.app.state, "ws_manager", None)
    if manager is not None:
        try:
            await manager.broadcast({
                "type": "activity",
                "pillar": "skills",
                "action": "hook_fired",
                "details": {
                    "hook_name": payload.hook_name,
                    "event_type": payload.event_type,
                    "skill_matched": payload.skill_matched,
                },
                "timestamp": event["timestamp"],
            })
        except Exception as e:
            logger.warning(f"Failed to broadcast hook event: {e}")

    return {"status": "ok"}


@router.get("")
async def list_hook_events(
    hook_name: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=1000),
) -> dict[str, Any]:
    """List recent hook events, newest first.

    Args:
        hook_name: Filter by hook name (optional)
        limit: Max events to return
    """
    events = list(_event_buffer)
    if hook_name:
        events = [e for e in events if e.get("hook_name") == hook_name]
    return {"events": events[:limit], "total": len(events)}
