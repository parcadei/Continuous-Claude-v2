/**
 * Unified Chain of Responsibility Pattern Handlers
 *
 * Implements chain of responsibility coordination logic:
 * - onSubagentStart: Inject handler position context
 * - onSubagentStop: Track handling/escalation decisions
 * - onPreToolUse: Inject chain context
 * - onStop: Chain resolution summary
 *
 * Environment Variables:
 * - COR_ID: Chain of Responsibility identifier (required)
 * - PATTERN_ID: Pattern execution ID (same as COR_ID)
 * - HANDLER_PRIORITY: Priority/position of this handler (0 = highest priority)
 * - CHAIN_LENGTH: Total number of handlers in chain
 * - COR_ESCALATE: Set to "true" to escalate to next handler
 * - AGENT_ROLE: Always "handler"
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */
import { existsSync } from "fs";
// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
// =============================================================================
// onSubagentStart Handler
// =============================================================================
/**
 * Handles SubagentStart hook for chain of responsibility pattern.
 * Injects handler position and chain context message.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(input) {
  const corId = process.env.COR_ID;
  // If no COR_ID, continue silently (not in a chain)
  if (!corId) {
    return { result: "continue" };
  }
  // Validate COR_ID format
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const handlerPriority = process.env.HANDLER_PRIORITY || "0";
  const chainLength = process.env.CHAIN_LENGTH || "1";
  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[chain-of-responsibility] Handler ${handlerPriority} starting for chain ${corId}`,
  );
  // Inject chain context message
  let message = `You are Handler at priority ${handlerPriority} in a chain of ${chainLength} handlers.`;
  message +=
    " Your task is to determine if you can handle this request using your can_handle predicate.";
  message +=
    " If you can handle it, process the request and return the result.";
  message +=
    " If you cannot handle it, the request will escalate to the next handler in the chain.";
  return {
    result: "continue",
    message,
  };
}
// =============================================================================
// onSubagentStop Handler
// =============================================================================
/**
 * Handles SubagentStop hook for chain of responsibility pattern.
 * Marks handler as completed and records whether it handled or escalated.
 * Checks COR_ESCALATE environment variable to determine escalation.
 */
