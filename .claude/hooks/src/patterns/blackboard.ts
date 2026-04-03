/**
 * Unified Blackboard Pattern Handlers
 *
 * Implements blackboard coordination logic for shared state contributions:
 * - onSubagentStart: Inject specialist role and readable/writable keys
 * - onSubagentStop: Track contribution completion
 * - onPreToolUse: Inject current blackboard state for specialists
 * - onStop: Controller approval notification
 *
 * Environment Variables:
 * - BLACKBOARD_ID: Blackboard identifier (required)
 * - AGENT_ROLE: Role in blackboard (specialist or controller)
 * - BLACKBOARD_WRITES_TO: Comma-separated keys this specialist writes to
 * - BLACKBOARD_READS_FROM: Comma-separated keys this specialist reads from
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */

import { existsSync } from "fs";

// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
import type {
  SubagentStartInput,
  SubagentStopInput,
  PreToolUseInput,
  PostToolUseInput,
  StopInput,
  HookOutput,
} from "../shared/types.js";

// Re-export types for convenience
export type {
  SubagentStartInput,
  SubagentStopInput,
  PreToolUseInput,
  PostToolUseInput,
  StopInput,
  HookOutput,
};

// =============================================================================
// onSubagentStart Handler
// =============================================================================

/**
 * Handles SubagentStart hook for blackboard pattern.
 * Injects specialist role and readable/writable keys context.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(
  input: SubagentStartInput,
): Promise<HookOutput> {
  const blackboardId = process.env.BLACKBOARD_ID;

  // If no BLACKBOARD_ID, continue silently (not in a blackboard)
  if (!blackboardId) {
    return { result: "continue" };
  }

  // Validate BLACKBOARD_ID format
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "specialist";
  const writesTo = process.env.BLACKBOARD_WRITES_TO || "";
  const readsFrom = process.env.BLACKBOARD_READS_FROM || "";

  // Log for debugging - this goes to stderr, not stdout
  console.error(`[blackboard] ${role} starting for blackboard ${blackboardId}`);

  // Build context message based on role
  let message = "";

  if (role === "controller") {
    message = "You are the controller for this blackboard pattern.";
    message +=
      " Review the final blackboard state and determine if the solution is complete and coherent.";
    message +=
      " Approve only when all required information is present and consistent.";
  } else {
    // Specialist role
    message = `You are a specialist in the blackboard pattern.`;

    if (writesTo) {
      const keys = writesTo
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);
      message += `\n\nYou are responsible for writing to these blackboard keys: ${keys.join(", ")}`;
    }

    if (readsFrom) {
      const keys = readsFrom
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k);
      message += `\n\nYou may read from these blackboard keys: ${keys.join(", ")}`;
    }

    message +=
      "\n\nProvide your contribution based on the current blackboard state.";
    message +=
      " Focus on your assigned keys and build upon work from other specialists.";
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
 * Handles SubagentStop hook for blackboard pattern.
 * Records specialist contribution to database.
 */
export async function onSubagentStop(
  input: SubagentStopInput,
): Promise<HookOutput> {
  const blackboardId = process.env.BLACKBOARD_ID;

  // If no BLACKBOARD_ID, continue silently
  if (!blackboardId) {
    return { result: "continue" };
  }

  // Validate BLACKBOARD_ID format
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }

  const agentId = input.agent_id ?? "unknown";

  // Validate agent_id format
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "specialist";
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Record contribution completion
    const query = `
import sqlite3
import sys
from datetime import datetime

db_path = sys.argv[1]
blackboard_id = sys.argv[2]
agent_id = sys.argv[3]
role = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS blackboard_state (
        id TEXT PRIMARY KEY,
        blackboard_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(blackboard_id, key)
    )
''')

# Record that this agent contributed (even if no specific keys written yet)
# This is just a marker that the specialist finished
state_id = f"{blackboard_id}_{agent_id}_completed"
conn.execute('''
    INSERT OR REPLACE INTO blackboard_state (id, blackboard_id, key, value, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
''', (state_id, blackboard_id, f"_completed_{agent_id}", "true", agent_id, datetime.now().isoformat()))
conn.commit()
conn.close()
`;

    const result = runPythonQuery(query, [dbPath, blackboardId, agentId, role]);

    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }

    // Log for debugging
    console.error(`[blackboard] ${role} ${agentId} completed contribution`);

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
 * Handles PreToolUse hook for blackboard pattern.
 * Injects current blackboard state for specialists to read.
 * Controller does not receive state injection.
 */
