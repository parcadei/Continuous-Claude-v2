#!/usr/bin/env python3
"""Loogle Search CLI - Query Mathlib type signatures.

Usage:
    loogle-search "Nontrivial _ ↔ _"
    loogle-search "(?a → ?b) → List ?a → List ?b"
    loogle-search "IsCyclic, center"

Auto-starts the Loogle server if not running (singleton, no orphans).
"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# Configuration
SERVER_URL = "http://127.0.0.1:8340"
SEARCH_ENDPOINT = f"{SERVER_URL}/search"
HEALTH_ENDPOINT = f"{SERVER_URL}/health"


def get_loogle_home() -> Path:
    """Get Loogle installation directory from LOOGLE_HOME env var."""
    loogle_home = os.environ.get("LOOGLE_HOME")
    if loogle_home:
        return Path(loogle_home)
    # Fallback to default location
    return Path.home() / ".local" / "share" / "loogle"


def get_loogle_bin() -> Path:
    """Get path to Loogle binary."""
    return get_loogle_home() / ".lake" / "build" / "bin" / "loogle"


def get_loogle_index() -> Path:
    """Get path to Mathlib index."""
    return get_loogle_home() / "mathlib.idx"

# Server state directory
STATE_DIR = Path.home() / ".opc/loogle"
PID_FILE = STATE_DIR / "server.pid"
LOG_FILE = STATE_DIR / "server.log"

# Timeouts
HEALTH_TIMEOUT = 2  # seconds
QUERY_TIMEOUT = 30  # seconds
STARTUP_TIMEOUT = 30  # seconds to wait for server to start


def ensure_state_dir():
    """Create state directory if needed."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def is_server_healthy() -> bool:
    """Check if server is responding."""
    try:
        req = urllib.request.Request(HEALTH_ENDPOINT, method="GET")
        with urllib.request.urlopen(req, timeout=HEALTH_TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            return data.get("status") == "ok"
    except Exception:
        return False


def read_pid() -> int | None:
    """Read PID from file, return None if not exists or invalid."""
    try:
        if PID_FILE.exists():
            pid = int(PID_FILE.read_text().strip())
            # Check if process exists
            os.kill(pid, 0)
            return pid
    except (ValueError, ProcessLookupError, PermissionError):
        pass
    return None


def write_pid(pid: int):
    """Write PID to file."""
    ensure_state_dir()
    PID_FILE.write_text(str(pid))


def clear_pid():
    """Remove PID file."""
    try:
        PID_FILE.unlink()
    except FileNotFoundError:
        pass


def start_server() -> bool:
    """Start the Loogle server in background. Returns True if started successfully."""
    ensure_state_dir()

    # Find the server script
    script_dir = Path(__file__).parent
    server_script = script_dir / "loogle_server.py"

    if not server_script.exists():
        print(f"Error: Server script not found at {server_script}", file=sys.stderr)
        return False

    if not get_loogle_bin().exists():
        print(f"Error: Loogle not found at {get_loogle_bin()}", file=sys.stderr)
        print("Set LOOGLE_HOME to your Loogle installation, or run the wizard to install.", file=sys.stderr)
        return False

    # Start server with nohup, redirect output to log
    with open(LOG_FILE, "a") as log:
        log.write(f"\n=== Starting server at {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")

    # Use setsid to detach from terminal (Unix) or just subprocess on Windows
    try:
        # Fork and detach
        proc = subprocess.Popen(
            [sys.executable, str(server_script)],
            stdout=open(LOG_FILE, "a"),
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            start_new_session=True,  # setsid equivalent
            cwd=script_dir,
        )
        write_pid(proc.pid)
        return True
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        return False


def ensure_server_running() -> bool:
    """Ensure server is running, start if needed. Returns True if server is available."""
    # Fast path: server already healthy
    if is_server_healthy():
        return True

    # Check if we have a PID but server not responding
    old_pid = read_pid()
    if old_pid:
        # Server crashed or was killed, clean up
        clear_pid()

    # Start server
    print("Starting Loogle server...", file=sys.stderr)
    if not start_server():
        return False

    # Wait for server to become healthy
    start_time = time.time()
    while time.time() - start_time < STARTUP_TIMEOUT:
        if is_server_healthy():
            print("Loogle server ready.", file=sys.stderr)
            return True
        time.sleep(0.5)

    print(f"Server failed to start within {STARTUP_TIMEOUT}s. Check {LOG_FILE}", file=sys.stderr)
    return False


def query_server(q: str) -> dict | None:
    """Query the Loogle server."""
    try:
        data = json.dumps({"query": q}).encode()
        req = urllib.request.Request(
            SEARCH_ENDPOINT,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=QUERY_TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError:
        return None
    except Exception as e:
        return {"error": str(e)}


def query_direct(q: str) -> dict:
    """Query Loogle directly (cold start fallback)."""
    cmd = [str(get_loogle_bin()), "--json"]
    if get_loogle_index().exists():
        cmd.extend(["--read-index", str(get_loogle_index())])
    cmd.append(q)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        return {"error": "Query timed out (120s)"}
    except json.JSONDecodeError:
        return {"error": "Invalid response", "stdout": result.stdout, "stderr": result.stderr}
    except Exception as e:
        return {"error": str(e)}


def format_results(data: dict, limit: int = 10) -> str:
    """Format results for display."""
    if "error" in data:
        return f"Error: {data['error']}"

    lines = []
    if "header" in data:
        lines.append(data["header"].strip())
        lines.append("")

    hits = data.get("hits", [])
    for i, hit in enumerate(hits[:limit]):
        name = hit.get("name", "?")
        typ = hit.get("type", "").strip()
        module = hit.get("module", "")
        doc = hit.get("doc", "")

        lines.append(f"{name}")
        lines.append(f"  {typ}")
        if module:
            lines.append(f"  -- {module}")
        if doc:
            lines.append(f"  -- {doc[:80]}...")
        lines.append("")

    if len(hits) > limit:
        lines.append(f"... and {len(hits) - limit} more results")

    return "\n".join(lines)


def main():
    # Handle special commands
    if len(sys.argv) >= 2:
        cmd = sys.argv[1]
        if cmd == "--stop":
            pid = read_pid()
            if pid:
                try:
                    os.kill(pid, signal.SIGTERM)
                    clear_pid()
                    print("Server stopped.")
                except ProcessLookupError:
                    clear_pid()
                    print("Server was not running.")
            else:
                print("No server running.")
            return
        elif cmd == "--status":
            if is_server_healthy():
                pid = read_pid()
                print(f"Server running (PID: {pid})")
            else:
                print("Server not running")
            return
        elif cmd == "--help" or cmd == "-h":
            print("Loogle Search - Mathlib type signature search")
            print()
            print("Usage:")
            print('  loogle-search "Nontrivial _ ↔ _"')
            print('  loogle-search "(?a → ?b) → List ?a → List ?b"')
            print()
            print("Options:")
            print("  --json      Output raw JSON")
            print("  --status    Check server status")
            print("  --stop      Stop the server")
            print()
            print("Query syntax:")
            print("  _           Any single type")
            print("  ?a, ?b      Type variables (same var = same type)")
            print("  Foo, Bar    Must mention both Foo and Bar")
            return

    if len(sys.argv) < 2:
        print("Usage: loogle-search <query>")
        print("       loogle-search --help")
        sys.exit(1)

    # Parse arguments
    args = sys.argv[1:]
    json_output = "--json" in args
    if json_output:
        args.remove("--json")

    query = " ".join(args)

    # Ensure server is running
    if not ensure_server_running():
        # Fall back to direct query
        print("Falling back to direct query (slow)...", file=sys.stderr)
        result = query_direct(query)
    else:
        # Query server
        result = query_server(query)
        if result is None:
            # Server died during query?
            print("Server query failed, trying direct...", file=sys.stderr)
            result = query_direct(query)

    # Output
    if json_output:
        print(json.dumps(result, indent=2))
    else:
        print(format_results(result))


if __name__ == "__main__":
    main()
