#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Session Start Continuity Hook (Python port).

Loads YAML handoff context at session start. Injects full handoff (~400 tokens).

Input: JSON with session_id, source ('startup'|'resume'|'clear'|'compact')
Output: JSON with hookSpecificOutput.additionalContext
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any


def _compute_socket_path(project_dir: str) -> str:
    """Compute deterministic socket path from project dir (matches daemon.py)."""
    hash_val = hashlib.md5(project_dir.encode()).hexdigest()[:8]
    return f"/tmp/tldr-{hash_val}.sock"


def _get_connection_info(project_dir: str) -> tuple[str, int | None]:
    """Return (address, port) - port is None for Unix sockets.

    On Windows, uses TCP on localhost with a deterministic port.
    On Unix (Linux/macOS), uses Unix domain sockets.

    Mirrors the daemon.py logic.
    """
    if sys.platform == "win32":
        # TCP on localhost with deterministic port from hash
        hash_val = hashlib.md5(project_dir.encode()).hexdigest()[:8]
        port = 49152 + (int(hash_val, 16) % 10000)
        return ("127.0.0.1", port)
    else:
        # Unix socket path
        socket_path = _compute_socket_path(project_dir)
        return (socket_path, None)


def _is_daemon_running(project_dir: str) -> bool:
    """Check if daemon is running by attempting a connection.

    Cross-platform: Uses TCP on Windows, Unix socket on Linux/macOS.
    """
    import socket as sock

    addr, port = _get_connection_info(project_dir)

    try:
        if port is not None:
            # Windows: TCP connection test
            test_sock = sock.socket(sock.AF_INET, sock.SOCK_STREAM)
            test_sock.settimeout(1.0)
            test_sock.connect((addr, port))
            test_sock.sendall(b'{"cmd":"ping"}\n')
            response = test_sock.recv(1024)
            test_sock.close()
            return b'"status"' in response
        else:
            # Unix: socket connection test via nc
            result = subprocess.run(
                ["nc", "-U", addr],
                input='{"cmd":"ping"}',
                capture_output=True,
                timeout=1,
                text=True,
            )
            return result.returncode == 0
    except (OSError, subprocess.TimeoutExpired, FileNotFoundError):
        return False


