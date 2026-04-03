/**
 * Shared database utilities for Claude Code hooks.
 *
 * Extracted from pre-tool-use-broadcast.ts as part of the
 * pattern-aware hooks architecture (Phase 2).
 *
 * Exports:
 * - getDbPath(): Returns path to coordination.db
 * - queryDb(): Executes Python subprocess to query SQLite
 * - runPythonQuery(): Alternative that returns success/stdout/stderr object
 * - getActiveAgentCount(): Returns count of running agents (Phase 2: Resource Limits)
 */
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
// Re-export SAFE_ID_PATTERN and isValidId from pattern-router for convenience
export { SAFE_ID_PATTERN, isValidId } from "./pattern-router.js";
/**
 * Get the path to the coordination database.
 *
 * Uses CLAUDE_PROJECT_DIR environment variable if set,
 * otherwise falls back to process.cwd().
 *
 * @returns Absolute path to coordination.db
 */
export function getDbPath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  return join(
    projectDir,
    ".claude",
    "cache",
    "agentica-coordination",
    "coordination.db",
  );
}
/**
 * Execute a Python query against the coordination database.
 *
 * Uses spawnSync with argument array to prevent command injection.
 * The Python code receives arguments via sys.argv.
 *
 * @param pythonQuery - Python code to execute (receives args via sys.argv)
 * @param args - Arguments passed to Python (sys.argv[1], sys.argv[2], ...)
 * @returns stdout from Python subprocess
 * @throws Error if Python subprocess fails
 */
