#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Post-tool-use tracker - Cross-platform Python port.

Tracks:
1. Build/test attempts for reasoning-aware commits (Bash tool)
2. Edited files and their repos (Edit/Write tools)

Reasoning data stored in: .git/claude/branches/<branch>/attempts.jsonl
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Build/test command patterns
BUILD_PATTERNS = [
    # Package managers with build/test
    r"(npm|pnpm|yarn)\s+(run\s+)?(build|test|check|lint|typecheck)",
    # Direct test runners
    r"^(pytest|jest|vitest|mocha)",
    # Cargo
    r"^cargo\s+(build|test|check|clippy)",
    # Go
    r"^go\s+(build|test)",
    # Make
    r"^make(\s+\w+)?$",
    # TypeScript
    r"(tsc|eslint|prettier)(\s|$)",
    # Swift/Xcode
    r"(swift|xcodebuild)\s+(build|test)",
]

# Prefixes to strip before matching
RUNNER_PREFIXES = [
    r"^uv run\s+",
    r"^poetry run\s+",
    r"^pipenv run\s+",
    r"^pdm run\s+",
    r"^python -m\s+",
]

# Known repo directory patterns
KNOWN_REPOS = {
    "frontend", "client", "web", "app", "ui",
    "backend", "server", "api", "src", "services",
    "database", "prisma", "migrations",
}


def strip_runner_prefix(command: str) -> str:
    """Strip common runner prefixes (uv run, poetry run, etc.)."""
    result = command
    for prefix in RUNNER_PREFIXES:
        result = re.sub(prefix, "", result)
    return result


def is_build_command(command: str) -> bool:
    """Check if command is a build/test command worth tracking."""
    stripped = strip_runner_prefix(command)
    for pattern in BUILD_PATTERNS:
        if re.search(pattern, stripped, re.IGNORECASE):
            return True
    return False


def get_current_branch(project_dir: str) -> str:
    """Get current git branch name."""
    try:
        result = subprocess.run(
            ["git", "-C", project_dir, "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return "detached"


def log_build_attempt(
    attempts_file: Path,
    command: str,
    exit_code: int,
    branch: str,
    error_output: str | None = None,
) -> None:
    """Log a build attempt to JSONL file."""
    attempts_file.parent.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if exit_code == 0:
        entry = {
            "timestamp": timestamp,
            "type": "build_pass",
            "command": command,
            "branch": branch,
        }
    else:
        entry = {
            "timestamp": timestamp,
            "type": "build_fail",
            "command": command,
            "exit_code": str(exit_code),
            "error": error_output or "",
            "branch": branch,
        }

    with open(attempts_file, "a") as f:
        f.write(json.dumps(entry) + "\n")


def detect_repo(file_path: str, project_root: str) -> str:
    """Detect repo/package from file path."""
    if not file_path.startswith(project_root):
        return "unknown"

    relative = file_path[len(project_root):].lstrip("/")
    parts = relative.split("/")

    if not parts or not parts[0]:
        return "root"

    first_dir = parts[0]

    # Known single-level repos
    if first_dir in KNOWN_REPOS:
        return first_dir

    # Monorepo packages
    if first_dir == "packages" and len(parts) > 1:
        return f"packages/{parts[1]}"

    # Examples
    if first_dir == "examples" and len(parts) > 1:
        return f"examples/{parts[1]}"

    # Root file (no directory)
    if len(parts) == 1:
        return "root"

    return "unknown"


def track_edited_file(cache_dir: Path, file_path: str, repo: str) -> None:
    """Track an edited file in the cache."""
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Log to edited-files.log
    log_file = cache_dir / "edited-files.log"
    timestamp = int(time.time())
    with open(log_file, "a") as f:
        f.write(f"{timestamp}:{file_path}:{repo}\n")

    # Update affected repos
    repos_file = cache_dir / "affected-repos.txt"
    existing = set()
    if repos_file.exists():
        existing = set(repos_file.read_text().strip().split("\n"))
    if repo not in existing:
        with open(repos_file, "a") as f:
            f.write(f"{repo}\n")


def extract_exit_code(tool_info: dict) -> int | None:
    """Extract exit code from tool response (multiple possible paths)."""
    # Try various paths
    paths = [
        ("tool_output", "exit"),
        ("tool_response", "exit"),
        ("tool_result", "exit"),
        ("tool_result", "exit_code"),
    ]
    for path in paths:
        value = tool_info
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                value = None
                break
        if value is not None:
            try:
                return int(value)
            except (ValueError, TypeError):
                pass

    # Check interrupted flag
    if tool_info.get("tool_response", {}).get("interrupted") is False:
        return 0

    return None


def extract_output(tool_info: dict) -> str:
    """Extract output from tool response."""
    paths = [
        ("tool_output", "output"),
        ("tool_response", "output"),
        ("tool_response", "stdout"),
        ("tool_response", "stderr"),
        ("tool_result", "output"),
        ("tool_result", "stdout"),
    ]
    for path in paths:
        value = tool_info
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                value = None
                break
        if value and isinstance(value, str):
            return value[:2000]  # Truncate
    return ""


def process_tool_use(tool_info: dict) -> dict[str, Any]:
    """Process a tool use event.

    Returns dict with 'success', 'skipped', or 'error' keys.
    """
    tool_name = tool_info.get("tool_name", "")
    tool_input = tool_info.get("tool_input", {}) or {}
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    # Handle Bash tool - track build attempts
    if tool_name.lower() == "bash":
        command = tool_input.get("command", "")
        if not command or not is_build_command(command):
            return {"skipped": True, "reason": "not a build command"}

        exit_code = extract_exit_code(tool_info)
        if exit_code is None:
            return {"skipped": True, "reason": "unknown exit code"}

        branch = get_current_branch(project_dir)
        safe_branch = branch.replace("/", "-")
        attempts_file = (
            Path(project_dir) / ".git" / "claude" / "branches" / safe_branch / "attempts.jsonl"
        )

        error_output = extract_output(tool_info) if exit_code != 0 else None
        log_build_attempt(attempts_file, command, exit_code, branch, error_output)
        return {"success": True, "logged": "build_attempt"}

    # Handle Edit/Write tools - track edited files
    if tool_name in ("Edit", "MultiEdit", "Write"):
        file_path = tool_input.get("file_path", "")
        if not file_path:
            return {"skipped": True, "reason": "no file path"}

        # Skip markdown
        if file_path.endswith((".md", ".markdown")):
            return {"skipped": True, "reason": "markdown file"}

        repo = detect_repo(file_path, project_dir)
        if repo == "unknown":
            return {"skipped": True, "reason": "unknown repo"}

        session_id = tool_info.get("session_id", "default")
        cache_dir = Path(project_dir) / ".claude" / "tsc-cache" / session_id
        track_edited_file(cache_dir, file_path, repo)
        return {"success": True, "logged": "edited_file", "repo": repo}

    return {"skipped": True, "reason": "unhandled tool"}


def main() -> None:
    """CLI entrypoint - read from stdin, process, exit."""
    try:
        stdin_data = sys.stdin.read()
        tool_info = json.loads(stdin_data) if stdin_data.strip() else {}
    except json.JSONDecodeError:
        tool_info = {}

    process_tool_use(tool_info)

    # Always exit 0 (don't break the hook chain)
    sys.exit(0)


if __name__ == "__main__":
    main()
