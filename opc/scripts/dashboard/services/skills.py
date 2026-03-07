"""Skills pillar health service — skill catalog, graph, and hook observability."""

import asyncio
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from dashboard.services.base import BasePillarService
from dashboard.models import PillarHealth, PillarStatus

logger = logging.getLogger(__name__)


def _safe_mtime(path: Path) -> float:
    """Get file mtime, returning 0.0 if the file was deleted between listing and stat."""
    try:
        return path.stat().st_mtime
    except OSError:
        return 0.0


CLAUDE_HOME = Path.home() / ".claude"
SKILL_RULES_PATH = CLAUDE_HOME / "skills" / "skill-rules.json"
HOOK_DIST = CLAUDE_HOME / "hooks" / "dist" / "skill-activation-prompt.mjs"
HOOK_SRC = CLAUDE_HOME / "hooks" / "src" / "skill-activation-prompt.ts"
SESSION_ACTIVITY_DIR = CLAUDE_HOME / "cache" / "session-activity"


class SkillsPillarService(BasePillarService):
    """Service for skill catalog, DAG graph, and hook activation health."""

    CACHE_TTL = 30  # seconds

    def __init__(self):
        super().__init__("skills")
        self._cache: dict[str, tuple[float, Any]] = {}
        self._rules_mtime: float = 0.0

    def _get_cached(self, key: str) -> Any | None:
        if key in self._cache:
            ts, data = self._cache[key]
            if time.time() - ts < self.CACHE_TTL:
                return data
        return None

    def _set_cache(self, key: str, data: Any) -> None:
        self._cache[key] = (time.time(), data)

    def _load_rules(self) -> dict | None:
        """Load skill-rules.json with mtime-based caching."""
        if not SKILL_RULES_PATH.exists():
            return None

        try:
            mtime = SKILL_RULES_PATH.stat().st_mtime
            if mtime == self._rules_mtime:
                # mtime unchanged — file hasn't been modified, return cached data
                # regardless of TTL (mtime IS the freshness signal)
                if "rules" in self._cache:
                    return self._cache["rules"][1]

            data = json.loads(SKILL_RULES_PATH.read_text(encoding="utf-8"))
            self._rules_mtime = mtime
            self._set_cache("rules", data)
            return data
        except (OSError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to load skill-rules.json: {e}")
            return None

    def _hook_status(self) -> dict[str, Any]:
        """Check skill-activation-prompt hook health."""
        return {
            "compiled": HOOK_DIST.exists(),
            "source_exists": HOOK_SRC.exists(),
            "dist_path": str(HOOK_DIST),
        }

    async def get_activations(self) -> dict[str, Any]:
        """Scan session-activity files for hook fire counts.

        Runs file I/O in a thread to avoid blocking the event loop.
        Caps scan at 500 most recent files by mtime.
        """
        cached = self._get_cached("activations")
        if cached is not None:
            return cached

        activations = await asyncio.to_thread(self._scan_activations)
        self._set_cache("activations", activations)
        return activations

    def _scan_activations(self) -> dict[str, Any]:
        """Synchronous file scan for activation data (runs in thread)."""
        result: dict[str, int] = {}
        total_fires = 0
        sessions_with_fires = 0

        if not SESSION_ACTIVITY_DIR.exists():
            return {"by_hook": {}, "total_fires": 0, "sessions_with_fires": 0, "total_sessions": 0}

        try:
            files = [fp for fp in SESSION_ACTIVITY_DIR.iterdir() if fp.suffix == ".json"]
            # Cap at 500 most recent files to avoid blocking on large directories
            files.sort(key=_safe_mtime, reverse=True)
            files = files[:500]
        except OSError as e:
            logger.warning(f"Failed to scan session-activity: {e}")
            return {"by_hook": {}, "total_fires": 0, "sessions_with_fires": 0, "total_sessions": 0}

        total_sessions = len(files)
        for fp in files:
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
                hooks = data.get("hooks", [])
                if hooks:
                    sessions_with_fires += 1
                for h in hooks:
                    name = h.get("name", "unknown")
                    count = h.get("count", 1)
                    result[name] = result.get(name, 0) + count
                    total_fires += count
            except (OSError, json.JSONDecodeError):
                continue

        return {
            "by_hook": dict(sorted(result.items(), key=lambda x: x[1], reverse=True)),
            "total_fires": total_fires,
            "sessions_with_fires": sessions_with_fires,
            "total_sessions": total_sessions,
        }

    async def check_health(self) -> PillarHealth:
        rules = self._load_rules()
        hook = self._hook_status()

        if rules is None:
            return PillarHealth(
                name=self._name,
                status=PillarStatus.OFFLINE,
                count=0,
                error="skill-rules.json not found",
            )

        skill_count = len(rules.get("skills", {}))

        if not hook["compiled"]:
            return PillarHealth(
                name=self._name,
                status=PillarStatus.DEGRADED,
                count=skill_count,
                last_activity=datetime.now(timezone.utc),
                error="Hook not compiled (skill-activation-prompt.mjs missing)",
            )

        return PillarHealth(
            name=self._name,
            status=PillarStatus.ONLINE,
            count=skill_count,
            last_activity=datetime.now(timezone.utc),
        )

    async def get_details(self) -> dict:
        rules = self._load_rules()
        hook = self._hook_status()
        activations = await self.get_activations()

        if rules is None:
            return {"skills": [], "agents": [], "graph_edges": [], "hook": hook, "activations": activations}

        skills_raw = rules.get("skills", {})
        agents_raw = rules.get("agents", {})

        skills = []
        for name, s in skills_raw.items():
            skills.append({
                "name": name,
                "type": s.get("type", "unknown"),
                "enforcement": s.get("enforcement", "suggest"),
                "priority": s.get("priority", "medium"),
                "description": s.get("description", ""),
                "co_activate": s.get("coActivate", []),
            })

        agents = []
        for name, a in agents_raw.items():
            agents.append({
                "name": name,
                "type": a.get("type", "unknown"),
                "description": a.get("description", ""),
            })

        return {
            "skills": skills,
            "agents": agents,
            "graph_edges": self._build_graph_edges(skills_raw),
            "hook": hook,
            "activations": activations,
            "stats": {
                "total_skills": len(skills),
                "total_agents": len(agents),
                "by_type": self._count_by_type(skills_raw),
                "arscontexta_count": sum(1 for k in skills_raw if k.startswith("arscontexta")),
            },
        }

    async def get_graph(self) -> dict:
        """Return arscontexta DAG nodes + edges for visualization."""
        rules = self._load_rules()
        if rules is None:
            return {"nodes": [], "edges": []}

        skills_raw = rules.get("skills", {})
        arscontexta = {k: v for k, v in skills_raw.items() if k.startswith("arscontexta")}

        nodes = []
        for name, s in arscontexta.items():
            nodes.append({
                "id": name,
                "label": name.replace("arscontexta-", ""),
                "type": s.get("type", "unknown"),
                "description": s.get("description", ""),
                "enforcement": s.get("enforcement", "suggest"),
            })

        edges = self._build_graph_edges(skills_raw)

        return {"nodes": nodes, "edges": edges}

    def _build_graph_edges(self, skills_raw: dict) -> list[dict]:
        """Extract graph edges from coActivate relationships."""
        edges = []
        for name, s in skills_raw.items():
            co_activate = s.get("coActivate", [])
            if isinstance(co_activate, list):
                for target in co_activate:
                    edges.append({
                        "source": name,
                        "target": target,
                        "type": "co-activation",
                    })
        return edges

    def _count_by_type(self, skills_raw: dict) -> dict[str, int]:
        types: dict[str, int] = {}
        for s in skills_raw.values():
            t = s.get("type", "unknown")
            types[t] = types.get(t, 0) + 1
        return types