def ensure_tldr_daemon() -> str:
    """Start TLDR daemon if not running, report status to Claude.

    This function:
    1. Computes socket/TCP connection info from project dir
    2. Sets TLDR_DAEMON_SOCKET and TLDR_PROJECT_DIR env vars via CLAUDE_ENV_FILE
    3. Handles first-run (no .tldr/ dir) - starts background indexing
    4. Starts daemon if not running
    5. Returns status message for Claude context

    Returns:
        Status message string for Claude's context
    """
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    tldr_dir = Path(project_dir) / ".tldr"
    env_file = os.environ.get("CLAUDE_ENV_FILE")

    # Compute connection info (platform-aware)
    addr, port = _get_connection_info(project_dir)
    socket_path = _compute_socket_path(project_dir) if port is None else None

    # Set env vars for all hooks
    if env_file:
        try:
            with open(env_file, "a") as f:
                if socket_path:
                    f.write(f'export TLDR_DAEMON_SOCKET="{socket_path}"\n')
                else:
                    # Windows: store host:port
                    f.write(f'export TLDR_DAEMON_HOST="{addr}"\n')
                    f.write(f'export TLDR_DAEMON_PORT="{port}"\n')
                f.write(f'export TLDR_PROJECT_DIR="{project_dir}"\n')
        except Exception as e:
            print(f"Warning: Failed to write TLDR env vars: {e}", file=sys.stderr)

    # Check if first run (no .tldr/ directory)
    if not tldr_dir.exists():
        # First run: create dir and start background indexing
        try:
            tldr_dir.mkdir(parents=True, exist_ok=True)
            log_file = tldr_dir / "indexing.log"

            # Start background indexing
            subprocess.Popen(
                ["tldr", "warm", "--project", project_dir],
                stdout=open(log_file, "w"),
                stderr=subprocess.STDOUT,
            )

            # Write status file
            (tldr_dir / "status").write_text("indexing")

            return "TLDR: First run - indexing in background (searches may be slower)"
        except Exception as e:
            print(f"Warning: Failed to start TLDR indexing: {e}", file=sys.stderr)
            return f"TLDR: Indexing failed - {e}"

    # Check if daemon is already running (platform-aware)
    if _is_daemon_running(project_dir):
        return "TLDR: Daemon running"

    # Start daemon
    try:
        subprocess.Popen(
            ["tldr", "daemon", "start", "--project", project_dir],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return "TLDR: Starting daemon"
    except Exception as e:
        print(f"Warning: Failed to start TLDR daemon: {e}", file=sys.stderr)
        return f"TLDR: Daemon start failed - {e}"


def ensure_semantic_index() -> str | None:
    """Build semantic index in background if not present.

    The semantic index enables vector search for code using embeddings.
    It requires the call graph (from tldr warm) to be built first.

    Returns:
        Status message if action taken, None otherwise
    """
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    tldr_dir = Path(project_dir) / ".tldr"
    semantic_dir = tldr_dir / "cache" / "semantic"
    index_file = semantic_dir / "index.faiss"
    call_graph_file = tldr_dir / "cache" / "call_graph.json"

    # Only build if call graph exists but semantic index doesn't
    if not call_graph_file.exists():
        # Call graph not ready yet - warm still running or not started
        return None

    if index_file.exists():
        # Semantic index already built
        return None

    # Build semantic index in background
    try:
        log_file = tldr_dir / "semantic_indexing.log"
        subprocess.Popen(
            ["tldr", "semantic", "index", project_dir],
            stdout=open(log_file, "w"),
            stderr=subprocess.STDOUT,
        )
        return "TLDR: Building semantic index in background"
    except Exception as e:
        print(f"Warning: Failed to start semantic indexing: {e}", file=sys.stderr)
        return None


def ensure_memory_daemon() -> str | None:
    """Start global memory extraction daemon if not running.

    The memory daemon monitors for stale sessions (heartbeat > 5 min)
    and automatically extracts learnings when sessions end.

    This is a GLOBAL daemon (one for all projects) using a PID file
    at ~/.claude/memory-daemon.pid.

    Returns:
        Status message or None if daemon was already running
    """
    pid_file = Path.home() / ".claude" / "memory-daemon.pid"

    # Check if already running
    if pid_file.exists():
        try:
            pid = int(pid_file.read_text().strip())
            os.kill(pid, 0)  # Check if process exists
            return None  # Already running, no message needed
        except (ValueError, ProcessLookupError, PermissionError):
            # Stale PID file, remove it
            pid_file.unlink(missing_ok=True)

    # Start daemon
    try:
        # Try multiple locations for memory_daemon.py
        daemon_script = None
        possible_locations = [
            # 1. Relative to hook (development setup)
            Path(__file__).parent.parent.parent / "opc" / "scripts" / "core" / "memory_daemon.py",
            # 2. In .claude/scripts/core/ (wizard-installed)
            Path(__file__).parent.parent / "scripts" / "core" / "memory_daemon.py",
            # 3. Global ~/.claude/scripts/core/ (global install)
            Path.home() / ".claude" / "scripts" / "core" / "memory_daemon.py",
            # 4. Legacy ~/.opc-dev location
            Path.home() / ".opc-dev" / "opc" / "scripts" / "core" / "memory_daemon.py",
        ]

        for loc in possible_locations:
            if loc.exists():
                daemon_script = loc
                break

        if daemon_script:
            subprocess.Popen(
                ["uv", "run", str(daemon_script), "start"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                cwd=str(daemon_script.parent.parent.parent),  # opc/ dir
            )
            return "Memory daemon: Started"
        else:
            return None  # Script not found, skip silently
    except Exception as e:
        print(f"Warning: Failed to start memory daemon: {e}", file=sys.stderr)
        return None


def get_project_dir() -> Path:
    """Get project directory from env or cwd."""
    return Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()))


