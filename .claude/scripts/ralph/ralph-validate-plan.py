#!/usr/bin/env python3
"""
Ralph Plan Validator — Cross-Artifact Consistency Check

Validates that PRD, task breakdown, and implementation plan are consistent
before entering the delegation loop. Runs between Phase 2 (tasks) and
Phase 3 (delegation).

Inspired by spec-kit's cross-artifact analysis.

Usage:
    python ralph-validate-plan.py --project <dir> --prd <prd-path> --tasks <tasks-path>
    python ralph-validate-plan.py --project <dir> --auto  # auto-detect files

Checks:
    1. Every user story in PRD has at least one task
    2. Every task references files that exist (or are being created)
    3. No circular dependencies in task ordering
    4. Task count vs feature scope sanity check
    5. All [NEEDS CLARIFICATION] items resolved
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple


def find_prd(project_dir: str) -> Optional[Path]:
    """Auto-detect PRD file in /tasks/ directory."""
    tasks_dir = Path(project_dir) / "tasks"
    if not tasks_dir.exists():
        return None
    prds = sorted(tasks_dir.glob("prd-*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    return prds[0] if prds else None


def find_tasks_file(project_dir: str) -> Optional[Path]:
    """Auto-detect tasks file in /tasks/ directory."""
    tasks_dir = Path(project_dir) / "tasks"
    if not tasks_dir.exists():
        return None
    tasks = sorted(tasks_dir.glob("tasks-*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    return tasks[0] if tasks else None


def extract_user_stories(prd_content: str) -> List[str]:
    """Extract user story IDs from PRD (e.g., US1, US2)."""
    pattern = r'###\s+(US\d+)\s*\['
    return re.findall(pattern, prd_content)


def extract_needs_clarification(prd_content: str) -> List[str]:
    """Find unresolved [NEEDS CLARIFICATION] items."""
    pattern = r'-\s*\[\s*\]\s*\[NEEDS CLARIFICATION\]\s*(.*)'
    return re.findall(pattern, prd_content)


def extract_task_ids(tasks_content: str) -> List[str]:
    """Extract task IDs from tasks file (e.g., 1.1, 1.2, 2.1)."""
    pattern = r'^\s*(\d+\.\d+)\s'
    return re.findall(pattern, tasks_content, re.MULTILINE)


def extract_task_user_story_refs(tasks_content: str) -> Dict[str, List[str]]:
    """Map task IDs to referenced user stories."""
    mapping: Dict[str, List[str]] = {}
    current_task = None

    for line in tasks_content.splitlines():
        task_match = re.match(r'^\s*(\d+\.\d+)\s', line)
        if task_match:
            current_task = task_match.group(1)
            mapping[current_task] = []

        if current_task:
            us_refs = re.findall(r'\[US(\d+)\]', line)
            for ref in us_refs:
                story_id = f"US{ref}"
                if story_id not in mapping[current_task]:
                    mapping[current_task].append(story_id)

    return mapping


def extract_task_dependencies(tasks_content: str) -> Dict[str, List[str]]:
    """Extract dependency references between tasks."""
    deps: Dict[str, List[str]] = {}
    current_task = None

    for line in tasks_content.splitlines():
        task_match = re.match(r'^\s*(\d+\.\d+)\s', line)
        if task_match:
            current_task = task_match.group(1)
            deps[current_task] = []

        if current_task:
            dep_refs = re.findall(r'depends(?:\s+on)?:?\s*([\d.,\s]+)', line, re.IGNORECASE)
            for ref in dep_refs:
                for dep_id in re.findall(r'(\d+\.\d+)', ref):
                    if dep_id != current_task and dep_id not in deps[current_task]:
                        deps[current_task].append(dep_id)

    return deps


def check_circular_deps(deps: Dict[str, List[str]]) -> List[List[str]]:
    """Detect circular dependencies using DFS."""
    cycles: List[List[str]] = []
    visited: Set[str] = set()
    rec_stack: Set[str] = set()
    path: List[str] = []

    def dfs(node: str) -> None:
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in deps.get(node, []):
            if neighbor not in visited:
                dfs(neighbor)
            elif neighbor in rec_stack:
                # Found a cycle
                cycle_start = path.index(neighbor)
                cycles.append(path[cycle_start:] + [neighbor])

        path.pop()
        rec_stack.discard(node)

    for node in deps:
        if node not in visited:
            dfs(node)

    return cycles


def extract_file_refs(tasks_content: str) -> Dict[str, List[str]]:
    """Extract file path references from tasks."""
    file_refs: Dict[str, List[str]] = {}
    current_task = None

    for line in tasks_content.splitlines():
        task_match = re.match(r'^\s*(\d+\.\d+)\s', line)
        if task_match:
            current_task = task_match.group(1)
            file_refs[current_task] = []

        if current_task:
            # Match common file patterns
            paths = re.findall(r'`([a-zA-Z0-9_./-]+\.[a-zA-Z]+)`', line)
            file_refs[current_task].extend(paths)

    return file_refs


def validate(
    project_dir: str,
    prd_path: Optional[str] = None,
    tasks_path: Optional[str] = None,
) -> dict:
    """Run all validation checks. Returns structured result."""
    issues: List[dict] = []
    warnings: List[dict] = []

    project = Path(project_dir)

    # Resolve paths
    prd_file = Path(prd_path) if prd_path else find_prd(project_dir)
    tasks_file = Path(tasks_path) if tasks_path else find_tasks_file(project_dir)

    if not prd_file or not prd_file.exists():
        issues.append({
            "check": "prd_exists",
            "severity": "critical",
            "message": f"PRD file not found. Expected in {project / 'tasks' / 'prd-*.md'}",
        })
        return {"valid": False, "issues": issues, "warnings": warnings}

    if not tasks_file or not tasks_file.exists():
        issues.append({
            "check": "tasks_exists",
            "severity": "critical",
            "message": f"Tasks file not found. Expected in {project / 'tasks' / 'tasks-*.md'}",
        })
        return {"valid": False, "issues": issues, "warnings": warnings}

    prd_content = prd_file.read_text(encoding="utf-8")
    tasks_content = tasks_file.read_text(encoding="utf-8")

    # Check 1: Every user story has at least one task
    user_stories = extract_user_stories(prd_content)
    task_story_map = extract_task_user_story_refs(tasks_content)
    covered_stories: Set[str] = set()
    for refs in task_story_map.values():
        covered_stories.update(refs)

    for story in user_stories:
        if story not in covered_stories:
            issues.append({
                "check": "story_coverage",
                "severity": "high",
                "message": f"{story} in PRD has no corresponding task. Add a task for it or remove the story.",
            })

    # Check 2: File references exist (or are new files)
    file_refs = extract_file_refs(tasks_content)
    for task_id, files in file_refs.items():
        for filepath in files:
            full_path = project / filepath
            if not full_path.exists():
                # Could be a new file — warn, don't block
                warnings.append({
                    "check": "file_exists",
                    "severity": "info",
                    "message": f"Task {task_id} references {filepath} which doesn't exist yet. Ensure the task creates it.",
                })

    # Check 3: No circular dependencies
    deps = extract_task_dependencies(tasks_content)
    cycles = check_circular_deps(deps)
    for cycle in cycles:
        issues.append({
            "check": "circular_deps",
            "severity": "critical",
            "message": f"Circular dependency detected: {' -> '.join(cycle)}",
        })

    # Check 4: Task count sanity
    task_ids = extract_task_ids(tasks_content)
    task_count = len(task_ids)
    if task_count > 15:
        warnings.append({
            "check": "task_count",
            "severity": "medium",
            "message": f"High task count ({task_count}). Consider splitting into multiple stories or simplifying scope.",
        })
    elif task_count == 0:
        issues.append({
            "check": "task_count",
            "severity": "critical",
            "message": "No tasks found in tasks file.",
        })

    # Check 5: All [NEEDS CLARIFICATION] resolved
    unresolved = extract_needs_clarification(prd_content)
    for item in unresolved:
        issues.append({
            "check": "clarification_resolved",
            "severity": "high",
            "message": f"Unresolved clarification: {item.strip()}",
        })

    valid = not any(i["severity"] == "critical" for i in issues)
    return {
        "valid": valid,
        "issues": issues,
        "warnings": warnings,
        "summary": {
            "user_stories": len(user_stories),
            "tasks": task_count,
            "stories_covered": len(covered_stories),
            "unresolved_clarifications": len(unresolved),
            "circular_deps": len(cycles),
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Ralph Plan Validator")
    parser.add_argument("-p", "--project", required=True, help="Project directory")
    parser.add_argument("--prd", help="Path to PRD file (auto-detects if omitted)")
    parser.add_argument("--tasks", help="Path to tasks file (auto-detects if omitted)")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")

    args = parser.parse_args()
    result = validate(args.project, args.prd, args.tasks)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    # Human-readable output
    print("\n=== Ralph Plan Validation ===\n")

    summary = result["summary"]
    print(f"User Stories: {summary['user_stories']} ({summary['stories_covered']} covered by tasks)")
    print(f"Tasks: {summary['tasks']}")
    print(f"Unresolved Clarifications: {summary['unresolved_clarifications']}")
    print(f"Circular Dependencies: {summary['circular_deps']}")
    print()

    if result["issues"]:
        print("ISSUES (must fix):")
        for issue in result["issues"]:
            severity = issue["severity"].upper()
            print(f"  [{severity}] {issue['message']}")
        print()

    if result["warnings"]:
        print("WARNINGS (review):")
        for warn in result["warnings"]:
            print(f"  [{warn['severity'].upper()}] {warn['message']}")
        print()

    if result["valid"]:
        print("RESULT: PASS -- Plan is valid, proceed to delegation.")
    else:
        print("RESULT: FAIL -- Fix critical issues before proceeding.")

    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
