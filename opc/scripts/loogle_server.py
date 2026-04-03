#!/usr/bin/env python3
"""Loogle Server - Keep Loogle warm for fast Mathlib type searches.

Starts Loogle in interactive mode and serves queries via HTTP.
First query loads the index (~10s), subsequent queries are instant.

Usage:
    # Start server (background)
    python scripts/loogle_server.py &

    # Query
    curl -X POST http://localhost:8340/search -d '{"query": "Nontrivial _ ↔ _"}'

    # Or use the CLI wrapper
    loogle-search "Nontrivial _ ↔ _"
"""
from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from threading import Lock

# Configuration
PORT = 8340


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

# Global server reference for signal handlers
_server: HTTPServer | None = None

class LoogleProcess:
    """Manages a persistent Loogle process in interactive mode."""

    def __init__(self):
        self.process: subprocess.Popen | None = None
        self.lock = Lock()
        self._started = False

    def start(self):
        """Start Loogle in interactive mode."""
        if self.process is not None:
            return

        cmd = [str(get_loogle_bin()), "--interactive", "--json"]
        if get_loogle_index().exists():
            cmd.extend(["--read-index", str(get_loogle_index())])

        print(f"Starting Loogle: {' '.join(cmd)}")
        self.process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

        # Wait for "Loogle is ready." message
        ready_msg = self.process.stdout.readline()
        if "ready" in ready_msg.lower():
            print(f"Loogle ready: {ready_msg.strip()}")
        else:
            print(f"Unexpected first line: {ready_msg.strip()}")

        self._started = True
        print("Loogle process started and ready")

    def query(self, q: str) -> dict:
        """Send a query and get JSON result."""
        with self.lock:
            if self.process is None or self.process.poll() is not None:
                self.start()

            try:
                # Send query
                self.process.stdin.write(q + "\n")
                self.process.stdin.flush()

                # Read response (one line of JSON)
                line = self.process.stdout.readline()
                if not line:
                    return {"error": "No response from Loogle"}

                return json.loads(line)
            except Exception as e:
                return {"error": str(e)}

    def stop(self):
        """Stop the Loogle process."""
        if self.process:
            self.process.terminate()
            self.process.wait()
            self.process = None


# Global Loogle instance
loogle = LoogleProcess()


class LoogleHandler(BaseHTTPRequestHandler):
    """HTTP handler for Loogle queries."""

    def do_POST(self):
        if self.path == "/search":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode()

            try:
                data = json.loads(body)
                query = data.get("query", "")
            except json.JSONDecodeError:
                # Plain text query
                query = body.strip()

            if not query:
                self.send_error(400, "Missing query")
                return

            result = loogle.query(query)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "started": loogle._started}).encode())
        elif self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Loogle Server\n\nPOST /search {\"query\": \"...\"}\nGET /health\n")
        else:
            self.send_error(404)

    def log_message(self, format, *args):
        # Quieter logging
        if "/health" not in str(args):
            print(f"[Loogle] {args[0]}")


def shutdown_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    global _server
    print(f"\nReceived signal {signum}, shutting down...")
    loogle.stop()
    if _server:
        _server.shutdown()
    sys.exit(0)


def main():
    """Run the Loogle server."""
    global _server

    if not get_loogle_bin().exists():
        print(f"Error: Loogle not found at {get_loogle_bin()}")
        print("Set LOOGLE_HOME to your Loogle installation, or run the wizard to install.")
        sys.exit(1)

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, shutdown_handler)
    signal.signal(signal.SIGINT, shutdown_handler)

    # Pre-start Loogle (loads index on first query)
    loogle.start()

    _server = HTTPServer(("127.0.0.1", PORT), LoogleHandler)
    print(f"Loogle server listening on http://127.0.0.1:{PORT}")
    print(f"PID: {os.getpid()}")
    print("Endpoints:")
    print("  POST /search  - Query Mathlib (body: {\"query\": \"...\"})")
    print("  GET  /health  - Health check")
    print()

    try:
        _server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        loogle.stop()
        _server.shutdown()


if __name__ == "__main__":
    main()
