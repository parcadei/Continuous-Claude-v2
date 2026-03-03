"""System Health diagnostic service.

Runs comprehensive checks across all 6 subsystems and reports
HEALTHY / DEGRADED / FAILING status with evidence for each.
NOT a BasePillarService subclass — standalone diagnostic.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from core.db.postgres_pool import get_pool

logger = logging.getLogger(__name__)

# Paths resolved relative to this file's location
_DASHBOARD_DIR = Path(__file__).resolve().parent.parent
_OPC_DIR = _DASHBOARD_DIR.parent.parent  # opc/scripts/dashboard -> opc
_PROJECT_DIR = _OPC_DIR.parent
_CLAUDE_DIR = Path.home() / ".claude"
_HOOKS_DIST = _CLAUDE_DIR / "hooks" / "dist"
_HOOKS_SRC = _PROJECT_DIR / ".claude" / "hooks" / "src"

CRITICAL_HOOKS = [
    "session-start-init-check",
    "ralph-task-monitor",
    "ralph-progress-inject",
    "skill-activation-prompt",
    "tree-invalidate",
]


class SystemHealthService:
    """Runs full diagnostic across all 6 subsystems."""

    async def run_full_diagnostic(self) -> dict[str, Any]:
        """Run all 6 subsystem checks and return a report."""
        checks = {}
        checks["memory"] = await self._check_memory()
        checks["hooks"] = self._check_hooks()
        checks["agents"] = await self._check_agents()
        checks["knowledge_tree"] = self._check_knowledge_tree()
        checks["handoffs"] = await self._check_handoffs()
        checks["roadmap_sync"] = self._check_roadmap_sync()

        # Derive overall status
        statuses = [c["status"] for c in checks.values()]
        if any(s == "FAILING" for s in statuses):
            overall = "FAILING"
        elif any(s == "DEGRADED" for s in statuses):
            overall = "DEGRADED"
        else:
            overall = "HEALTHY"

        return {
            "overall": overall,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "subsystems": checks,
        }

    # ── Memory ──────────────────────────────────────────────

    async def _check_memory(self) -> dict[str, Any]:
        """Check memory subsystem: learning count, recency, embeddings."""
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                total = await conn.fetchval("SELECT COUNT(*) FROM archival_memory") or 0
                recent = await conn.fetchval(
                    "SELECT COUNT(*) FROM archival_memory "
                    "WHERE created_at > NOW() - INTERVAL '24 hours'"
                ) or 0
                with_embedding = await conn.fetchval(
                    "SELECT COUNT(*) FROM archival_memory WHERE embedding IS NOT NULL"
                ) or 0
                avg_dim = None
                if with_embedding > 0:
                    # vector type doesn't support array_length; use vector_dims()
                    try:
                        avg_dim = await conn.fetchval(
                            "SELECT AVG(vector_dims(embedding)) FROM archival_memory "
                            "WHERE embedding IS NOT NULL"
                        )
                    except Exception:
                        # Fallback: just skip dimension check
                        avg_dim = None

            embedding_pct = round(with_embedding / total * 100, 1) if total > 0 else 0

            evidence = {
                "total_learnings": total,
                "recent_stores_24h": recent,
                "with_embedding": with_embedding,
                "embedding_coverage_pct": embedding_pct,
                "avg_embedding_dim": round(float(avg_dim)) if avg_dim else None,
            }

            recommendations = []
            if total == 0:
                status = "FAILING"
                recommendations.append("No learnings found. Store initial learnings with store_learning.py.")
            elif total < 50 or recent == 0:
                status = "DEGRADED"
                if total < 50:
                    recommendations.append(f"Only {total} learnings stored. Aim for 50+ for useful recall.")
                if recent == 0:
                    recommendations.append("No learnings stored in 24h. Check store_learning.py and session hooks.")
            else:
                status = "HEALTHY"

            if embedding_pct < 80 and total > 0:
                recommendations.append(f"Embedding coverage is {embedding_pct}%. Run backfill to improve recall accuracy.")

            return {"status": status, "evidence": evidence, "recommendations": recommendations}

        except Exception as e:
            logger.warning(f"Memory health check failed: {e}")
            return {
                "status": "FAILING",
                "evidence": {"error": str(e)},
                "recommendations": ["Database unreachable. Check PostgreSQL container and connection."],
            }

    # ── Hooks ───────────────────────────────────────────────

    def _check_hooks(self) -> dict[str, Any]:
        """Check hooks subsystem: compiled count, critical hooks present."""
        compiled_files = list(_HOOKS_DIST.glob("*.mjs")) if _HOOKS_DIST.exists() else []
        compiled_count = len(compiled_files)
        compiled_names = {f.stem for f in compiled_files}

        # Check critical hooks
        missing_critical = [h for h in CRITICAL_HOOKS if h not in compiled_names]

        # Count registered hooks from settings.json
        registered_count = 0
        settings_path = _CLAUDE_DIR / "settings.json"
        if settings_path.exists():
            try:
                with open(settings_path, "r") as f:
                    settings = json.load(f)
                hooks_config = settings.get("hooks", {})
                for event_hooks in hooks_config.values():
                    if isinstance(event_hooks, list):
                        registered_count += len(event_hooks)
            except Exception:
                pass

        # Check for recent state files (hook activity)
        state_files = []
        temp_dir = Path(os.environ.get("TEMP", os.environ.get("TMP", "/tmp")))
        if temp_dir.exists():
            state_files = list(temp_dir.glob("claude-*.json"))

        evidence = {
            "compiled_mjs": compiled_count,
            "registered_hooks": registered_count,
            "missing_critical": missing_critical,
            "recent_state_files": len(state_files),
        }

        recommendations = []
        if compiled_count == 0:
            status = "FAILING"
            recommendations.append("No compiled hooks found. Run: cd ~/.claude/hooks && npm run build")
        elif missing_critical or compiled_count < 50:
            status = "DEGRADED"
            if missing_critical:
                recommendations.append(f"Critical hooks missing: {', '.join(missing_critical)}")
            if compiled_count < 50:
                recommendations.append(f"Only {compiled_count} compiled hooks. Expected 50+.")
        else:
            status = "HEALTHY"

        return {"status": status, "evidence": evidence, "recommendations": recommendations}

    # ── Agents ──────────────────────────────────────────────

    async def _check_agents(self) -> dict[str, Any]:
        """Check agents subsystem: run counts, recency, failures."""
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Check if agent_runs table exists
                table_exists = await conn.fetchval(
                    "SELECT EXISTS (SELECT FROM information_schema.tables "
                    "WHERE table_name = 'agent_runs')"
                )
                if not table_exists:
                    return {
                        "status": "DEGRADED",
                        "evidence": {"table_exists": False},
                        "recommendations": ["agent_runs table not found. Agent tracking not configured."],
                    }

                total = await conn.fetchval("SELECT COUNT(*) FROM agent_runs") or 0
                recent = await conn.fetchval(
                    "SELECT COUNT(*) FROM agent_runs "
                    "WHERE started_at > NOW() - INTERVAL '24 hours'"
                ) or 0
                failures = await conn.fetchval(
                    "SELECT COUNT(*) FROM agent_runs WHERE status = 'failed'"
                ) or 0

                # Type distribution
                type_rows = await conn.fetch(
                    "SELECT agent_type, COUNT(*) as cnt FROM agent_runs "
                    "GROUP BY agent_type ORDER BY cnt DESC LIMIT 10"
                )
                type_dist = {row["agent_type"]: row["cnt"] for row in type_rows}

            failure_rate = round(failures / total * 100, 1) if total > 0 else 0

            evidence = {
                "total_runs": total,
                "recent_24h": recent,
                "failures": failures,
                "failure_rate_pct": failure_rate,
                "type_distribution": type_dist,
            }

            recommendations = []
            if total == 0:
                status = "DEGRADED"
                recommendations.append("No agent runs recorded. Agents may not be logging to DB.")
            else:
                status = "HEALTHY"

            if failure_rate > 20:
                recommendations.append(f"High failure rate ({failure_rate}%). Investigate failing agents.")

            return {"status": status, "evidence": evidence, "recommendations": recommendations}

        except Exception as e:
            logger.warning(f"Agents health check failed: {e}")
            return {
                "status": "FAILING",
                "evidence": {"error": str(e)},
                "recommendations": ["Database error checking agent_runs. Check connection."],
            }

    # ── Knowledge Tree ──────────────────────────────────────

    def _check_knowledge_tree(self) -> dict[str, Any]:
        """Check knowledge tree: exists, valid JSON, has required keys, age."""
        tree_path = _PROJECT_DIR / ".claude" / "knowledge-tree.json"

        if not tree_path.exists():
            return {
                "status": "FAILING",
                "evidence": {"exists": False, "path": str(tree_path)},
                "recommendations": [
                    "Knowledge tree missing. Regenerate with: "
                    "cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py --project <dir>"
                ],
            }

        try:
            content = tree_path.read_text(encoding="utf-8")
            if len(content.strip()) == 0:
                return {
                    "status": "FAILING",
                    "evidence": {"exists": True, "empty": True},
                    "recommendations": ["Knowledge tree file is empty. Delete and regenerate."],
                }

            tree = json.loads(content)
            has_project = "project" in tree
            has_structure = "structure" in tree
            stat = tree_path.stat()
            age_hours = (datetime.now().timestamp() - stat.st_mtime) / 3600
            size_kb = round(stat.st_size / 1024, 1)

            evidence = {
                "exists": True,
                "valid_json": True,
                "has_project_key": has_project,
                "has_structure_key": has_structure,
                "age_hours": round(age_hours, 1),
                "size_kb": size_kb,
            }

            recommendations = []
            if not has_project or not has_structure:
                status = "DEGRADED"
                recommendations.append("Missing required keys (project/structure). Regenerate tree.")
            elif age_hours > 72:
                status = "DEGRADED"
                recommendations.append(f"Tree is {round(age_hours)}h old. Consider regenerating for freshness.")
            else:
                status = "HEALTHY"

            return {"status": status, "evidence": evidence, "recommendations": recommendations}

        except json.JSONDecodeError:
            return {
                "status": "FAILING",
                "evidence": {"exists": True, "valid_json": False},
                "recommendations": ["Knowledge tree is invalid JSON. Delete and regenerate."],
            }

    # ── Handoffs ────────────────────────────────────────────

    async def _check_handoffs(self) -> dict[str, Any]:
        """Check handoffs: file dirs, DB records, outcome distribution."""
        handoff_dirs = []
        handoffs_base = _PROJECT_DIR / "thoughts" / "shared" / "handoffs"
        if handoffs_base.exists():
            handoff_dirs = [d for d in handoffs_base.iterdir() if d.is_dir()]

        dir_count = len(handoff_dirs)

        # Check latest handoff has content
        latest_has_content = False
        if handoff_dirs:
            latest = max(handoff_dirs, key=lambda d: d.stat().st_mtime)
            yaml_files = list(latest.glob("*.yaml")) + list(latest.glob("*.yml"))
            if yaml_files:
                latest_file = max(yaml_files, key=lambda f: f.stat().st_mtime)
                latest_has_content = latest_file.stat().st_size > 50

        # Check DB
        db_count = 0
        outcome_dist: dict[str, int] = {}
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                table_exists = await conn.fetchval(
                    "SELECT EXISTS (SELECT FROM information_schema.tables "
                    "WHERE table_name = 'handoffs')"
                )
                if table_exists:
                    db_count = await conn.fetchval("SELECT COUNT(*) FROM handoffs") or 0
                    outcome_rows = await conn.fetch(
                        "SELECT COALESCE(outcome, 'unknown') as outcome, COUNT(*) as cnt "
                        "FROM handoffs GROUP BY outcome"
                    )
                    outcome_dist = {row["outcome"]: row["cnt"] for row in outcome_rows}
        except Exception as e:
            logger.warning(f"Handoff DB check failed: {e}")
            return {
                "status": "FAILING",
                "evidence": {"error": str(e)},
                "recommendations": ["Database error checking handoffs."],
            }

        evidence = {
            "file_dirs": dir_count,
            "db_records": db_count,
            "latest_has_content": latest_has_content,
            "outcome_distribution": outcome_dist,
        }

        recommendations = []
        if dir_count == 0 and db_count == 0:
            status = "DEGRADED"
            recommendations.append("No handoff records found. Use /create_handoff to track session continuity.")
        else:
            status = "HEALTHY"

        return {"status": status, "evidence": evidence, "recommendations": recommendations}

    # ── ROADMAP Sync ────────────────────────────────────────

    def _check_roadmap_sync(self) -> dict[str, Any]:
        """Check ROADMAP.md: exists, has key sections, age, size."""
        roadmap_path = _PROJECT_DIR / "ROADMAP.md"

        if not roadmap_path.exists():
            return {
                "status": "FAILING",
                "evidence": {"exists": False},
                "recommendations": ["ROADMAP.md missing from project root."],
            }

        try:
            content = roadmap_path.read_text(encoding="utf-8")
            if len(content.strip()) == 0:
                return {
                    "status": "FAILING",
                    "evidence": {"exists": True, "empty": True},
                    "recommendations": ["ROADMAP.md is empty."],
                }

            lines = content.split("\n")
            line_count = len(lines)
            has_current_focus = "current focus" in content.lower()
            has_completed = "completed" in content.lower() or "done" in content.lower()

            stat = roadmap_path.stat()
            age_hours = (datetime.now().timestamp() - stat.st_mtime) / 3600

            evidence = {
                "exists": True,
                "line_count": line_count,
                "has_current_focus": has_current_focus,
                "has_completed_section": has_completed,
                "age_hours": round(age_hours, 1),
            }

            recommendations = []
            if not has_current_focus or not has_completed:
                status = "DEGRADED"
                if not has_current_focus:
                    recommendations.append("Missing 'Current Focus' section in ROADMAP.md.")
                if not has_completed:
                    recommendations.append("Missing 'Completed' section in ROADMAP.md.")
            elif age_hours > 48:
                status = "DEGRADED"
                recommendations.append(f"ROADMAP.md is {round(age_hours)}h old. May need a refresh.")
            else:
                status = "HEALTHY"

            return {"status": status, "evidence": evidence, "recommendations": recommendations}

        except Exception as e:
            return {
                "status": "FAILING",
                "evidence": {"error": str(e)},
                "recommendations": ["Error reading ROADMAP.md."],
            }