export function queryDb(pythonQuery, args) {
  // Use spawnSync with argument array to prevent command injection
  const result = spawnSync("python3", ["-c", pythonQuery, ...args], {
    encoding: "utf-8",
    maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) {
    const errorMsg =
      result.stderr || `Python exited with code ${result.status}`;
    throw new Error(`Python query failed: ${errorMsg}`);
  }
  return result.stdout.trim();
}
/**
 * Execute a Python query and return structured result.
 *
 * Unlike queryDb(), this function does not throw on error.
 * Instead, it returns a result object with success, stdout, and stderr.
 *
 * @param script - Python code to execute (receives args via sys.argv)
 * @param args - Arguments passed to Python (sys.argv[1], sys.argv[2], ...)
 * @returns Object with success boolean, stdout string, and stderr string
 */
export function runPythonQuery(script, args) {
  try {
    const result = spawnSync("python3", ["-c", script, ...args], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    return {
      success: result.status === 0,
      stdout: result.stdout?.trim() || "",
      stderr: result.stderr || "",
    };
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: String(err),
    };
  }
}
/**
 * Register a new agent in the coordination database.
 *
 * Inserts a new agent record with status='running'.
 * Creates the database and tables if they don't exist.
 * Automatically detects source from environment (AGENTICA_SERVER env var).
 *
 * @param agentId - Unique agent identifier
 * @param sessionId - Session that spawned the agent
 * @param pattern - Coordination pattern (swarm, hierarchical, etc.)
 * @param pid - Process ID for orphan detection (optional)
 * @returns Object with success boolean and any error message
 */
export function registerAgent(agentId, sessionId, pattern = null, pid = null) {
  const dbPath = getDbPath();
  // Detect source: if AGENTICA_SERVER env var is set, it's from agentica
  // Otherwise it's from the CLI (Task tool)
  const source = process.env.AGENTICA_SERVER ? "agentica" : "cli";
  const pythonScript = `
import sqlite3
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

db_path = sys.argv[1]
agent_id = sys.argv[2]
session_id = sys.argv[3]
pattern = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'null' else None
pid = int(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != 'null' else None
source = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != 'null' else None

try:
    # Ensure directory exists
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")

    # Create table if not exists (with source column)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            premise TEXT,
            model TEXT,
            scope_keys TEXT,
            pattern TEXT,
            parent_agent_id TEXT,
            pid INTEGER,
            ppid INTEGER,
            spawned_at TEXT NOT NULL,
            completed_at TEXT,
            status TEXT DEFAULT 'running',
            error_message TEXT,
            source TEXT
        )
    """)

    # Migration: add source column if it doesn't exist
    cursor = conn.execute("PRAGMA table_info(agents)")
    columns = {row[1] for row in cursor.fetchall()}
    if 'source' not in columns:
        conn.execute("ALTER TABLE agents ADD COLUMN source TEXT")

    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    ppid = os.getppid() if pid else None

    conn.execute(
        """
        INSERT OR REPLACE INTO agents
        (id, session_id, pattern, pid, ppid, spawned_at, status, source)
        VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
        """,
        (agent_id, session_id, pattern, pid, ppid, now, source)
    )
    conn.commit()
    conn.close()
    print("ok")
except Exception as e:
    print(f"error: {e}")
    sys.exit(1)
`;
  const args = [
    dbPath,
    agentId,
    sessionId,
    pattern || "null",
    pid !== null ? String(pid) : "null",
    source,
  ];
  const result = runPythonQuery(pythonScript, args);
  if (!result.success || result.stdout !== "ok") {
    return {
      success: false,
      error: result.stderr || result.stdout || "Unknown error",
    };
  }
  return { success: true };
}
/**
 * Mark an agent as completed in the coordination database.
 *
 * Updates the agent's status and sets completed_at timestamp.
 *
 * @param agentId - Agent identifier to complete
 * @param status - Final status ('completed' or 'failed')
 * @param errorMessage - Optional error message for failed status
 * @returns Object with success boolean and any error message
 */
export function completeAgent(
  agentId,
  status = "completed",
  errorMessage = null,
) {
  const dbPath = getDbPath();
  // Return success if database doesn't exist (nothing to update)
  if (!existsSync(dbPath)) {
    return { success: true };
  }
  const pythonScript = `
import sqlite3
import sys
from datetime import datetime, timezone

db_path = sys.argv[1]
agent_id = sys.argv[2]
status = sys.argv[3]
error_message = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != 'null' else None

try:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")

    # Check if agents table exists
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agents'"
    )
    if cursor.fetchone() is None:
        print("ok")
        conn.close()
        sys.exit(0)

    now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()

    conn.execute(
        """
        UPDATE agents
        SET completed_at = ?, status = ?, error_message = ?
        WHERE id = ?
        """,
        (now, status, error_message, agent_id)
    )
    conn.commit()
    conn.close()
    print("ok")
except Exception as e:
    print(f"error: {e}")
    sys.exit(1)
`;
  const args = [dbPath, agentId, status, errorMessage || "null"];
  const result = runPythonQuery(pythonScript, args);
  if (!result.success || result.stdout !== "ok") {
    return {
      success: false,
      error: result.stderr || result.stdout || "Unknown error",
    };
  }
  return { success: true };
}
/**
 * Detect if this agent is part of a swarm (concurrent spawn pattern).
 *
 * Checks if there are multiple agents in the same session spawned within
 * a short time window (5 seconds). If so, updates all of them to pattern="swarm".
 *
 * This enables automatic swarm detection for Claude Code Task tool spawns
 * without requiring explicit PATTERN_TYPE environment variable.
 *
 * @param sessionId - Session to check for concurrent spawns
 * @returns true if swarm pattern was detected and applied
 */
export function detectAndTagSwarm(sessionId) {
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return false;
  }
  const pythonScript = `
import sqlite3
import sys
from datetime import datetime, timezone, timedelta

db_path = sys.argv[1]
session_id = sys.argv[2]

try:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")

    # Check if agents table exists
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agents'"
    )
    if cursor.fetchone() is None:
        print("no_table")
        conn.close()
        sys.exit(0)

    # Get agents in this session spawned in the last 5 seconds
    # that are still running and have pattern='task' or NULL
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = (now - timedelta(seconds=5)).isoformat()

    cursor = conn.execute(
        """
        SELECT id FROM agents
        WHERE session_id = ?
          AND spawned_at > ?
          AND status = 'running'
          AND (pattern = 'task' OR pattern IS NULL)
        """,
        (session_id, cutoff)
    )
    concurrent_agents = cursor.fetchall()

    # If more than 1 concurrent agent, tag all as swarm
    if len(concurrent_agents) > 1:
        agent_ids = [row[0] for row in concurrent_agents]
        placeholders = ','.join('?' * len(agent_ids))
        conn.execute(
            f"UPDATE agents SET pattern = 'swarm' WHERE id IN ({placeholders})",
            agent_ids
        )
        conn.commit()
        print(f"swarm:{len(concurrent_agents)}")
    else:
        print("no_swarm")

    conn.close()
except Exception as e:
    print(f"error: {e}")
    sys.exit(1)
`;
  const result = runPythonQuery(pythonScript, [dbPath, sessionId]);
  if (!result.success) {
    return false;
  }
  return result.stdout.startsWith("swarm:");
}
/**
 * Get the count of active (running) agents across all sessions.
 *
 * Queries the coordination database for agents with status='running'.
 * Returns 0 if:
 * - Database doesn't exist
 * - Database query fails
 * - agents table doesn't exist
 *
 * Uses runPythonQuery() pattern to safely execute the SQLite query.
 *
 * @returns Number of running agents, or 0 on any error
 */
export function getActiveAgentCount() {
  const dbPath = getDbPath();
  // Return 0 if database doesn't exist
  if (!existsSync(dbPath)) {
    return 0;
  }
  const pythonScript = `
import sqlite3
import sys
import os

db_path = sys.argv[1]

try:
    # Check if file exists and is a valid SQLite database
    if not os.path.exists(db_path):
        print("0")
        sys.exit(0)

    conn = sqlite3.connect(db_path)
    # Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
    conn.execute("PRAGMA busy_timeout = 5000")
    # Enable WAL mode for better concurrent access
    conn.execute("PRAGMA journal_mode = WAL")

    # Check if agents table exists
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agents'"
    )
    if cursor.fetchone() is None:
        print("0")
        conn.close()
        sys.exit(0)

    # Query running agent count
    cursor = conn.execute("SELECT COUNT(*) FROM agents WHERE status = 'running'")
    count = cursor.fetchone()[0]
    conn.close()
    print(count)
except Exception:
    print("0")
`;
  const result = runPythonQuery(pythonScript, [dbPath]);
  if (!result.success) {
    return 0;
  }
  const count = parseInt(result.stdout, 10);
  return isNaN(count) ? 0 : count;
}
