#!/usr/bin/env python3
"""
Ralph Progress Sync

Bidirectional sync between .ralph/state.json (machine truth) and
.ralph/IMPLEMENTATION_PLAN.md (human-readable checklist).

State.json is the SINGLE source of truth. IMPLEMENTATION_PLAN.md is
auto-generated FROM it.

USAGE:
    # Generate/overwrite IMPLEMENTATION_PLAN.md from state.json
    python ralph-progress-sync.py sync --project /path

    # Show discrepancies between state.json and IMPLEMENTATION_PLAN.md
    python ralph-progress-sync.py diff --project /path

    # Fix drift: markdown [x] updates state, then regenerate markdown
    python ralph-progress-sync.py reconcile --project /path [--dry-run]

STATUS MAPPING:
    complete    -> [x]
    in_progress -> [>]
    failed      -> [!]
    blocked     -> [#]
    pending     -> [ ]
    skipped     -> [-]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional


# ------------------------------------------------------------------ #
#  Constants                                                          #
# ------------------------------------------------------------------ #

STATUS_TO_MARKER = {
    "complete": "[x]",
    "completed": "[x]",
    "in_progress": "[>]",
    "failed": "[!]",
    "blocked": "[#]",
    "pending": "[ ]",
    "skipped": "[-]",
}

MARKER_TO_STATUS = {
    "[x]": "complete",
    "[>]": "in_progress",
    "[!]": "failed",
    "[#]": "blocked",
    "[ ]": "pending",
    "[-]": "skipped",
}

# Regex to parse a task line in IMPLEMENTATION_PLAN.md
# Matches: - [x] **1.1** Task name  OR  - [x] 1.1 Task name
TASK_LINE_RE = re.compile(
    r"^(\s*)-\s*\[([ x>!#\-])\]\s*\*{0,2}(\d+(?:\.\d+)?)\*{0,2}\s*(.*)"
)


# ------------------------------------------------------------------ #
#  State script interface                                             #
# ------------------------------------------------------------------ #

def get_state_script() -> str:
    """Get path to ralph-state-v2.py."""
    home = os.environ.get("HOME") or os.environ.get("USERPROFILE") or ""
    script = os.path.join(home, ".claude", "scripts", "ralph", "ralph-state-v2.py")
    if not os.path.exists(script):
        script = os.path.join(os.path.dirname(__file__), "ralph-state-v2.py")
    return script


def run_state_cmd(project: str, *args: str) -> dict:
    """Run ralph-state-v2.py command and return parsed JSON output."""
    script = get_state_script()
    cmd = ["python", script, "-p", project] + list(args)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    if result.returncode != 0:
        return {"success": False, "error": result.stderr or "Command failed"}
    try:
        # Handle multi-line output (status prints indented JSON)
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"success": False, "error": f"Invalid JSON: {result.stdout[:200]}"}


def load_state_direct(project: str) -> Optional[dict]:
    """Load state.json directly (faster than subprocess for read-only)."""
    state_path = Path(project) / ".ralph" / "state.json"
    if not state_path.exists():
        return None
    try:
        with open(state_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


# ------------------------------------------------------------------ #
#  Markdown generation                                                #
# ------------------------------------------------------------------ #

def generate_markdown(state: dict) -> str:
    """Generate IMPLEMENTATION_PLAN.md content from state.json."""
    story_id = state.get("story_id", "UNKNOWN")
    tasks = state.get("tasks", [])

    lines = [
        f"# Implementation Plan: {story_id}",
        "",
        f"*Auto-generated from state.json. Do not edit manually -- use ralph-progress-sync.py reconcile.*",
        "",
    ]

    # Summary stats
    total = len(tasks)
    complete = sum(1 for t in tasks if t.get("status") in ("complete", "completed"))
    pct = round(complete / total * 100) if total else 0
    lines.append(f"**Progress:** {complete}/{total} ({pct}%)")
    lines.append("")

    # Group tasks by parent (1.x, 2.x, etc.)
    parents: dict[str, list[dict]] = {}
    parent_tasks: dict[str, dict] = {}
    for task in tasks:
        tid = task.get("id", "")
        parts = tid.split(".")
        if len(parts) == 1:
            # This is a parent task
            parent_tasks[tid] = task
            parents.setdefault(tid, [])
        else:
            parent_id = parts[0]
            parents.setdefault(parent_id, []).append(task)

    # Render tasks
    lines.append("## Tasks")
    lines.append("")

    for parent_id in sorted(parents.keys(), key=_sort_key):
        parent = parent_tasks.get(parent_id)
        if parent:
            marker = STATUS_TO_MARKER.get(parent.get("status", "pending"), "[ ]")
            agent_str = f" ({parent.get('agent', '')})" if parent.get("agent") else ""
            lines.append(f"- {marker} **{parent_id}** {parent.get('name', '')}{agent_str}")
        else:
            lines.append(f"### Group {parent_id}")

        for child in sorted(parents[parent_id], key=lambda t: _sort_key(t.get("id", ""))):
            marker = STATUS_TO_MARKER.get(child.get("status", "pending"), "[ ]")
            agent_str = f" ({child.get('agent', '')})" if child.get("agent") else ""
            deps_str = ""
            if child.get("depends_on"):
                deps_str = f" [deps: {', '.join(child['depends_on'])}]"
            lines.append(f"  - {marker} **{child['id']}** {child.get('name', '')}{agent_str}{deps_str}")

        lines.append("")

    # Footer
    lines.append("---")
    lines.append(f"*Generated by ralph-progress-sync.py*")

    return "\n".join(lines) + "\n"


def _sort_key(task_id: str) -> tuple:
    """Sort key for task IDs like '1', '1.1', '2.3'."""
    parts = task_id.split(".")
    result = []
    for p in parts:
        try:
            result.append(int(p))
        except ValueError:
            result.append(0)
    return tuple(result)


# ------------------------------------------------------------------ #
#  Markdown parsing                                                   #
# ------------------------------------------------------------------ #

def parse_markdown(content: str) -> dict[str, str]:
    """Parse IMPLEMENTATION_PLAN.md and return {task_id: status} mapping."""
    results = {}
    for line in content.splitlines():
        m = TASK_LINE_RE.match(line)
        if m:
            marker_char = m.group(2)
            task_id = m.group(3)
            marker = f"[{marker_char}]"
            status = MARKER_TO_STATUS.get(marker, "pending")
            results[task_id] = status
    return results


# ------------------------------------------------------------------ #
#  Commands                                                           #
# ------------------------------------------------------------------ #

def cmd_sync(args) -> int:
    """Generate/overwrite IMPLEMENTATION_PLAN.md from state.json."""
    project = os.path.abspath(args.project or os.getcwd())
    state = load_state_direct(project)

    if not state:
        print(json.dumps({"success": False, "error": "No state.json found"}))
        return 1

    content = generate_markdown(state)
    plan_path = Path(project) / ".ralph" / "IMPLEMENTATION_PLAN.md"
    plan_path.parent.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        print(content)
        return 0

    with open(plan_path, "w", encoding="utf-8") as f:
        f.write(content)

    tasks = state.get("tasks", [])
    complete = sum(1 for t in tasks if t.get("status") in ("complete", "completed"))
    print(json.dumps({
        "success": True,
        "path": str(plan_path),
        "total_tasks": len(tasks),
        "complete": complete,
    }))
    return 0


def cmd_diff(args) -> int:
    """Show discrepancies between state.json and IMPLEMENTATION_PLAN.md."""
    project = os.path.abspath(args.project or os.getcwd())
    state = load_state_direct(project)

    if not state:
        print(json.dumps({"success": False, "error": "No state.json found"}))
        return 1

    plan_path = Path(project) / ".ralph" / "IMPLEMENTATION_PLAN.md"
    if not plan_path.exists():
        print(json.dumps({"success": False, "error": "No IMPLEMENTATION_PLAN.md found"}))
        return 1

    with open(plan_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    md_statuses = parse_markdown(md_content)
    state_tasks = {t["id"]: t.get("status", "pending") for t in state.get("tasks", [])}

    discrepancies = []

    # Check all state tasks against markdown
    for task_id, state_status in state_tasks.items():
        md_status = md_statuses.get(task_id)
        if md_status is None:
            discrepancies.append({
                "task_id": task_id,
                "type": "missing_in_markdown",
                "state_status": state_status,
            })
        elif md_status != state_status and not (
            md_status == "complete" and state_status == "completed"
        ):
            discrepancies.append({
                "task_id": task_id,
                "type": "status_mismatch",
                "state_status": state_status,
                "markdown_status": md_status,
            })

    # Check for tasks in markdown but not in state
    for task_id, md_status in md_statuses.items():
        if task_id not in state_tasks:
            discrepancies.append({
                "task_id": task_id,
                "type": "missing_in_state",
                "markdown_status": md_status,
            })

    print(json.dumps({
        "success": True,
        "in_sync": len(discrepancies) == 0,
        "discrepancies": discrepancies,
        "state_tasks": len(state_tasks),
        "markdown_tasks": len(md_statuses),
    }, indent=2))
    return 0


def cmd_reconcile(args) -> int:
    """Fix drift between state.json and IMPLEMENTATION_PLAN.md.

    Rules:
    - Markdown [x] but state pending -> update state to complete (human verified)
    - State complete but markdown [ ] -> state wins (regenerate markdown)
    - After reconciling state, regenerate markdown from state
    """
    project = os.path.abspath(args.project or os.getcwd())
    state = load_state_direct(project)

    if not state:
        print(json.dumps({"success": False, "error": "No state.json found"}))
        return 1

    plan_path = Path(project) / ".ralph" / "IMPLEMENTATION_PLAN.md"
    changes = []

    if plan_path.exists():
        with open(plan_path, "r", encoding="utf-8") as f:
            md_content = f.read()

        md_statuses = parse_markdown(md_content)
        state_tasks = {t["id"]: t for t in state.get("tasks", [])}

        # Apply markdown overrides to state (human verification wins)
        for task_id, md_status in md_statuses.items():
            state_task = state_tasks.get(task_id)
            if not state_task:
                continue

            current_status = state_task.get("status", "pending")
            # Normalize completed/complete
            if current_status == "completed":
                current_status = "complete"

            if md_status != current_status:
                # Markdown [x] on a pending/failed task = human verified complete
                if md_status == "complete" and current_status in ("pending", "failed", "in_progress"):
                    if not args.dry_run:
                        run_state_cmd(project, "task-complete", "--id", task_id)
                    changes.append({
                        "task_id": task_id,
                        "action": "state_updated",
                        "from": current_status,
                        "to": "complete",
                        "reason": "markdown_override",
                    })

    # Regenerate markdown from (now-updated) state
    if not args.dry_run:
        # Reload state after potential changes
        state = load_state_direct(project)
        if state:
            content = generate_markdown(state)
            with open(plan_path, "w", encoding="utf-8") as f:
                f.write(content)

    print(json.dumps({
        "success": True,
        "changes": changes,
        "dry_run": args.dry_run,
        "markdown_regenerated": not args.dry_run,
    }, indent=2))
    return 0


# ------------------------------------------------------------------ #
#  Main                                                               #
# ------------------------------------------------------------------ #

def main() -> int:
    parser = argparse.ArgumentParser(description="Ralph Progress Sync")
    parser.add_argument("--project", "-p", help="Project path (default: cwd)")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # sync
    sync_p = subparsers.add_parser("sync", help="Generate IMPLEMENTATION_PLAN.md from state.json")
    sync_p.add_argument("--dry-run", action="store_true", help="Print markdown instead of writing")

    # diff
    subparsers.add_parser("diff", help="Show discrepancies between state and markdown")

    # reconcile
    rec_p = subparsers.add_parser("reconcile", help="Fix drift between state and markdown")
    rec_p.add_argument("--dry-run", action="store_true", help="Show changes without applying")

    args = parser.parse_args()

    commands = {
        "sync": cmd_sync,
        "diff": cmd_diff,
        "reconcile": cmd_reconcile,
    }

    handler = commands.get(args.command)
    if handler:
        return handler(args)
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