export async function onPreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const blackboardId = process.env.BLACKBOARD_ID;

  // If no BLACKBOARD_ID, continue silently
  if (!blackboardId) {
    return { result: "continue" };
  }

  // Validate BLACKBOARD_ID format
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "specialist";

  // Only inject state for specialists
  if (role !== "specialist") {
    return { result: "continue" };
  }

  const readsFrom = process.env.BLACKBOARD_READS_FROM || "";

  // If specialist doesn't read from any keys, no injection needed
  if (!readsFrom) {
    return { result: "continue" };
  }

  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Fetch current blackboard state for keys this specialist reads from
    const keys = readsFrom
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
blackboard_id = sys.argv[2]
keys_json = sys.argv[3]

keys = json.loads(keys_json)

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Fetch state for requested keys
state = {}
for key in keys:
    cursor = conn.execute('''
        SELECT value, updated_by
        FROM blackboard_state
        WHERE blackboard_id = ? AND key = ?
    ''', (blackboard_id, key))
    row = cursor.fetchone()
    if row:
        state[key] = {'value': row[0], 'updated_by': row[1]}

conn.close()
print(json.dumps(state))
`;

    const result = runPythonQuery(query, [
      dbPath,
      blackboardId,
      JSON.stringify(keys),
    ]);

    if (!result.success) {
      console.error("PreToolUse Python error:", result.stderr);
      return { result: "continue" };
    }

    // Parse Python output
    let state: Record<string, { value: string; updated_by: string }>;
    try {
      state = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    // If no state found, continue without injection
    if (Object.keys(state).length === 0) {
      return { result: "continue" };
    }

    // Build state injection message
    let message = "CURRENT BLACKBOARD STATE:\n\n";
    for (const [key, data] of Object.entries(state)) {
      message += `${key}: ${data.value}\n`;
      message += `  (contributed by: ${data.updated_by})\n\n`;
    }

    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}

// =============================================================================
// onPostToolUse Handler
// =============================================================================

/**
 * Valid key pattern: alphanumeric, underscore, hyphen only.
 * Rejects shell metacharacters, path traversal, SQL injection attempts.
 */
const VALID_KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * Extract blackboard key from file path.
 * Expected format: /blackboard/{key}.md or similar
 *
 * @param filePath - File path from Write tool input
 * @returns Key name if valid blackboard path, null otherwise
 */
function extractBlackboardKey(filePath: string): string | null {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }

  // Check if path contains /blackboard/
  const blackboardMatch = filePath.match(
    /\/blackboard\/([^\/]+?)(?:\.[^\/]*)?$/,
  );
  if (!blackboardMatch) {
    return null;
  }

  const key = blackboardMatch[1];

  // Validate key format (security: reject metacharacters, path traversal)
  if (!VALID_KEY_PATTERN.test(key)) {
    return null;
  }

  return key;
}

/**
 * Handles PostToolUse hook for blackboard pattern.
 * Records Write operations that update blackboard keys to the coordination database.
 *
 * Requirements:
 * - Only processes Write tool calls
 * - Only specialists can contribute (controller bypasses)
 * - Validates key against BLACKBOARD_WRITES_TO allowed keys
 * - Validates input format for security (no injection attacks)
 * - Records changes to blackboard_state table
 */
export async function onPostToolUse(
  input: PostToolUseInput,
): Promise<HookOutput> {
  const blackboardId = process.env.BLACKBOARD_ID;

  // If no BLACKBOARD_ID, continue silently (not in a blackboard)
  if (!blackboardId) {
    return { result: "continue" };
  }

  // Validate BLACKBOARD_ID format
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }

  // Only process Write tool calls
  if (input.tool_name !== "Write") {
    return { result: "continue" };
  }

  // Controller role bypasses write tracking
  const role = process.env.AGENT_ROLE || "specialist";
  if (role === "controller") {
    return { result: "continue" };
  }

  // Extract file path from tool input
  const toolInput = input.tool_input as
    | { file_path?: string; content?: string }
    | undefined;
  if (!toolInput || typeof toolInput.file_path !== "string") {
    return { result: "continue" };
  }

  // Extract and validate blackboard key from file path
  const key = extractBlackboardKey(toolInput.file_path);
  if (!key) {
    return { result: "continue" };
  }

  // Validate write permissions
  const writesTo = process.env.BLACKBOARD_WRITES_TO || "";
  const allowedKeys = writesTo
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k);

  if (allowedKeys.length > 0 && !allowedKeys.includes(key)) {
    // Key not in allowed list - don't record
    console.error(
      `[blackboard] Write to key '${key}' not allowed. Allowed: ${allowedKeys.join(", ")}`,
    );
    return { result: "continue" };
  }

  // Get agent ID
  const agentId = process.env.AGENT_ID || "unknown";
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }

  // Get content value
  const value = typeof toolInput.content === "string" ? toolInput.content : "";

  // Check if DB exists
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Record write to database
    const query = `
