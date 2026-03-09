#!/usr/bin/env python3
"""
Ralph Workflow State Machine

Manages workflow state for Ralph orchestration, supporting:
- Stage tracking (requirements → tasks → converting → building → reviewing → complete)
- Parallel story tracking (multiple stories with concurrent worktrees)
- Signal parsing (<TASK_COMPLETE/>, <BLOCKED/>, <COMPLETE/>)
- State persistence to .ralph-state.json

USAGE:
    # Initialize new workflow
    python ralph-state.py init --project /path/to/project

    # Update workflow stage
    python ralph-state.py stage --set tasks

    # Add a story
    python ralph-state.py story add --id STORY-001 --worktree ralph-auth

    # Update story status
    python ralph-state.py story update --id STORY-001 --status building

    # Record signal from Ralph output
    python ralph-state.py signal --story STORY-001 --signal TASK_COMPLETE

    # Get current state (JSON output)
    python ralph-state.py status

    # Get state for specific story
    python ralph-state.py story status --id STORY-001
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional


# Type definitions
StageType = Literal[
    "init", "requirements", "tasks", "converting",
    "building", "reviewing", "complete", "failed"
]

StoryStatus = Literal[
    "pending", "in_progress", "complete", "blocked", "failed"
]

SignalType = Literal[
    "TASK_COMPLETE", "COMPLETE", "BLOCKED", "ERROR"
]


@dataclass
class Story:
    """Individual story within a Ralph workflow."""
    id: str
    worktree: str
    status: StoryStatus = "pending"
    last_signal: Optional[SignalType] = None
    last_signal_at: Optional[str] = None
    tasks_total: int = 0
    tasks_completed: int = 0
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Story":
        return cls(**data)


@dataclass
class RalphState:
    """Full workflow state for a Ralph project."""
    workflow_id: str
    project_path: str
    stage: StageType = "init"
    prd_path: Optional[str] = None
    tasks_path: Optional[str] = None
    stories: list[Story] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "1.0"

    def to_dict(self) -> dict:
        result = asdict(self)
        result["stories"] = [s.to_dict() for s in self.stories]
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "RalphState":
        stories = [Story.from_dict(s) for s in data.pop("stories", [])]
        state = cls(**data)
        state.stories = stories
        return state

    def get_story(self, story_id: str) -> Optional[Story]:
        for story in self.stories:
            if story.id == story_id:
                return story
        return None

    def add_story(self, story: Story) -> None:
        existing = self.get_story(story.id)
        if existing:
            raise ValueError(f"Story {story.id} already exists")
        self.stories.append(story)
        self.updated_at = datetime.now().isoformat()

    def update_story(self, story_id: str, **updates) -> None:
        story = self.get_story(story_id)
        if not story:
            raise ValueError(f"Story {story_id} not found")
        for key, value in updates.items():
            if hasattr(story, key):
                setattr(story, key, value)
        story.updated_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

    def record_signal(self, story_id: str, signal: SignalType) -> None:
        story = self.get_story(story_id)
        if not story:
            raise ValueError(f"Story {story_id} not found")

        story.last_signal = signal
        story.last_signal_at = datetime.now().isoformat()

        # Update status based on signal
        if signal == "COMPLETE":
            story.status = "complete"
        elif signal == "BLOCKED":
            story.status = "blocked"
        elif signal == "ERROR":
            story.status = "failed"
        elif signal == "TASK_COMPLETE":
            story.tasks_completed += 1
            story.status = "in_progress"

        story.updated_at = datetime.now().isoformat()
        self.updated_at = datetime.now().isoformat()

    def all_stories_complete(self) -> bool:
        if not self.stories:
            return False
        return all(s.status == "complete" for s in self.stories)


def get_state_path(project_path: str) -> Path:
    """Get the path to the state file for a project."""
    return Path(project_path) / ".ralph-state.json"


def load_state(project_path: str) -> Optional[RalphState]:
    """Load existing state from file."""
    state_path = get_state_path(project_path)
    if not state_path.exists():
        return None

    try:
        with open(state_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return RalphState.from_dict(data)
    except (json.JSONDecodeError, TypeError, KeyError) as e:
        print(f"Error loading state: {e}", file=sys.stderr)
        return None


def save_state(state: RalphState) -> None:
    """Save state to file."""
    state_path = get_state_path(state.project_path)
    state_path.parent.mkdir(parents=True, exist_ok=True)

    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state.to_dict(), f, indent=2)


def generate_workflow_id() -> str:
    """Generate a unique workflow ID."""
    from datetime import datetime
    import random
    import string

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = "".join(random.choices(string.ascii_lowercase, k=4))
    return f"ralph-{timestamp}-{suffix}"


# CLI Commands

def cmd_init(args):
    """Initialize a new Ralph workflow state."""
    project_path = os.path.abspath(args.project or os.getcwd())

    # Check if state already exists
    existing = load_state(project_path)
    if existing and not args.force:
        print(json.dumps({
            "success": False,
            "error": f"State already exists for {project_path}. Use --force to overwrite."
        }))
        return 1

    # Create new state
    state = RalphState(
        workflow_id=generate_workflow_id(),
        project_path=project_path,
        stage="init"
    )

    save_state(state)
    print(json.dumps({
        "success": True,
        "workflow_id": state.workflow_id,
        "state_path": str(get_state_path(project_path))
    }))
    return 0


def cmd_stage(args):
    """Update the workflow stage."""
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)

    if not state:
        print(json.dumps({"success": False, "error": "No workflow state found"}))
        return 1

    if args.set:
        state.stage = args.set
        state.updated_at = datetime.now().isoformat()
        save_state(state)
        print(json.dumps({"success": True, "stage": state.stage}))
    else:
        print(json.dumps({"success": True, "stage": state.stage}))

    return 0


def cmd_story(args):
    """Manage stories within the workflow."""
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)

    if not state:
        print(json.dumps({"success": False, "error": "No workflow state found"}))
        return 1

    action = args.action

    if action == "add":
        if not args.id or not args.worktree:
            print(json.dumps({"success": False, "error": "--id and --worktree required"}))
            return 1

        try:
            story = Story(
                id=args.id,
                worktree=args.worktree,
                tasks_total=args.tasks or 0
            )
            state.add_story(story)
            save_state(state)
            print(json.dumps({"success": True, "story": story.to_dict()}))
        except ValueError as e:
            print(json.dumps({"success": False, "error": str(e)}))
            return 1

    elif action == "update":
        if not args.id:
            print(json.dumps({"success": False, "error": "--id required"}))
            return 1

        updates = {}
        if args.status:
            updates["status"] = args.status
        if args.tasks:
            updates["tasks_total"] = args.tasks
        if args.completed:
            updates["tasks_completed"] = args.completed

        try:
            state.update_story(args.id, **updates)
            save_state(state)
            story = state.get_story(args.id)
            print(json.dumps({"success": True, "story": story.to_dict()}))
        except ValueError as e:
            print(json.dumps({"success": False, "error": str(e)}))
            return 1

    elif action == "status":
        if args.id:
            story = state.get_story(args.id)
            if story:
                print(json.dumps({"success": True, "story": story.to_dict()}))
            else:
                print(json.dumps({"success": False, "error": f"Story {args.id} not found"}))
                return 1
        else:
            print(json.dumps({
                "success": True,
                "stories": [s.to_dict() for s in state.stories]
            }))

    elif action == "list":
        for story in state.stories:
            progress = f"{story.tasks_completed}/{story.tasks_total}" if story.tasks_total else "?"
            print(f"{story.id}: {story.status} ({progress}) - {story.worktree}")

    return 0


def cmd_signal(args):
    """Record a signal from Ralph output."""
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)

    if not state:
        print(json.dumps({"success": False, "error": "No workflow state found"}))
        return 1

    if not args.story or not args.signal:
        print(json.dumps({"success": False, "error": "--story and --signal required"}))
        return 1

    try:
        state.record_signal(args.story, args.signal)
        save_state(state)

        story = state.get_story(args.story)
        result = {
            "success": True,
            "story": story.to_dict(),
            "all_complete": state.all_stories_complete()
        }

        # Check if workflow is complete
        if state.all_stories_complete():
            state.stage = "reviewing"
            save_state(state)
            result["workflow_stage"] = "reviewing"

        print(json.dumps(result))
    except ValueError as e:
        print(json.dumps({"success": False, "error": str(e)}))
        return 1

    return 0


def cmd_status(args):
    """Get current workflow status."""
    project_path = os.path.abspath(args.project or os.getcwd())
    state = load_state(project_path)

    if not state:
        print(json.dumps({"success": False, "error": "No workflow state found"}))
        return 1

    output = state.to_dict()
    output["success"] = True

    # Add summary statistics
    total_tasks = sum(s.tasks_total for s in state.stories)
    completed_tasks = sum(s.tasks_completed for s in state.stories)
    output["summary"] = {
        "total_stories": len(state.stories),
        "stories_complete": sum(1 for s in state.stories if s.status == "complete"),
        "stories_in_progress": sum(1 for s in state.stories if s.status == "in_progress"),
        "stories_blocked": sum(1 for s in state.stories if s.status == "blocked"),
        "total_tasks": total_tasks,
        "tasks_completed": completed_tasks,
        "progress_pct": round(completed_tasks / total_tasks * 100, 1) if total_tasks else 0
    }

    print(json.dumps(output, indent=2))
    return 0


def cmd_parse_output(args):
    """Parse Ralph output for signals (utility function)."""
    import re

    # Read from stdin or file
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = sys.stdin.read()

    signals = []

    # Parse signals
    patterns = [
        (r"<TASK_COMPLETE/>", "TASK_COMPLETE"),
        (r"<COMPLETE/>", "COMPLETE"),
        (r"<BLOCKED.*?>", "BLOCKED"),
        (r"<ERROR.*?>", "ERROR"),
    ]

    for pattern, signal_type in patterns:
        if re.search(pattern, content, re.IGNORECASE):
            signals.append(signal_type)

    print(json.dumps({
        "success": True,
        "signals": signals,
        "has_completion": "COMPLETE" in signals or "TASK_COMPLETE" in signals,
        "is_blocked": "BLOCKED" in signals,
        "has_error": "ERROR" in signals
    }))
    return 0


def main():
    parser = argparse.ArgumentParser(description="Ralph Workflow State Machine")
    parser.add_argument("--project", "-p", help="Project path (default: cwd)")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize new workflow")
    init_parser.add_argument("--force", "-f", action="store_true", help="Overwrite existing state")

    # Stage command
    stage_parser = subparsers.add_parser("stage", help="Get/set workflow stage")
    stage_parser.add_argument("--set", choices=[
        "init", "requirements", "tasks", "converting",
        "building", "reviewing", "complete", "failed"
    ], help="Set stage")

    # Story command
    story_parser = subparsers.add_parser("story", help="Manage stories")
    story_parser.add_argument("action", choices=["add", "update", "status", "list"])
    story_parser.add_argument("--id", help="Story ID")
    story_parser.add_argument("--worktree", help="Worktree path")
    story_parser.add_argument("--status", choices=[
        "pending", "in_progress", "complete", "blocked", "failed"
    ], help="Story status")
    story_parser.add_argument("--tasks", type=int, help="Total tasks")
    story_parser.add_argument("--completed", type=int, help="Completed tasks")

    # Signal command
    signal_parser = subparsers.add_parser("signal", help="Record Ralph signal")
    signal_parser.add_argument("--story", required=True, help="Story ID")
    signal_parser.add_argument("--signal", required=True,
                               choices=["TASK_COMPLETE", "COMPLETE", "BLOCKED", "ERROR"],
                               help="Signal type")

    # Status command
    status_parser = subparsers.add_parser("status", help="Get workflow status")

    # Parse output command
    parse_parser = subparsers.add_parser("parse-output", help="Parse Ralph output for signals")
    parse_parser.add_argument("--file", help="File to parse (default: stdin)")

    args = parser.parse_args()

    if args.command == "init":
        return cmd_init(args)
    elif args.command == "stage":
        return cmd_stage(args)
    elif args.command == "story":
        return cmd_story(args)
    elif args.command == "signal":
        return cmd_signal(args)
    elif args.command == "status":
        return cmd_status(args)
    elif args.command == "parse-output":
        return cmd_parse_output(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
