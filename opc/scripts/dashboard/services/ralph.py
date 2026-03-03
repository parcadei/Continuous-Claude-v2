"""Ralph pillar health service — reads .ralph/state.json for task status."""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.base import BasePillarService
from dashboard.models import PillarHealth, PillarStatus

DEFAULT_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent


class RalphPillarService(BasePillarService):
    """Service for checking Ralph task state."""

    def __init__(self, project_root: Path | None = None):
        super().__init__("ralph")
        self._project_root = project_root or DEFAULT_PROJECT_ROOT

    def _load_state(self) -> dict | None:
        """Load .ralph/state.json if it exists.

        Returns:
            Parsed state dict or None if missing/invalid.
        """
        state_path = self._project_root / ".ralph" / "state.json"
        if not state_path.exists():
            return None
        try:
            return json.loads(state_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return None

    async def check_health(self) -> PillarHealth:
        """Check health of the Ralph pillar.

        Returns:
            ONLINE if state.json exists with tasks, OFFLINE otherwise.
            count = number of complete tasks.
        """
        state = self._load_state()
        if not state:
            return PillarHealth(
                name=self.name,
                status=PillarStatus.OFFLINE,
                count=0,
            )

        tasks = state.get("tasks", [])
        if isinstance(tasks, dict):
            tasks = list(tasks.values())

        completed = sum(
            1 for t in tasks if t.get("status") in ("complete", "completed")
        )

        # Determine last activity from most recent task timestamp
        last_activity = None
        for t in tasks:
            for ts_field in ("completed_at", "started_at"):
                ts = t.get(ts_field)
                if ts:
                    try:
                        dt = datetime.fromisoformat(ts)
                        if last_activity is None or dt > last_activity:
                            last_activity = dt
                    except ValueError:
                        pass

        # State file exists and parsed OK = ONLINE (idle or active)
        # No state file or parse error = OFFLINE (handled above)
        status = PillarStatus.ONLINE

        return PillarHealth(
            name=self.name,
            status=status,
            count=completed,
            last_activity=last_activity,
        )

    async def get_details(self) -> dict:
        """Get full Ralph state details.

        Returns:
            Task list grouped by status, retry queue, progress stats.
        """
        state = self._load_state()
        if not state:
            return {"active": False, "tasks": [], "retry_queue": [], "progress": {}}

        tasks = state.get("tasks", [])
        if isinstance(tasks, dict):
            tasks = list(tasks.values())

        # Group by status
        by_status: dict[str, list] = {}
        for t in tasks:
            s = t.get("status", "pending")
            by_status.setdefault(s, []).append(t)

        total = len(tasks)
        completed = len(by_status.get("complete", []) + by_status.get("completed", []))
        pct = round((completed / total) * 100) if total > 0 else 0

        return {
            "active": state.get("session", {}).get("active", False),
            "story_id": state.get("story_id", ""),
            "stage": state.get("stage", ""),
            "iteration": state.get("iteration", 0),
            "max_iterations": state.get("max_iterations", 0),
            "tasks": tasks,
            "tasks_by_status": {k: len(v) for k, v in by_status.items()},
            "retry_queue": state.get("retry_queue", []),
            "progress": {
                "completed": completed,
                "total": total,
                "pct": pct,
            },
        }