import sqlite3
import sys
from datetime import datetime

db_path = sys.argv[1]
blackboard_id = sys.argv[2]
key = sys.argv[3]
value = sys.argv[4]
agent_id = sys.argv[5]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS blackboard_state (
        id TEXT PRIMARY KEY,
        blackboard_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(blackboard_id, key)
    )
''')

# Record the write
state_id = f"{blackboard_id}_{key}"
conn.execute('''
    INSERT OR REPLACE INTO blackboard_state (id, blackboard_id, key, value, updated_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
''', (state_id, blackboard_id, key, value, agent_id, datetime.now().isoformat()))
conn.commit()
conn.close()
`;

    const result = runPythonQuery(query, [
      dbPath,
      blackboardId,
      key,
      value,
      agentId,
    ]);

    if (!result.success) {
      console.error("[blackboard] PostToolUse Python error:", result.stderr);
      return { result: "continue" };
    }

    // Log for debugging
    console.error(`[blackboard] Recorded write to key '${key}' by ${agentId}`);

    return { result: "continue" };
  } catch (err) {
    console.error("[blackboard] PostToolUse hook error:", err);
    return { result: "continue" };
  }
}

// =============================================================================
// onStop Handler
// =============================================================================

/**
 * Handles Stop hook for blackboard pattern.
 * Notifies controller to approve final blackboard state.
 */
export async function onStop(input: StopInput): Promise<HookOutput> {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }

  const blackboardId = process.env.BLACKBOARD_ID;

  if (!blackboardId) {
    return { result: "continue" };
  }

  // Validate BLACKBOARD_ID format
  if (!isValidId(blackboardId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "specialist";

  // Only controller gets approval notification
  if (role !== "controller") {
    return { result: "continue" };
  }

  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Fetch final blackboard state
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
blackboard_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Fetch all non-internal state keys
cursor = conn.execute('''
    SELECT key, value, updated_by
    FROM blackboard_state
    WHERE blackboard_id = ? AND key NOT LIKE '_completed_%'
    ORDER BY created_at
''', (blackboard_id,))

state = []
for row in cursor.fetchall():
    state.append({
        'key': row[0],
        'value': row[1],
        'updated_by': row[2]
    })

conn.close()
print(json.dumps(state))
`;

    const result = runPythonQuery(query, [dbPath, blackboardId]);

    if (!result.success) {
      return { result: "continue" };
    }

    // Parse Python output
    let state: Array<{ key: string; value: string; updated_by: string }>;
    try {
      state = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    // Build approval notification
    let message = "BLACKBOARD PATTERN COMPLETION:\n\n";
    message += "All specialists have completed their contributions.\n";
    message +=
      "Review the final blackboard state below and determine if the solution is complete and coherent.\n\n";

    if (state.length === 0) {
      message += "(No state contributed yet)\n";
    } else {
      message += "FINAL STATE:\n";
      for (const item of state) {
        message += `\n${item.key}: ${item.value}`;
        message += `\n  (contributed by: ${item.updated_by})\n`;
      }
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
