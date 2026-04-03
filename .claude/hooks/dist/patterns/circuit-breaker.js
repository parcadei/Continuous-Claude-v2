/**
 * Unified Circuit Breaker Pattern Handlers
 *
 * Implements circuit breaker coordination logic for failure detection and fallback routing:
 * - onSubagentStart: Inject primary/fallback role context
 * - onSubagentStop: Track success/failure for circuit state
 * - onPostToolUse: Detect failures from tool responses
 * - onStop: Circuit state summary
 *
 * Environment Variables:
 * - CB_ID: Circuit breaker identifier (required for circuit breaker operations)
 * - AGENT_ROLE: Role of this agent (primary or fallback)
 * - CIRCUIT_STATE: Current circuit state (closed, open, half_open)
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */
import { existsSync } from "fs";
// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
// =============================================================================
// onSubagentStart Handler
// =============================================================================
/**
 * Handles SubagentStart hook for circuit breaker pattern.
 * Injects primary/fallback role context and circuit state information.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(input) {
  const cbId = process.env.CB_ID;
  // If no CB_ID, continue silently (not in a circuit breaker)
  if (!cbId) {
    return { result: "continue" };
  }
  // Validate CB_ID format
  if (!isValidId(cbId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "primary";
  const circuitState = process.env.CIRCUIT_STATE || "closed";
  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[circuit-breaker] Agent role=${role} state=${circuitState} cb_id=${cbId}`,
  );
  // Inject role-specific context message
  let message = "";
  if (role === "primary") {
    message = `You are the PRIMARY agent in a circuit breaker pattern (circuit state: ${circuitState}).`;
    message += " Your execution is monitored for failures.";
    if (circuitState === "half_open") {
      message +=
        " TESTING MODE: The circuit is testing if you have recovered. A single failure will reopen the circuit.";
    } else if (circuitState === "closed") {
      message +=
        " Normal operation - consecutive failures will open the circuit and route to fallback.";
    }
  } else if (role === "fallback") {
    message = `You are the FALLBACK agent in a circuit breaker pattern.`;
    message +=
      " You are operating in degraded mode as a backup to the primary agent.";
    message += " Provide a simpler or safer implementation.";
  }
  return {
    result: "continue",
    message,
  };
}
// =============================================================================
// onSubagentStop Handler
// =============================================================================
/**
 * Handles SubagentStop hook for circuit breaker pattern.
 * Records success/failure in database to track circuit state.
 */