export async function onSubagentStop(input) {
  const corId = process.env.COR_ID;
  // If no COR_ID, continue silently
  if (!corId) {
    return { result: "continue" };
  }
  // Validate COR_ID format
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const handlerId = input.agent_id ?? "unknown";
  // Validate agent_id format
  if (!isValidId(handlerId)) {
    return { result: "continue" };
  }
  const handlerPriority = parseInt(process.env.HANDLER_PRIORITY || "0", 10);
  const escalate = process.env.COR_ESCALATE === "true";
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Record handler completion with escalation status
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cor_id = sys.argv[2]
handler_id = sys.argv[3]
priority = int(sys.argv[4])
escalate = sys.argv[5] == 'true'

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS cor_handlers (
        id TEXT PRIMARY KEY,
        cor_id TEXT NOT NULL,
        priority INTEGER NOT NULL,
        agent_id TEXT,
        handled BOOLEAN DEFAULT 0,
        escalated BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_cor_handlers
        ON cor_handlers(cor_id, priority)
''')

# Insert or update handler completion
handler_record_id = f"{cor_id}_{priority}"
handled = 0 if escalate else 1
escalated = 1 if escalate else 0

conn.execute('''
    INSERT OR REPLACE INTO cor_handlers
    (id, cor_id, priority, agent_id, handled, escalated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
''', (handler_record_id, cor_id, priority, handler_id, handled, escalated, datetime.now().isoformat()))
conn.commit()

conn.close()
print(json.dumps({'success': True, 'handled': handled, 'escalated': escalated}))
`;
    const result = runPythonQuery(query, [
      dbPath,
      corId,
      handlerId,
      handlerPriority.toString(),
      escalate ? "true" : "false",
    ]);
    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }
    // Log for debugging
    const action = escalate ? "escalated" : "handled";
    console.error(
      `[chain-of-responsibility] Handler ${handlerPriority} ${action} request`,
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
 * Handles PreToolUse hook for chain of responsibility pattern.
 * Injects chain context showing handler position.
 * Always returns 'continue' - no blocking.
 */
export async function onPreToolUse(input) {
  const corId = process.env.COR_ID;
  // If no COR_ID, continue silently
  if (!corId) {
    return { result: "continue" };
  }
  // Validate COR_ID format
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const handlerPriority = process.env.HANDLER_PRIORITY || "0";
  const chainLength = process.env.CHAIN_LENGTH || "1";
  // Inject reminder about chain position (optional, only on first few tools)
  // This helps the handler understand its role in the chain
  // For now, just continue - we could add context injection here if needed
  return { result: "continue" };
}
// =============================================================================
// onPostToolUse Handler
// =============================================================================
/**
 * Handles PostToolUse hook for chain of responsibility pattern.
 * Records handler resolution or escalation based on tool response and env vars.
 *
 * Resolution triggers:
 * - Task tool completes with status: "success"
 * - COR_RESOLVED env var is set to "true"
 *
 * Escalation triggers:
 * - Task tool response has status: "escalate"
 * - COR_ESCALATE env var is set to "true"
 *
 * Non-resolution tools (Read, Grep, etc.) do not trigger recording.
 */
export async function onPostToolUse(input) {
  const corId = process.env.COR_ID;
  // If no COR_ID, continue silently (not in a chain)
  if (!corId) {
    return { result: "continue" };
  }
  // Validate COR_ID format
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const handlerPriority = parseInt(process.env.HANDLER_PRIORITY || "0", 10);
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  // Check for explicit env var signals
  const corResolved = process.env.COR_RESOLVED === "true";
  const corEscalate = process.env.COR_ESCALATE === "true";
  // Parse tool response (may be string or object)
  let toolResponse = {};
  if (input.tool_response && typeof input.tool_response === "object") {
    toolResponse = input.tool_response;
  }
  const toolName = input.tool_name || "";
  const responseStatus =
    typeof toolResponse.status === "string" ? toolResponse.status : "";
  const escalationReason =
    typeof toolResponse.reason === "string" ? toolResponse.reason : "";
  // Determine if this is a resolution or escalation
  // Non-resolution tools (Read, Grep, Glob, etc.) should not trigger recording
  const resolutionTools = ["Task", "Write", "Edit", "Bash"];
  const isResolutionTool = resolutionTools.includes(toolName);
  // Escalation: explicit env var or response status
  const isEscalation = corEscalate || responseStatus === "escalate";
  // Resolution: explicit env var or Task success
  const isResolution =
    corResolved || (toolName === "Task" && responseStatus === "success");
  // Skip if not a resolution tool and no explicit signals
  if (!isResolutionTool && !corResolved && !corEscalate) {
    return { result: "continue" };
  }
  // Skip if neither resolution nor escalation
  if (!isResolution && !isEscalation) {
    return { result: "continue" };
  }
  try {
    // Record resolution or escalation
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
cor_id = sys.argv[2]
priority = int(sys.argv[3])
is_resolution = sys.argv[4] == 'true'
is_escalation = sys.argv[5] == 'true'
tool_name = sys.argv[6]
escalation_reason = sys.argv[7] if len(sys.argv) > 7 else ''

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists (with new columns)
conn.execute('''
    CREATE TABLE IF NOT EXISTS cor_handlers (
        id TEXT PRIMARY KEY,
        cor_id TEXT NOT NULL,
        priority INTEGER NOT NULL,
        agent_id TEXT,
        handled BOOLEAN DEFAULT 0,
        escalated BOOLEAN DEFAULT 0,
        resolution_tool TEXT,
        escalation_reason TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_cor_handlers
        ON cor_handlers(cor_id, priority)
''')

# Add columns if they don't exist (for backwards compatibility)
try:
    conn.execute('ALTER TABLE cor_handlers ADD COLUMN resolution_tool TEXT')
except:
    pass
try:
    conn.execute('ALTER TABLE cor_handlers ADD COLUMN escalation_reason TEXT')
except:
    pass

# Insert or update handler record
handler_record_id = f"{cor_id}_{priority}"
handled = 1 if is_resolution else 0
escalated = 1 if is_escalation else 0
resolution_tool = tool_name if is_resolution else None
esc_reason = escalation_reason if is_escalation and escalation_reason else None

conn.execute('''
    INSERT OR REPLACE INTO cor_handlers
    (id, cor_id, priority, agent_id, handled, escalated, resolution_tool, escalation_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (handler_record_id, cor_id, priority, None, handled, escalated, resolution_tool, esc_reason, datetime.now().isoformat()))
conn.commit()

conn.close()
print(json.dumps({'success': True, 'handled': handled, 'escalated': escalated}))
`;
    const result = runPythonQuery(query, [
      dbPath,
      corId,
      handlerPriority.toString(),
      isResolution ? "true" : "false",
      isEscalation ? "true" : "false",
      toolName,
      escalationReason,
    ]);
    if (!result.success) {
      console.error("PostToolUse Python error:", result.stderr);
      return { result: "continue" };
    }
    // Log for debugging
    const action = isResolution
      ? "resolved"
      : isEscalation
        ? "escalated"
        : "processed";
    console.error(
      `[chain-of-responsibility] Handler ${handlerPriority} ${action} via ${toolName}`,
    );
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
 * Handles Stop hook for chain of responsibility pattern.
 * Provides chain resolution summary showing which handler resolved the request.
 * Lists all handlers and their escalation decisions.
 */
export async function onStop(input) {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const corId = process.env.COR_ID;
  if (!corId) {
    return { result: "continue" };
  }
  // Validate COR_ID format
  if (!isValidId(corId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Query chain resolution history
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
cor_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get all handlers for this chain
cursor = conn.execute('''
    SELECT priority, agent_id, handled, escalated
    FROM cor_handlers
    WHERE cor_id = ?
    ORDER BY priority
''', (cor_id,))

handlers = []
for row in cursor.fetchall():
    handlers.append({
        'priority': row[0],
        'agent_id': row[1],
        'handled': row[2],
        'escalated': row[3]
    })

conn.close()
print(json.dumps({'handlers': handlers}))
`;
    const result = runPythonQuery(query, [dbPath, corId]);
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
    if (data.handlers.length === 0) {
      return { result: "continue" };
    }
    // Build chain resolution summary
    let message = "CHAIN OF RESPONSIBILITY RESOLUTION:\n\n";
    let resolvedBy = null;
    for (const handler of data.handlers) {
      const action = handler.handled
        ? "HANDLED"
        : handler.escalated
          ? "ESCALATED"
          : "PENDING";
      message += `- Handler ${handler.priority}: ${action}`;
      if (handler.agent_id && handler.agent_id !== "unknown") {
        message += ` (${handler.agent_id})`;
      }
      message += "\n";
      if (handler.handled) {
        resolvedBy = handler.priority;
      }
    }
    if (resolvedBy !== null) {
      message += `\nRequest was successfully handled by Handler ${resolvedBy}.`;
    } else {
      message += "\nNo handler has processed the request yet.";
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
