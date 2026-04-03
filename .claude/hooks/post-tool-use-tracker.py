#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Post-tool-use hook that:
1. Tracks edited files and their repos (Edit/Write tools)
2. Captures build/test attempts for reasoning-aware VCS (Bash tool)

Reasoning data stored in: .git/claude/branches/<branch>/attempts.jsonl
This enables future features like enriched PRs and semantic search

Cross-platform Python port of post-tool-use-tracker.sh
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def get_project_dir() -> Path:
    """Get the Claude project directory."""
    return Path(os.environ.get("CLAUDE_PROJECT_DIR", Path.cwd()))


def get_current_branch(project_dir: Path) -> str:
    """Get the current git branch name."""
    try:
        result = subprocess.run(
            ["git", "-C", str(project_dir), "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip() or "detached"
    except Exception:
        return "detached"


def strip_runner_prefix(command: str) -> str:
    """Strip common runner prefixes for matching (uv run, poetry run, etc.)."""
    prefixes = [
        r"^uv run ",
        r"^poetry run ",
        r"^pipenv run ",
        r"^pdm run ",
        r"^python -m ",
    ]
    result = command
    for prefix in prefixes:
        result = re.sub(prefix, "", result)
    return result


def is_build_test_command(command: str) -> bool:
    """Check if command is a build/test command worth tracking."""
    stripped = strip_runner_prefix(command)

    # Pattern 1: tool + action keywords
    pattern1 = re.compile(
        r"(npm|pnpm|yarn|make|cargo|go|pytest|jest|vitest|bun|swift|xcodebuild|tsc|eslint|prettier)"
        r".*(build|test|check|lint|compile|typecheck|run build|run test|run check|run lint)"
    )

    # Pattern 2: npm/pnpm/yarn run commands
    pattern2 = re.compile(r"^(npm|pnpm|yarn)\s+(run\s+)?(build|test|check|lint|typecheck)$")

    # Pattern 3: Direct tool commands
    pattern3 = re.compile(r"^(make|cargo build|cargo test|go build|go test|pytest|jest|vitest)")

    return bool(pattern1.search(stripped) or pattern2.match(stripped) or pattern3.match(stripped))


def extract_exit_code(tool_info: dict) -> str:
    """Extract exit code from tool info, trying multiple field paths."""
    # Try direct exit code fields
    for path in [
        ("tool_output", "exit"),
        ("tool_response", "exit"),
        ("tool_result", "exit"),
        ("tool_result", "exit_code"),
    ]:
        value = tool_info
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                value = None
                break
        if value is not None:
            return str(value)

    # Check if tool_response.interrupted == false means success
    tool_response = tool_info.get("tool_response", {})
    if tool_response.get("interrupted") is False:
        return "0"

    return "unknown"


def extract_output(tool_info: dict) -> str:
    """Extract output from tool info, trying multiple field paths."""
    for path in [
        ("tool_output", "output"),
        ("tool_response", "output"),
        ("tool_response", "stdout"),
        ("tool_response", "stderr"),
        ("tool_result", "output"),
        ("tool_result", "stdout"),
    ]:
        value = tool_info
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                value = None
                break
        if value:
            # Truncate to 2000 chars
            return str(value)[:2000]
    return ""


def read_transcript_for_exit(transcript_path: str) -> tuple[str, str]:
    """Fallback: read exit code from transcript file."""
    try:
        path = Path(transcript_path)
        if not path.exists():
            return "unknown", ""

        # Read last 50 lines
        lines = path.read_text().strip().split("\n")[-50:]

        for line in reversed(lines):
            try:
                entry = json.loads(line)
                if entry.get("tool_name") == "bash" and entry.get("type") == "tool_result":
                    exit_code = str(entry.get("tool_output", {}).get("exit", "unknown"))
                    output = str(entry.get("tool_output", {}).get("output", ""))[:2000]
                    return exit_code, output
            except json.JSONDecodeError:
                continue

        return "unknown", ""
    except Exception:
        return "unknown", ""


def handle_bash_tool(tool_info: dict) -> None:
    """Handle Bash tool - capture build/test attempts for reasoning."""
    command = tool_info.get("tool_input", {}).get("command", "")

    if not command or not is_build_test_command(command):
        return

    project_dir = get_project_dir()
    current_branch = get_current_branch(project_dir)
    safe_branch = current_branch.replace("/", "-")

    # Initialize branch-keyed storage
    branch_dir = project_dir / ".git" / "claude" / "branches" / safe_branch
    branch_dir.mkdir(parents=True, exist_ok=True)

    # Extract exit code and output
    exit_code = extract_exit_code(tool_info)
    output = extract_output(tool_info)

    # Fallback to transcript if exit code unknown
    if exit_code == "unknown":
        transcript_path = tool_info.get("transcript_path", "")
        if transcript_path:
            exit_code, output = read_transcript_for_exit(transcript_path)

    # Log attempt to branch-keyed JSONL file
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    attempts_file = branch_dir / "attempts.jsonl"

    if exit_code not in ("0", "unknown", "null", None, ""):
        # Log failure with error output
        entry = {
            "timestamp": timestamp,
            "type": "build_fail",
            "command": command,
            "exit_code": exit_code,
            "error": output,
            "branch": current_branch,
        }
        with open(attempts_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    elif exit_code == "0":
        # Log success (no error output needed)
        entry = {
            "timestamp": timestamp,
            "type": "build_pass",
            "command": command,
            "branch": current_branch,
        }
        with open(attempts_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    # If exit_code still unknown/null, silently skip


def detect_repo(file_path: str) -> str:
    """Detect repo from file path."""
    project_root = get_project_dir()

    try:
        relative_path = Path(file_path).relative_to(project_root)
    except ValueError:
        return "unknown"

    parts = relative_path.parts
    if not parts:
        return "root"

    first_dir = parts[0]

    # Common project directory patterns
    if first_dir in ("frontend", "client", "web", "app", "ui"):
        return first_dir
    elif first_dir in ("backend", "server", "api", "src", "services"):
        return first_dir
    elif first_dir in ("database", "prisma", "migrations"):
        return first_dir
    elif first_dir == "packages":
        # For monorepos, get the package name
        if len(parts) > 1:
            return f"packages/{parts[1]}"
        return first_dir
    elif first_dir == "examples":
        # Get the example name
        if len(parts) > 1:
            return f"examples/{parts[1]}"
        return first_dir
    else:
        # Check if it's a source file in root
        if len(parts) == 1:
            return "root"
        return "unknown"


def get_build_command(repo: str) -> str:
    """Get build command for repo."""
    project_root = get_project_dir()
    repo_path = project_root / repo
    package_json = repo_path / "package.json"

    # Check if package.json exists and has a build script
    if package_json.exists():
        try:
            with open(package_json) as f:
                pkg = json.load(f)

            if "build" in pkg.get("scripts", {}):
                # Detect package manager (prefer pnpm, then npm, then yarn)
                if (repo_path / "pnpm-lock.yaml").exists():
                    return f"cd {repo_path} && pnpm build"
                elif (repo_path / "package-lock.json").exists():
                    return f"cd {repo_path} && npm run build"
                elif (repo_path / "yarn.lock").exists():
                    return f"cd {repo_path} && yarn build"
                else:
                    return f"cd {repo_path} && npm run build"
        except (json.JSONDecodeError, IOError):
            pass

    # Special case for database with Prisma
    if repo == "database" or "prisma" in repo:
        if (repo_path / "schema.prisma").exists() or (repo_path / "prisma" / "schema.prisma").exists():
            return f"cd {repo_path} && npx prisma generate"

    return ""


def get_tsc_command(repo: str) -> str:
    """Get TSC command for repo."""
    project_root = get_project_dir()
    repo_path = project_root / repo

    # Check if tsconfig.json exists
    if (repo_path / "tsconfig.json").exists():
        # Check for Vite/React-specific tsconfig
        if (repo_path / "tsconfig.app.json").exists():
            return f"cd {repo_path} && npx tsc --project tsconfig.app.json --noEmit"
        else:
            return f"cd {repo_path} && npx tsc --noEmit"

    return ""


def mark_tldr_dirty(file_path: str) -> None:
    """Mark file dirty for tldr incremental indexing (P3)."""
    try:
        from tldr.dirty_flag import mark_dirty
        mark_dirty(str(get_project_dir()), file_path)
    except Exception:
        pass  # Silently fail if tldr not available


def handle_edit_tool(tool_info: dict) -> None:
    """Handle Edit/Write tools - track edited files and repos."""
    file_path = tool_info.get("tool_input", {}).get("file_path", "")
    session_id = tool_info.get("session_id", "default")

    if not file_path:
        return

    # Skip markdown files
    if file_path.endswith((".md", ".markdown")):
        return

    # Detect repo
    repo = detect_repo(file_path)

    if repo in ("unknown", ""):
        return

    project_dir = get_project_dir()

    # Create cache directory
    cache_dir = project_dir / ".claude" / "tsc-cache" / session_id
    cache_dir.mkdir(parents=True, exist_ok=True)

    # Log edited file
    import time
    with open(cache_dir / "edited-files.log", "a") as f:
        f.write(f"{int(time.time())}:{file_path}:{repo}\n")

    # Mark file dirty for tldr incremental indexing
    mark_tldr_dirty(file_path)

    # Update affected repos list
    affected_repos_file = cache_dir / "affected-repos.txt"
    existing_repos = set()
    if affected_repos_file.exists():
        existing_repos = set(affected_repos_file.read_text().strip().split("\n"))

    if repo not in existing_repos:
        with open(affected_repos_file, "a") as f:
            f.write(f"{repo}\n")

    # Store build commands
    build_cmd = get_build_command(repo)
    tsc_cmd = get_tsc_command(repo)

    commands_file = cache_dir / "commands.txt"
    cache_dir / "commands.txt.tmp"

    # Read existing commands
    existing_commands = set()
    if commands_file.exists():
        existing_commands = set(commands_file.read_text().strip().split("\n"))

    # Add new commands
    if build_cmd:
        existing_commands.add(f"{repo}:build:{build_cmd}")
    if tsc_cmd:
        existing_commands.add(f"{repo}:tsc:{tsc_cmd}")

    # Write sorted unique commands
    if existing_commands:
        with open(commands_file, "w") as f:
            f.write("\n".join(sorted(existing_commands)) + "\n")


def main() -> None:
    """Main entry point."""
    # Read tool information from stdin
    try:
        tool_info = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = tool_info.get("tool_name", "")

    # Handle Bash tool (build/test tracking)
    if tool_name.lower() == "bash":
        handle_bash_tool(tool_info)
        sys.exit(0)

    # Handle Edit/Write tools (file tracking)
    if tool_name in ("Edit", "MultiEdit", "Write"):
        handle_edit_tool(tool_info)

    sys.exit(0)


if __name__ == "__main__":
    main()
