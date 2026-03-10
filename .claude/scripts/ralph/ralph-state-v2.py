#!/usr/bin/env python3
"""
Ralph Unified State Manager (v2)

Single source of truth for Ralph orchestration state.
Replaces the fragmented state across:
  - .ralph-state.json (old story-level tracking)
  - .ralph/orchestration.json (never updated)
  - $TEMP/claude-ralph-state-*.json (session enforcement)

All state now lives in .ralph/state.json in the project directory.

USAGE:
    # Initialize new workflow
    python ralph-state-v2.py init --story STORY-001 --project /path

    # Task management
    python ralph-state-v2.py task-add --id 1.1 --name "Implement auth" --agent kraken
    python ralph-state-v2.py task-start --id 1.1
    python ralph-state-v2.py task-complete --id 1.1 --commit abc123
    python ralph-state-v2.py task-fail --id 1.1 --error "Type error in auth.ts"
    python ralph-state-v2.py task-list

    # Dependency management
    python ralph-state-v2.py task-add --id 1.2 --name "Test auth" --agent arbiter --depends-on 1.1
    python ralph-state-v2.py ready-tasks

    # Retry queue
    python ralph-state-v2.py retry-push --id 1.1 --error "Failed" --attempt 1
    python ralph-state-v2.py retry-pop
    python ralph-state-v2.py retry-list

    # Checkpoints
    python ralph-state-v2.py checkpoint --commit abc123 --task-id 1.1 --message "auth done"

    # Status
    python ralph-state-v2.py status
    python ralph-state-v2.py progress

    # Session management (for hook integration)
    python ralph-state-v2.py session-activate --session-id abc
    python ralph-state-v2.py session-deactivate
    python ralph-state-v2.py session-status

    # Migration
    python ralph-state-v2.py migrate --project /path
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional


# ─── Type definitions ────────────────────────────────────

TaskStatus = Literal["pending", "in_progress", "complete", "failed", "blocked", "skipped"]
AgentType = Literal[
    "kraken", "spark", "arbiter", "atlas", "scout", "oracle",
    "debug-agent", "sleuth", "critic", "principal-reviewer",
    "architect", "phoenix", "profiler", "scribe", ""
]
RetryEscalation = Literal["same", "spark", "debug-agent", "blocked"]

STATE_VERSION = "2.0"


# ─── Data classes ────────────────────────────────────────

@dataclass
class TaskState:
    """Per-task tracking state."""
    id: str
    name: str
    status: TaskStatus = "pending"
    agent: str = ""
    duration_s: float = 0.0
    retries: int = 0
    commit: str = ""
    depends_on: list[str] = field(default_factory=list)
    files: list[str] = field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    last_error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "TaskState":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class RetryEntry:
    """Entry in the retry queue."""
    task_id: str
    attempt: int
    error: str
    escalation: RetryEscalation = "same"
    queued_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "RetryEntry":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Checkpoint:
    """Git checkpoint record."""
    commit: str
    task_id: str
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Checkpoint":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class SessionState:
    """Session enforcement state (replaces temp file)."""
    active: bool = False
    session_id: str = ""
    story_id: str = ""
    activated_at: Optional[int] = None
    last_activity: Optional[int] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SessionState":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class UnifiedState:
    """Complete Ralph workflow state — single source of truth."""
    version: str = STATE_VERSION
    story_id: str = ""
    project_path: str = ""
    stage: str = "init"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    # Per-task tracking
    tasks: list[TaskState] = field(default_factory=list)

    # Retry queue
    retry_queue: list[RetryEntry] = field(default_factory=list)

    # Checkpoints
    checkpoints: list[Checkpoint] = field(default_factory=list)

    # Session enforcement
    session: SessionState = field(default_factory=SessionState)

    # Cost tracking (placeholder)
    cost: dict = field(default_factory=lambda: {
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "estimated_cost_usd": 0.0
    })

    # Iteration tracking
    iteration: int = 0
    max_iterations: int = 30

    def to_dict(self) -> dict:
        result = {
            "version": self.version,
            "story_id": self.story_id,
            "project_path": self.project_path,
            "stage": self.stage,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "tasks": [t.to_dict() for t in self.tasks],
            "retry_queue": [r.to_dict() for r in self.retry_queue],
            "checkpoints": [c.to_dict() for c in self.checkpoints],
            "session": self.session.to_dict(),
            "cost": self.cost,
            "iteration": self.iteration,
            "max_iterations": self.max_iterations,
        }
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "UnifiedState":
        tasks = [TaskState.from_dict(t) for t in data.pop("tasks", [])]
        retry_queue = [RetryEntry.from_dict(r) for r in data.pop("retry_queue", [])]
        checkpoints = [Checkpoint.from_dict(c) for c in data.pop("checkpoints", [])]
        session = SessionState.from_dict(data.pop("session", {}))
        cost = data.pop("cost", {"total_input_tokens": 0, "total_output_tokens": 0, "estimated_cost_usd": 0.0})
        # Remove fields handled above, keep the rest
        state = cls(
            version=data.get("version", STATE_VERSION),
            story_id=data.get("story_id", ""),
            project_path=data.get("project_path", ""),
            stage=data.get("stage", "init"),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
            iteration=data.get("iteration", 0),
            max_iterations=data.get("max_iterations", 30),
        )
        state.tasks = tasks
        state.retry_queue = retry_queue
        state.checkpoints = checkpoints
        state.session = session
        state.cost = cost
        return state

    def get_task(self, task_id: str) -> Optional[TaskState]:
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None

    def get_ready_tasks(self) -> list[TaskState]:
        """Return tasks whose dependencies are all complete."""
        complete_ids = {t.id for t in self.tasks if t.status == "complete"}
        ready = []
        for task in self.tasks:
            if task.status != "pending":
                continue
            if all(dep in complete_ids for dep in task.depends_on):
                ready.append(task)
        return ready

    def get_parallel_batch(self) -> list[TaskState]:
        """Return tasks that can run in parallel (ready + no file overlap)."""
        ready = self.get_ready_tasks()
        if not ready:
            return []

        batch = [ready[0]]
        batch_files = set(ready[0].files)

        for task in ready[1:]:
            task_files = set(task.files)
            if not task_files.intersection(batch_files):
                batch.append(task)
                batch_files.update(task_files)

        return batch

    def summary(self) -> dict:
        """Return summary statistics."""
        total = len(self.tasks)
        complete = sum(1 for t in self.tasks if t.status == "complete")
        in_progress = sum(1 for t in self.tasks if t.status == "in_progress")
        failed = sum(1 for t in self.tasks if t.status == "failed")
        blocked = sum(1 for t in self.tasks if t.status == "blocked")
        pending = sum(1 for t in self.tasks if t.status == "pending")
        pct = round(complete / total * 100, 1) if total else 0.0

        return {
            "story_id": self.story_id,
            "stage": self.stage,
            "iteration": self.iteration,
            "max_iterations": self.max_iterations,
            "total_tasks": total,
            "complete": complete,
            "in_progress": in_progress,
            "failed": failed,
            "blocked": blocked,
            "pending": pending,
            "progress_pct": pct,
            "retry_queue_size": len(self.retry_queue),
            "checkpoints": len(self.checkpoints),
            "last_checkpoint": self.checkpoints[-1].to_dict() if self.checkpoints else None,
        }

    def progress_bar(self, width: int = 20) -> str:
        """Return a compact progress bar string."""
        total = len(self.tasks)
        complete = sum(1 for t in self.tasks if t.status == "complete")
        pct = round(complete / total * 100) if total else 0
        filled = int(width * complete / total) if total else 0
        bar = "=" * filled + "-" * (width - filled)

        last_ckpt = ""
        if self.checkpoints:
            from datetime import datetime as dt
            try:
                ckpt_time = dt.fromisoformat(self.checkpoints[-1].timestamp)
                delta = (dt.now() - ckpt_time).total_seconds()
                if delta < 60:
                    last_ckpt = f" | last commit: {int(delta)}s ago"
                else:
                    last_ckpt = f" | last commit: {int(delta / 60)}m ago"
            except (ValueError, AttributeError):
                pass

        retry_info = f" | retry: {len(self.retry_queue)}" if self.retry_queue else ""
        return f"RALPH: {self.story_id} [{bar}] {complete}/{total} ({pct}%){retry_info}{last_ckpt}"


# ─── File I/O ────────────────────────────────────────────

def get_state_path(project_path: str) -> Path:
    """Get the unified state file path."""
    return Path(project_path) / ".ralph" / "state.json"


def load_state(project_path: str) -> Optional[UnifiedState]:
    """Load state from .ralph/state.json."""
    state_path = get_state_path(project_path)
    if not state_path.exists():
        return None
    try:
        with open(state_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return UnifiedState.from_dict(data)
    except (json.JSONDecodeError, TypeError, KeyError) as e:
        print(json.dumps({"success": False, "error": f"State file corrupt: {e}"}), file=sys.stderr)
        return None


def save_state(state: UnifiedState) -> None:
    """Save state to .ralph/state.json atomically."""
    state_path = get_state_path(state.project_path)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state.updated_at = datetime.now().isoformat()

    # Atomic write: write to temp, then rename
    tmp_path = state_path.with_suffix(f".tmp.{os.getpid()}")
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, indent=2)
        tmp_path.replace(state_path)
    except Exception:
        if tmp_path.exists():
            tmp_path.unlink()
        raise


def require_state(project_path: str) -> UnifiedState:
    """Load state or exit with error."""
    state = load_state(project_path)
    if not state:
        print(json.dumps({"success": False, "error": "No Ralph state found. Run 'init' first."}))
        sys.exit(1)
    return state


# ─── Migration ───────────────────────────────────────────

def migrate_from_v1(project_path: str) -> Optional[UnifiedState]:
    """Migrate from old .ralph-state.json to new unified format."""
    old_path = Path(project_path) / ".ralph-state.json"
    if not old_path.exists():
        return None

    try:
        with open(old_path, "r", encoding="utf-8") as f:
            old_data = json.load(f)
    except (json.JSONDecodeError, TypeError):
        return None

    state = UnifiedState(
        story_id=old_data.get("stories", [{}])[0].get("id", "") if old_data.get("stories") else "",
        project_path=old_data.get("project_path", project_path),
        stage=old_data.get("stage", "init"),
        created_at=old_data.get("created_at", datetime.now().isoformat()),
    )

    # Migrate stories as task groups
    for story in old_data.get("stories", []):
        tasks_total = story.get("tasks_total", 0)
        tasks_completed = story.get("tasks_completed", 0)
        for i in range(1, tasks_total + 1):
            task = TaskState(
                id=f"{story.get('id', 'MIGRATED')}.{i}",
                name=f"Migrated task {i}",
                status="complete" if i <= tasks_completed else "pending",
            )
            state.tasks.append(task)

    return state


# ─── CLI Commands ────────────────────────────────────────

def cmd_init(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    existing = load_state(project_path)

    if existing and not args.force:
        print(json.dumps({"success": False, "error": "State exists. Use --force to overwrite."}))
        return 1

    state = UnifiedState(
        story_id=args.story or "",
        project_path=project_path,
        max_iterations=args.max_iterations or 30,
    )
    save_state(state)

    # Auto-copy TDD enforcement contract (.ralph/CLAUDE.md)
    claude_md_source = Path.home() / '.claude' / 'ralph-templates' / 'CLAUDE.md'
    if not claude_md_source.exists():
        claude_md_source = Path.home() / 'continuous-claude' / '.ralph' / 'CLAUDE.md'
    claude_md_dest = Path(project_path) / '.ralph' / 'CLAUDE.md'
    if claude_md_source.exists() and not claude_md_dest.exists():
        shutil.copy2(str(claude_md_source), str(claude_md_dest))
        print(json.dumps({"info": "Copied TDD contract", "dest": str(claude_md_dest)}))

    print(json.dumps({"success": True, "state_path": str(get_state_path(project_path))}))
    return 0


def cmd_task_add(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    if state.get_task(args.id):
        print(json.dumps({"success": False, "error": f"Task {args.id} already exists"}))
        return 1

    depends_on = args.depends_on.split(",") if args.depends_on else []
    files = args.files.split(",") if args.files else []

    task = TaskState(
        id=args.id,
        name=args.name,
        agent=args.agent or "",
        depends_on=depends_on,
        files=files,
    )
    state.tasks.append(task)
    save_state(state)
    print(json.dumps({"success": True, "task": task.to_dict()}))
    return 0


def cmd_task_start(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)
    task = state.get_task(args.id)

    if not task:
        print(json.dumps({"success": False, "error": f"Task {args.id} not found"}))
        return 1

    task.status = "in_progress"
    task.started_at = datetime.now().isoformat()
    if args.agent:
        task.agent = args.agent
    state.iteration += 1

    # Auto-checkpoint: pre-task marker
    state.checkpoints.append(Checkpoint(
        commit="",
        task_id=args.id,
        message=f"pre-task: {task.name}",
    ))

    save_state(state)
    print(json.dumps({"success": True, "task": task.to_dict(), "iteration": state.iteration}))
    return 0


def cmd_task_complete(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)
    task = state.get_task(args.id)

    if not task:
        print(json.dumps({"success": False, "error": f"Task {args.id} not found"}))
        return 1

    task.status = "complete"
    task.completed_at = datetime.now().isoformat()
    if args.commit:
        task.commit = args.commit
    if task.started_at:
        try:
            start = datetime.fromisoformat(task.started_at)
            task.duration_s = (datetime.now() - start).total_seconds()
        except ValueError:
            pass

    # Auto-checkpoint: post-task with commit hash
    state.checkpoints.append(Checkpoint(
        commit=args.commit or "",
        task_id=args.id,
        message=f"post-task: {task.name}",
    ))

    save_state(state)
    summary = state.summary()
    print(json.dumps({"success": True, "task": task.to_dict(), "summary": summary}))
    return 0


def cmd_task_fail(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)
    task = state.get_task(args.id)

    if not task:
        print(json.dumps({"success": False, "error": f"Task {args.id} not found"}))
        return 1

    task.status = "failed"
    task.last_error = args.error or "Unknown error"
    task.retries += 1
    save_state(state)
    print(json.dumps({"success": True, "task": task.to_dict()}))
    return 0


def cmd_task_list(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    if args.status:
        tasks = [t for t in state.tasks if t.status == args.status]
    else:
        tasks = state.tasks

    print(json.dumps({"success": True, "tasks": [t.to_dict() for t in tasks]}))
    return 0


def cmd_ready_tasks(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    if args.parallel:
        tasks = state.get_parallel_batch()
    else:
        tasks = state.get_ready_tasks()

    print(json.dumps({"success": True, "ready": [t.to_dict() for t in tasks]}))
    return 0


def cmd_retry_push(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    attempt = args.attempt or 1
    # Determine escalation based on attempt number
    escalation_map: dict[int, RetryEscalation] = {1: "same", 2: "spark", 3: "debug-agent"}
    escalation = escalation_map.get(attempt, "blocked")

    entry = RetryEntry(
        task_id=args.id,
        attempt=attempt,
        error=args.error or "Unknown",
        escalation=escalation,
    )
    state.retry_queue.append(entry)

    # If max retries, mark task as blocked
    task = state.get_task(args.id)
    if task and attempt >= 3:
        task.status = "blocked"

    save_state(state)
    print(json.dumps({"success": True, "entry": entry.to_dict(), "queue_size": len(state.retry_queue)}))
    return 0


def cmd_retry_pop(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    if not state.retry_queue:
        print(json.dumps({"success": True, "entry": None, "message": "Retry queue empty"}))
        return 0

    entry = state.retry_queue.pop(0)

    # Reset task to pending for retry
    task = state.get_task(entry.task_id)
    if task and task.status != "blocked":
        task.status = "pending"

    save_state(state)
    print(json.dumps({"success": True, "entry": entry.to_dict(), "remaining": len(state.retry_queue)}))
    return 0


def cmd_retry_list(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)
    print(json.dumps({"success": True, "queue": [r.to_dict() for r in state.retry_queue]}))
    return 0


def cmd_checkpoint(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    ckpt = Checkpoint(
        commit=args.commit,
        task_id=args.task_id or "",
        message=args.message or "",
    )
    state.checkpoints.append(ckpt)
    save_state(state)
    print(json.dumps({"success": True, "checkpoint": ckpt.to_dict(), "total": len(state.checkpoints)}))
    return 0


def cmd_session_activate(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)

    if not state:
        # Auto-init if no state
        state = UnifiedState(
            story_id=args.story_id or "",
            project_path=project_path,
        )

    now = int(datetime.now().timestamp() * 1000)
    state.session = SessionState(
        active=True,
        session_id=args.session_id or "",
        story_id=args.story_id or state.story_id,
        activated_at=now,
        last_activity=now,
    )
    state.stage = "building"
    save_state(state)
    print(json.dumps({"success": True, "session": state.session.to_dict()}))
    return 0


def cmd_session_deactivate(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    state.session.active = False
    state.session.last_activity = int(datetime.now().timestamp() * 1000)
    save_state(state)
    print(json.dumps({"success": True, "session": state.session.to_dict()}))
    return 0


def cmd_session_status(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)

    if not state:
        print(json.dumps({"success": True, "active": False, "reason": "no state file"}))
        return 0

    print(json.dumps({"success": True, **state.session.to_dict()}))
    return 0


def cmd_session_heartbeat(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)
    if not state or not state.session.active:
        print(json.dumps({"success": True, "updated": False}))
        return 0

    state.session.last_activity = int(datetime.now().timestamp() * 1000)
    save_state(state)
    print(json.dumps({"success": True, "updated": True}))
    return 0


def cmd_detect_stale(args) -> int:
    """Find tasks stuck in_progress longer than threshold."""
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)

    threshold_min = args.threshold_minutes or 30
    threshold_s = threshold_min * 60
    now = datetime.now()
    stale = []

    for task in state.tasks:
        if task.status != "in_progress" or not task.started_at:
            continue
        try:
            started = datetime.fromisoformat(task.started_at)
            elapsed_s = (now - started).total_seconds()
            if elapsed_s > threshold_s:
                stale.append({
                    **task.to_dict(),
                    "elapsed_minutes": round(elapsed_s / 60, 1),
                })
        except ValueError:
            continue

    print(json.dumps({
        "success": True,
        "stale_tasks": stale,
        "threshold_minutes": threshold_min,
        "count": len(stale),
    }, indent=2))
    return 0


def cmd_status(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)
    output = state.to_dict()
    output["success"] = True
    output["summary"] = state.summary()
    print(json.dumps(output, indent=2))
    return 0


def cmd_progress(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())
    state = require_state(project_path)
    print(state.progress_bar())
    return 0


def cmd_migrate(args) -> int:
    project_path = os.path.abspath(args.project or os.getcwd())

    # Check if already migrated
    if load_state(project_path):
        print(json.dumps({"success": False, "error": "State v2 already exists. Use init --force."}))
        return 1

    state = migrate_from_v1(project_path)
    if not state:
        print(json.dumps({"success": False, "error": "No v1 state found to migrate."}))
        return 1

    save_state(state)
    print(json.dumps({"success": True, "migrated_tasks": len(state.tasks)}))
    return 0


# ─── Argument parser ─────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Ralph Unified State Manager v2")
    parser.add_argument("--project", "-p", help="Project path (default: cwd)")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # init
    init_p = subparsers.add_parser("init", help="Initialize new workflow")
    init_p.add_argument("--story", help="Story ID")
    init_p.add_argument("--force", "-f", action="store_true")
    init_p.add_argument("--max-iterations", type=int, default=30)

    # task-add
    ta_p = subparsers.add_parser("task-add", help="Add a task")
    ta_p.add_argument("--id", required=True, help="Task ID (e.g., 1.1)")
    ta_p.add_argument("--name", required=True, help="Task name")
    ta_p.add_argument("--agent", help="Agent type")
    ta_p.add_argument("--depends-on", help="Comma-separated dependency IDs")
    ta_p.add_argument("--files", help="Comma-separated file paths")

    # task-start
    ts_p = subparsers.add_parser("task-start", help="Mark task as in_progress")
    ts_p.add_argument("--id", required=True)
    ts_p.add_argument("--agent", help="Override agent type")

    # task-complete
    tc_p = subparsers.add_parser("task-complete", help="Mark task as complete")
    tc_p.add_argument("--id", required=True)
    tc_p.add_argument("--commit", help="Git commit hash")

    # task-fail
    tf_p = subparsers.add_parser("task-fail", help="Mark task as failed")
    tf_p.add_argument("--id", required=True)
    tf_p.add_argument("--error", help="Error message")

    # task-list
    tl_p = subparsers.add_parser("task-list", help="List tasks")
    tl_p.add_argument("--status", help="Filter by status")

    # ready-tasks
    rt_p = subparsers.add_parser("ready-tasks", help="List ready tasks")
    rt_p.add_argument("--parallel", action="store_true", help="Get parallelizable batch")

    # retry-push
    rp_p = subparsers.add_parser("retry-push", help="Push to retry queue")
    rp_p.add_argument("--id", required=True, help="Task ID")
    rp_p.add_argument("--error", help="Error message")
    rp_p.add_argument("--attempt", type=int, help="Attempt number")

    # retry-pop
    subparsers.add_parser("retry-pop", help="Pop from retry queue")

    # retry-list
    subparsers.add_parser("retry-list", help="List retry queue")

    # checkpoint
    ck_p = subparsers.add_parser("checkpoint", help="Record checkpoint")
    ck_p.add_argument("--commit", required=True, help="Git commit hash")
    ck_p.add_argument("--task-id", help="Task that triggered checkpoint")
    ck_p.add_argument("--message", help="Checkpoint message")

    # session-activate
    sa_p = subparsers.add_parser("session-activate", help="Activate Ralph session")
    sa_p.add_argument("--session-id", help="Session ID")
    sa_p.add_argument("--story-id", help="Story ID")

    # session-deactivate
    subparsers.add_parser("session-deactivate", help="Deactivate Ralph session")

    # session-status
    subparsers.add_parser("session-status", help="Check session status")

    # session-heartbeat
    subparsers.add_parser("session-heartbeat", help="Update session heartbeat")

    # detect-stale
    ds_p = subparsers.add_parser("detect-stale", help="Find stale in_progress tasks")
    ds_p.add_argument("--threshold-minutes", type=int, default=30, help="Minutes before stale (default 30)")

    # status
    subparsers.add_parser("status", help="Full status")

    # progress
    subparsers.add_parser("progress", help="Progress bar")

    # migrate
    subparsers.add_parser("migrate", help="Migrate from v1 state")

    args = parser.parse_args()

    commands = {
        "init": cmd_init,
        "task-add": cmd_task_add,
        "task-start": cmd_task_start,
        "task-complete": cmd_task_complete,
        "task-fail": cmd_task_fail,
        "task-list": cmd_task_list,
        "ready-tasks": cmd_ready_tasks,
        "retry-push": cmd_retry_push,
        "retry-pop": cmd_retry_pop,
        "retry-list": cmd_retry_list,
        "checkpoint": cmd_checkpoint,
        "session-activate": cmd_session_activate,
        "session-deactivate": cmd_session_deactivate,
        "session-status": cmd_session_status,
        "session-heartbeat": cmd_session_heartbeat,
        "detect-stale": cmd_detect_stale,
        "status": cmd_status,
        "progress": cmd_progress,
        "migrate": cmd_migrate,
    }

    handler = commands.get(args.command)
    if handler:
        return handler(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