export async function onSubagentStop(input) {
  const cbId = process.env.CB_ID;
  // If no CB_ID, continue silently
  if (!cbId) {
    return { result: "continue" };
  }
  // Validate CB_ID format
  if (!isValidId(cbId)) {
    return { result: "continue" };
  }
  const agentId = input.agent_id ?? "unknown";
  // Validate agent_id format
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "primary";
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Note: Success/failure tracking is done in onPostToolUse based on tool responses.
    // onSubagentStop just queries current circuit state for logging.
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
cb_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS circuit_state (
        id TEXT PRIMARY KEY,
        cb_id TEXT NOT NULL,
        state TEXT DEFAULT 'closed',
        failure_count INTEGER DEFAULT 0,
        last_failure_at TEXT,
        created_at TEXT NOT NULL
    )
''')

# Get current circuit state
cursor = conn.execute('''
    SELECT state, failure_count
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    state, failure_count = row
else:
    state = 'closed'
    failure_count = 0

conn.close()
print(json.dumps({'state': state, 'failure_count': failure_count}))
`;
    const result = runPythonQuery(query, [dbPath, cbId]);
    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }
    // Parse Python output
    let state;
    try {
      state = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    // Log for debugging
    console.error(
      `[circuit-breaker] Agent ${agentId} (${role}) completed. Circuit state: ${state.state} (failures: ${state.failure_count})`,
    );
    return { result: "continue" };
  } catch (err) {
    console.error("SubagentStop hook error:", err);
    return { result: "continue" };
  }
}
// =============================================================================
// onPreToolUse Handler
// =============================================================================
/**
 * Handles PreToolUse hook for circuit breaker pattern.
 * Currently no-op - circuit breaker doesn't restrict tool usage.
 */
export async function onPreToolUse(input) {
  // No special handling needed for circuit breaker pattern
  return { result: "continue" };
}
// =============================================================================
// onPostToolUse Handler
// =============================================================================
/**
 * Handles PostToolUse hook for circuit breaker pattern.
 * Detects failures from tool responses (Bash errors, Read failures, etc.).
 */
export async function onPostToolUse(input) {
  const cbId = process.env.CB_ID;
  // If no CB_ID, continue silently
  if (!cbId) {
    return { result: "continue" };
  }
  // Validate CB_ID format
  if (!isValidId(cbId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "primary";
  // Only track primary agent failures (fallback is expected to succeed)
  if (role !== "primary") {
    return { result: "continue" };
  }
  const toolName = input.tool_name;
  const toolResponse = input.tool_response || {};
  // Detect failure patterns in tool responses
  let hasFailure = false;
  // Bash failures: non-zero exit code
  if (toolName === "Bash" && typeof toolResponse === "object") {
    const exitCode = toolResponse.exit_code;
    if (typeof exitCode === "number" && exitCode !== 0) {
      hasFailure = true;
    }
  }
  // Read failures: error in response
  if (toolName === "Read" && typeof toolResponse === "object") {
    const error = toolResponse.error;
    if (error) {
      hasFailure = true;
    }
  }
  // Other tool errors
  if (typeof toolResponse === "object" && toolResponse.error) {
    hasFailure = true;
  }
  // Record result in database
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    if (hasFailure) {
      // Record failure in database
      const failureQuery = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cb_id = sys.argv[2]
tool_name = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS circuit_state (
        id TEXT PRIMARY KEY,
        cb_id TEXT NOT NULL,
        state TEXT DEFAULT 'closed',
        failure_count INTEGER DEFAULT 0,
        last_failure_at TEXT,
        created_at TEXT NOT NULL
    )
''')

# Get current state
cursor = conn.execute('''
    SELECT state, failure_count
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    current_state, failure_count = row
else:
    current_state = 'closed'
    failure_count = 0

# Increment failure count
new_failure_count = failure_count + 1
new_last_failure_at = datetime.now().isoformat()

# Open circuit after 3 failures
if new_failure_count >= 3:
    new_state = 'open'
elif current_state == 'half_open':
    # Failed during half-open test, reopen
    new_state = 'open'
else:
    new_state = current_state

# Upsert circuit state
conn.execute('''
    INSERT OR REPLACE INTO circuit_state (id, cb_id, state, failure_count, last_failure_at, created_at)
    VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM circuit_state WHERE cb_id = ?), ?))
''', (cb_id, cb_id, new_state, new_failure_count, new_last_failure_at, cb_id, datetime.now().isoformat()))
conn.commit()

conn.close()
print(json.dumps({'state': new_state, 'failure_count': new_failure_count}))
`;
      const result = runPythonQuery(failureQuery, [dbPath, cbId, toolName]);
      if (!result.success) {
        console.error("PostToolUse Python error:", result.stderr);
        return { result: "continue" };
      }
      // Log for debugging
      console.error(
        `[circuit-breaker] Detected ${toolName} failure for cb_id=${cbId}`,
      );
    } else {
      // Record success - reset failure count to 0
      const successQuery = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cb_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS circuit_state (
        id TEXT PRIMARY KEY,
        cb_id TEXT NOT NULL,
        state TEXT DEFAULT 'closed',
        failure_count INTEGER DEFAULT 0,
        last_failure_at TEXT,
        created_at TEXT NOT NULL
    )
''')

# Get current state
cursor = conn.execute('''
    SELECT state, failure_count
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    current_state, failure_count = row
    # Only update if there are failures to reset
    if failure_count > 0:
        # Reset failure count on success
        conn.execute('''
            UPDATE circuit_state
            SET failure_count = 0, state = 'closed'
            WHERE cb_id = ?
        ''', (cb_id,))
        conn.commit()
        print(json.dumps({'state': 'closed', 'failure_count': 0, 'reset': True}))
    else:
        print(json.dumps({'state': current_state, 'failure_count': 0, 'reset': False}))
else:
    # No existing state, nothing to reset
    print(json.dumps({'state': 'closed', 'failure_count': 0, 'reset': False}))

conn.close()
`;
      const result = runPythonQuery(successQuery, [dbPath, cbId]);
      if (!result.success) {
        console.error("PostToolUse Python error:", result.stderr);
        return { result: "continue" };
      }
      // Parse result to see if we reset
      try {
        const data = JSON.parse(result.stdout);
        if (data.reset) {
          console.error(
            `[circuit-breaker] Reset failure count for cb_id=${cbId} after successful ${toolName}`,
          );
        }
      } catch {
        // Ignore parse errors, continue anyway
      }
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PostToolUse hook error:", err);
    return { result: "continue" };
  }
}
// =============================================================================
// onStop Handler
// =============================================================================
/**
 * Handles Stop hook for circuit breaker pattern.
 * Provides circuit state summary when coordinator completes.
 */
export async function onStop(input) {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const cbId = process.env.CB_ID;
  if (!cbId) {
    return { result: "continue" };
  }
  // Validate CB_ID format
  if (!isValidId(cbId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Query circuit state
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
cb_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get circuit state
cursor = conn.execute('''
    SELECT state, failure_count, last_failure_at
    FROM circuit_state
    WHERE cb_id = ?
''', (cb_id,))
row = cursor.fetchone()

if row:
    state, failure_count, last_failure_at = row
else:
    state = 'closed'
    failure_count = 0
    last_failure_at = None

conn.close()
print(json.dumps({'state': state, 'failure_count': failure_count, 'last_failure_at': last_failure_at}))
`;
    const result = runPythonQuery(query, [dbPath, cbId]);
    if (!result.success) {
      return { result: "continue" };
    }
    // Parse Python output
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    // Provide circuit state summary
    let message = `Circuit Breaker Summary (ID: ${cbId}):\n`;
    message += `- State: ${data.state.toUpperCase()}\n`;
    message += `- Failure Count: ${data.failure_count}\n`;
    if (data.state === "open") {
      message +=
        "\nWARNING: Circuit is OPEN due to repeated failures. Fallback agent is being used.";
      message +=
        "\nThe circuit will automatically test the primary agent after the reset timeout.";
    } else if (data.state === "half_open") {
      message +=
        "\nINFO: Circuit is in HALF-OPEN state, testing if primary agent has recovered.";
    } else {
      message +=
        "\nINFO: Circuit is CLOSED, primary agent is operating normally.";
    }
    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