def get_ppid(pid: int) -> int | None:
    """Get parent PID cross-platform.

    Args:
        pid: Process ID to get parent of

    Returns:
        Parent PID as int, or None if lookup fails
    """
    if pid <= 0:
        return None

    if sys.platform == "win32":
        # Windows: use wmic
        try:
            result = subprocess.run(
                ["wmic", "process", "where", f"ProcessId={pid}", "get", "ParentProcessId"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            for line in result.stdout.strip().split("\n"):
                line = line.strip()
                if line.isdigit():
                    return int(line)
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
            pass
        return None
    else:
        # Unix: ps -o ppid=
        try:
            result = subprocess.run(
                ["ps", "-o", "ppid=", "-p", str(pid)],
                capture_output=True,
                text=True,
                timeout=5,
            )
            ppid_str = result.stdout.strip()
            if ppid_str.isdigit():
                return int(ppid_str)
        except (subprocess.TimeoutExpired, FileNotFoundError, ValueError, Exception):
            pass
        return None


def get_terminal_shell_pid() -> int | None:
    """Get stable terminal shell PID (great-grandparent).

    Process chain: Hook shell -> Claude (PPID) -> Terminal shell (great-grandparent)
    Terminal shell PID is stable across /clear and unique per terminal.

    Returns:
        Terminal shell PID, or None if chain is too short or lookup fails
    """
    try:
        parent = os.getppid()  # Hook shell
        grandparent = get_ppid(parent)  # Claude
        if grandparent:
            return get_ppid(grandparent)  # Terminal shell
    except Exception:
        pass
    return None


def get_instance_session(terminal_pid: int) -> str | None:
    """Query instance_sessions table for session name.

    Args:
        terminal_pid: Terminal shell PID to look up

    Returns:
        Session name if found, None otherwise
    """
    project_dir = get_project_dir()
    db_path = project_dir / ".claude" / "cache" / "artifact-index" / "context.db"

    if not db_path.exists():
        return None

    try:
        conn = sqlite3.connect(str(db_path), timeout=3)
        cursor = conn.execute(
            "SELECT session_name FROM instance_sessions WHERE terminal_pid = ?",
            (str(terminal_pid),),
        )
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception:
        return None


def set_instance_session(terminal_pid: int, session_name: str) -> bool:
    """Store terminal_pid -> session_name mapping.

    Creates the instance_sessions table if it doesn't exist.

    Args:
        terminal_pid: Terminal shell PID
        session_name: Session name to associate with this terminal

    Returns:
        True if successful, False otherwise
    """
    project_dir = get_project_dir()
    db_dir = project_dir / ".claude" / "cache" / "artifact-index"
    db_path = db_dir / "context.db"

    try:
        db_dir.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(db_path), timeout=3)

        # Create table if not exists
        conn.execute("""
            CREATE TABLE IF NOT EXISTS instance_sessions (
                terminal_pid TEXT PRIMARY KEY,
                session_name TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert or replace
        conn.execute(
            """
            INSERT OR REPLACE INTO instance_sessions (terminal_pid, session_name, updated_at)
            VALUES (?, ?, datetime('now'))
            """,
            (str(terminal_pid), session_name),
        )
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False


def parse_filename_timestamp(path: Path) -> str:
    """Extract YYYY-MM-DD_HH-MM timestamp from filename.

    Returns '0000-00-00_00-00' if no timestamp found (sorts oldest).
    """
    match = re.search(r'(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})', path.name)
    return match.group(1) if match else '0000-00-00_00-00'


def find_most_recent_handoff(dir_path: Path) -> Path | None:
    """Find most recent .yaml or .md handoff file in a directory by filename timestamp."""
    if not dir_path.exists():
        return None

    # Prefer .yaml, then .yml, then .md - sorted by filename timestamp
    handoff_files = sorted(
        [f for f in dir_path.iterdir() if f.suffix in (".yaml", ".yml", ".md")],
        key=lambda f: (
            # Sort by: 1) yaml preferred (1=yaml, 0=md), 2) filename timestamp
            # With reverse=True: higher values first
            1 if f.suffix in (".yaml", ".yml") else 0,
            parse_filename_timestamp(f)
        ),
        reverse=True
    )
    return handoff_files[0] if handoff_files else None


def parse_handoff(content: str) -> dict[str, Any]:
    """Parse handoff to extract key fields (YAML or Markdown).

    Simple parser - no external deps needed.
    """
    result: dict[str, Any] = {
        "session": None,
        "goal": None,
        "now": None,
        "status": None,
    }

    # Extract frontmatter fields
    frontmatter_match = re.search(r'^---\n(.*?)\n---', content, re.DOTALL)
    if frontmatter_match:
        frontmatter = frontmatter_match.group(1)
        for line in frontmatter.split('\n'):
            if ':' in line:
                key, _, value = line.partition(':')
                key = key.strip()
                value = value.strip().strip('"\'')
                if key == 'session':
                    result["session"] = value
                elif key == 'session_name':
                    result["session"] = result["session"] or value
                elif key == 'status':
                    result["status"] = value
                elif key == 'topic' and not result["goal"]:
                    # Markdown frontmatter: topic becomes goal
                    result["goal"] = value

    # YAML body fields (goal:, now: at start of line)
    for line in content.split('\n'):
        if line.startswith('goal:'):
            result["goal"] = line.partition(':')[2].strip()
        elif line.startswith('now:'):
            result["now"] = line.partition(':')[2].strip()

    # Markdown fallbacks if YAML fields not found
    if not result["now"]:
        # Priority 1: "### Now" section
        now_match = re.search(r'### Now\n+\[?-?>?\]?\s*(.+?)(?:\n|$)', content)
        if now_match:
            result["now"] = now_match.group(1).strip()[:80]

        # Priority 2: First unchecked item "- [ ]"
        if not result["now"]:
            unchecked = re.search(r'- \[ \]\s*(.+?)(?:\n|$)', content)
            if unchecked:
                result["now"] = unchecked.group(1).strip()[:80]

        # Priority 3: "## Action Items" or "## Next Steps" first item
        if not result["now"]:
            action_match = re.search(
                r'##\s*(?:Action Items|Next Steps)[^\n]*\n+(?:###[^\n]*\n+)?(?:\d+\.|-)?\s*(.+?)(?:\n|$)',
                content
            )
            if action_match:
                result["now"] = action_match.group(1).strip()[:80]

        # Priority 4: First numbered list item from "## Task(s)"
        if not result["now"]:
            task_match = re.search(r'## Task\(?s?\)?\n+\d+\.\s*(.+?)(?:\n|$)', content)
            if task_match:
                result["now"] = task_match.group(1).strip()[:80]

    if not result["goal"]:
        # Try # Handoff: title
        title_match = re.search(r'^# (?:Handoff:?\s*)?(.+?)$', content, re.MULTILINE)
        if title_match:
            result["goal"] = title_match.group(1).strip()

    return result


def find_session_handoff(session_name: str) -> Path | None:
    """Find most recent handoff for a session."""
    project_dir = get_project_dir()
    handoff_dir = project_dir / "thoughts" / "shared" / "handoffs" / session_name
    return find_most_recent_handoff(handoff_dir)


def get_unmarked_handoffs() -> list[dict[str, Any]]:
    """Query artifact index for unmarked handoffs."""
    try:
        project_dir = get_project_dir()
        db_path = project_dir / ".claude" / "cache" / "artifact-index" / "context.db"

        if not db_path.exists():
            return []

        conn = sqlite3.connect(str(db_path), timeout=3)
        cursor = conn.execute(
            "SELECT id, session_name, task_number, task_summary "
            "FROM handoffs WHERE outcome = 'UNKNOWN' "
            "ORDER BY indexed_at DESC LIMIT 5"
        )
        rows = cursor.fetchall()
        conn.close()

        return [
            {
                "id": row[0],
                "session_name": row[1],
                "task_number": row[2],
                "task_summary": row[3] or ""
            }
            for row in rows
        ]
    except Exception:
        return []


def write_session_env_vars(session_id: str, transcript_path: str) -> None:
    """Write session info to CLAUDE_ENV_FILE for later use by memory extractor.

    Args:
        session_id: The current session ID
        transcript_path: Path to the session JSONL transcript
    """
    env_file = os.environ.get("CLAUDE_ENV_FILE")
    if env_file and session_id:
        try:
            with open(env_file, "a") as f:
                f.write(f"CURRENT_SESSION_ID={session_id}\n")
                if transcript_path:
                    f.write(f"CURRENT_JSONL_PATH={transcript_path}\n")
        except Exception as e:
            print(f"Warning: Failed to write session env vars: {e}", file=sys.stderr)


def cleanup_orphaned_tldr_processes() -> None:
    """Kill orphaned tldr processes (PPID=1, adopted by init).

    These occur when hooks spawn tldr search/impact and the parent dies
    before the child completes (e.g., timeout, session end).
    Only runs on Unix (macOS/Linux) - no-op on Windows.
    """
    if sys.platform == "win32":
        return  # Windows doesn't have PPID=1 orphan pattern

    import subprocess
    try:
        # Find tldr processes with PPID=1 (orphaned)
        result = subprocess.run(
            ["pgrep", "-f", "tldr", "-P", "1"],
            capture_output=True, text=True, timeout=5
        )
        pids = result.stdout.strip().split("\n")
        for pid in pids:
            if pid.isdigit():
                try:
                    os.kill(int(pid), 9)  # SIGKILL
                except (ProcessLookupError, PermissionError):
                    pass
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        pass  # pgrep not available or failed - skip silently


def cleanup_stale_extraction_processes(max_age_seconds: int = 300) -> None:
    """Kill stale memory extraction processes (headless claude -p).

    Prevents accumulation of hung processes from previous create_handoff runs.
    Runs silently - errors are ignored to not block session start.
    Cross-platform: Works on Windows, macOS, and Linux.
    """
    import signal
    import time

    pids_file = get_project_dir() / ".claude" / "cache" / "memory-extraction" / "active-pids.json"
    if not pids_file.exists():
        return

    try:
        pids = json.loads(pids_file.read_text())
    except (json.JSONDecodeError, FileNotFoundError):
        return

    now = time.time()
    active = []
    is_windows = sys.platform == "win32"

    for entry in pids:
        age = now - entry.get("started", 0)
        pid = entry.get("pid")

        if age > max_age_seconds:
            # Kill old process (cross-platform)
            try:
                if is_windows:
                    # Windows: use taskkill or CTRL_BREAK_EVENT
                    import subprocess
                    subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                                   capture_output=True, check=False)
                else:
                    os.kill(pid, signal.SIGTERM)
            except (ProcessLookupError, OSError, PermissionError, FileNotFoundError):
                pass  # Already dead or can't kill
        else:
            # Check if still running
            try:
                if is_windows:
                    # Windows: os.kill(pid, 0) works for checking
                    os.kill(pid, 0)
                    active.append(entry)
                else:
                    os.kill(pid, 0)  # Signal 0 = check if alive
                    active.append(entry)
            except (ProcessLookupError, OSError):
                pass  # Dead, don't keep

    # Update active pids file
    try:
        pids_file.write_text(json.dumps(active))
    except Exception:
        pass


def main() -> None:
    """Main hook entry point."""
    input_data = json.load(sys.stdin)
    project_dir = get_project_dir()

    # Clean up stale/orphaned processes from previous sessions
    cleanup_orphaned_tldr_processes()  # Kill orphaned tldr search/impact
    cleanup_stale_extraction_processes(max_age_seconds=300)  # 5 min old extractors

    # Ensure TLDR daemon is running (provides fast search)
    tldr_status = ensure_tldr_daemon()

    # Build semantic index if call graph is ready but semantic index missing
    semantic_status = ensure_semantic_index()

    # Ensure global memory daemon is running (extracts learnings from stale sessions)
    memory_status = ensure_memory_daemon()

    # Write session env vars for memory extraction at handoff time
    session_id = input_data.get("session_id", "")
    transcript_path = input_data.get("transcript_path", "")
    write_session_env_vars(session_id, transcript_path)

    # Support both 'source' (per docs) and 'type' (legacy)
    session_type = input_data.get("source") or input_data.get("type")

    message = ""
    additional_context = ""

    # Include status messages in context if relevant
    if tldr_status:
        additional_context = tldr_status + "\n"
    if semantic_status:
        additional_context += semantic_status + "\n"
    if memory_status:
        additional_context += memory_status + "\n"
    if additional_context:
        additional_context += "\n"

    # Scan handoffs directory for most recent handoff
    handoffs_dir = project_dir / "thoughts" / "shared" / "handoffs"
    if handoffs_dir.exists():
        try:
            # Session affinity: check if this terminal has an associated session
            terminal_pid = get_terminal_shell_pid()
            instance_session_name = None
            if terminal_pid:
                instance_session_name = get_instance_session(terminal_pid)

            # If we have session affinity, only look in that session's directory
            if instance_session_name:
                session_dirs = []
                affinity_session_dir = handoffs_dir / instance_session_name
                if affinity_session_dir.exists():
                    session_dirs = [affinity_session_dir]
                # If affinity session dir doesn't exist, fall back to all sessions
                if not session_dirs:
                    session_dirs = [d for d in handoffs_dir.iterdir() if d.is_dir()]
            else:
                # No session affinity - scan all session directories
                session_dirs = [d for d in handoffs_dir.iterdir() if d.is_dir()]

            # Find most recent handoff across selected sessions
            most_recent: dict[str, Any] | None = None

            for session_dir in session_dirs:
                session_name = session_dir.name
                # Strip UUID suffix if present
                base_name = re.sub(r'-[0-9a-f]{8}$', '', session_name, flags=re.IGNORECASE)

                handoff_path = find_most_recent_handoff(session_dir)
                if handoff_path:
                    timestamp = parse_filename_timestamp(handoff_path)
                    if not most_recent or timestamp > most_recent["timestamp"]:
                        content = handoff_path.read_text()
                        parsed = parse_handoff(content)

                        most_recent = {
                            "content": content,
                            "session_name": parsed.get("session") or base_name,
                            "handoff_path": handoff_path,
                            "timestamp": timestamp,
                            "goal": parsed.get("goal") or "No goal found",
                            "now": parsed.get("now") or "Unknown",
                            "is_yaml": handoff_path.suffix in (".yaml", ".yml"),
                        }

            if most_recent:
                session_name = most_recent["session_name"]
                current_focus = most_recent["now"]
                handoff_filename = most_recent["handoff_path"].name
                most_recent["is_yaml"]

                if session_type == "startup":
                    # Fresh startup: brief notification
                    message = f"Handoff: {session_name} -> {current_focus} (run /resume_handoff to continue)"
                else:
                    # resume/clear/compact: inject full handoff
                    print(f"Handoff loaded: {session_name} -> {current_focus}", file=sys.stderr)
                    message = f"[{session_type}] Loaded: {handoff_filename} | Goal: {most_recent['goal'][:80]} | Now: {current_focus}"

                    if session_type in ("clear", "compact"):
                        # Inject full YAML handoff (only ~400 tokens)
                        additional_context = f"Continuity ledger loaded from {handoff_filename}:\n\n{most_recent['content']}"

                        # Add unmarked handoffs prompt
                        unmarked = get_unmarked_handoffs()
                        if unmarked:
                            additional_context += "\n\n---\n\n## Unmarked Session Outcomes\n\n"
                            additional_context += "The following handoffs have no outcome marked. Consider marking them to improve future session recommendations:\n\n"
                            for h in unmarked:
                                task_label = f"task-{h['task_number']}" if h['task_number'] else "handoff"
                                preview = h['task_summary'][:60] + "..." if h['task_summary'] else "(no summary)"
                                additional_context += f"- **{h['session_name']}/{task_label}** (ID: `{h['id'][:8]}`): {preview}\n"
                            additional_context += "\nTo mark an outcome:\n```bash\nuv run python scripts/artifact_mark.py --handoff <ID> --outcome SUCCEEDED|PARTIAL_PLUS|PARTIAL_MINUS|FAILED\n```\n"

        except Exception as e:
            print(f"Warning: Error scanning handoffs: {e}", file=sys.stderr)

    # Fallback: check legacy ledger files
    if not additional_context:
        ledger_dir = project_dir / "thoughts" / "ledgers"
        if ledger_dir.exists():
            ledger_files = sorted(
                [f for f in ledger_dir.iterdir()
                 if f.name.startswith("CONTINUITY_CLAUDE-") and f.suffix == ".md"],
                key=lambda f: f.stat().st_mtime,
                reverse=True
            )

            if ledger_files and session_type != "startup":
                print("DEPRECATED: Using legacy ledger. Migrate with /create_handoff", file=sys.stderr)
                ledger_path = ledger_files[0]
                session_name = ledger_path.stem.replace("CONTINUITY_CLAUDE-", "")
                message = f"[{session_type}] Legacy ledger: {session_name} (migrate with /create_handoff)"

    # No handoff/ledger found
    if not message and session_type != "startup":
        message = f"[{session_type}] No handoff found. Create one with /create_handoff"

    # Output
    output: dict[str, Any] = {"result": "continue"}

    if message:
        output["message"] = message
        output["systemMessage"] = message

    if additional_context:
        output["hookSpecificOutput"] = {
            "hookEventName": "SessionStart",
            "additionalContext": additional_context
        }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
