/**
 * Unified Swarm Pattern Handlers
 *
 * Consolidates swarm coordination logic from:
 * - subagent-start-swarm.ts -> onSubagentStart
 * - subagent-stop-swarm.ts -> onSubagentStop
 * - pre-tool-use-broadcast.ts -> onPreToolUse
 * - post-task-complete.ts -> onPostToolUse
 * - stop-swarm-coordinator.ts -> onStop
 *
 * Environment Variables:
 * - SWARM_ID: Swarm identifier (required for swarm operations)
 * - AGENT_ID: Current agent identifier (for PreToolUse)
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */
import { existsSync } from "fs";
// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
// =============================================================================
// onSubagentStart Handler
// =============================================================================
/**
 * Handles SubagentStart hook for swarm pattern.
 * Logs agent joining swarm to stderr.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(input) {
  const swarmId = process.env.SWARM_ID;
  // If no SWARM_ID, continue silently (not in a swarm)
  if (!swarmId) {
    return { result: "continue" };
  }
  // Validate SWARM_ID format
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const agentId = input.agent_id ?? "unknown";
  const agentType = input.agent_type ?? "unknown";
  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[subagent-start] Agent ${agentId} (type: ${agentType}) joining swarm ${swarmId}`,
  );
  // Always return continue - SubagentStart should never block
  return { result: "continue" };
}
// =============================================================================
// onSubagentStop Handler
// =============================================================================
/**
 * Handles SubagentStop hook for swarm pattern.
 * Broadcasts 'done' message with auto flag.
 * Injects synthesis message when all agents complete.
 */
export async function onSubagentStop(input) {
  const swarmId = process.env.SWARM_ID;
  // If no SWARM_ID, continue silently
  if (!swarmId) {
    return { result: "continue" };
  }
  // Validate SWARM_ID format
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const agentId = input.agent_id ?? "unknown";
  // Validate agent_id format
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Auto-broadcast "done" message and check if all agents complete
    const query = `
import sqlite3
import json
import sys
from datetime import datetime
from uuid import uuid4

db_path = sys.argv[1]
swarm_id = sys.argv[2]
agent_id = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Insert done broadcast with auto flag
broadcast_id = uuid4().hex[:12]
conn.execute('''
    INSERT INTO broadcasts (id, swarm_id, sender_agent, broadcast_type, payload, created_at)
    VALUES (?, ?, ?, 'done', '{"auto": true}', ?)
''', (broadcast_id, swarm_id, agent_id, datetime.now().isoformat()))
conn.commit()

# Count agents that have broadcast "done" - distinct sender_agent
cursor = conn.execute('''
    SELECT COUNT(DISTINCT sender_agent) as done_count
    FROM broadcasts
    WHERE swarm_id = ? AND broadcast_type = 'done'
''', (swarm_id,))
done_count = cursor.fetchone()[0]

# Count total agents - any agent that has ever broadcast anything in this swarm
cursor = conn.execute('''
    SELECT COUNT(DISTINCT sender_agent) as total_count
    FROM broadcasts
    WHERE swarm_id = ?
''', (swarm_id,))
total_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'done': done_count, 'total': total_count}))
`;
    const result = runPythonQuery(query, [dbPath, swarmId, agentId]);
    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }
    // Parse Python output
    let counts;
    try {
      counts = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    // Log for debugging
    console.error(
      `[subagent-stop] Agent ${agentId} done. Progress: ${counts.done}/${counts.total}`,
    );
    // Check if all agents have completed
    if (counts.done >= counts.total && counts.total > 0) {
      return {
        result: "continue",
        message:
          "All agents complete. Consider synthesizing findings into final report.",
      };
    }
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
 * Handles PreToolUse hook for swarm pattern.
 * Injects broadcasts from other agents into context.
 * Excludes current agent's own broadcasts.
 */
export async function onPreToolUse(input) {
  const swarmId = process.env.SWARM_ID;
  // If no SWARM_ID, continue silently
  if (!swarmId) {
    return { result: "continue" };
  }
  // Validate SWARM_ID format
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const agentId = process.env.AGENT_ID || "unknown";
  // Validate AGENT_ID format if provided
  if (agentId !== "unknown" && !isValidId(agentId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Query broadcasts from other agents
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
swarm_id = sys.argv[2]
agent_id = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")
conn.row_factory = sqlite3.Row
cursor = conn.execute('''
    SELECT sender_agent, broadcast_type, payload, created_at
    FROM broadcasts
    WHERE swarm_id = ? AND sender_agent != ?
    ORDER BY created_at DESC
    LIMIT 10
''', (swarm_id, agent_id))

broadcasts = []
for row in cursor.fetchall():
    broadcasts.append({
        'sender': row['sender_agent'],
        'type': row['broadcast_type'],
        'payload': json.loads(row['payload']),
        'time': row['created_at']
    })

print(json.dumps(broadcasts))
`;
    const result = runPythonQuery(query, [dbPath, swarmId, agentId]);
    if (!result.success) {
      return { result: "continue" };
    }
    const broadcasts = JSON.parse(result.stdout || "[]");
    if (broadcasts.length > 0) {
      let contextMessage = "\n--- SWARM BROADCASTS ---\n";
      for (const b of broadcasts) {
        contextMessage += `[${b.type.toUpperCase()}] from ${b.sender}:\n`;
        contextMessage += `  ${JSON.stringify(b.payload)}\n`;
      }
      contextMessage += "------------------------\n";
      return {
        result: "continue",
        message: contextMessage,
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Broadcast query error:", err);
    return { result: "continue" };
  }
}
// =============================================================================
// onPostToolUse Handler
// =============================================================================
/**
 * Handles PostToolUse hook for swarm pattern.
 * Records 'started' broadcast when Task tool spawns a new agent.
 * Ignores non-Task tools.
 */
export async function onPostToolUse(input) {
  // Only track Task tool completions
  if (input.tool_name !== "Task") {
    return { result: "continue" };
  }
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    return { result: "continue" };
  }
  // Validate SWARM_ID format
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Extract agent_id from tool_response
    const response = input.tool_response;
    let agentId = "unknown";
    if (response && typeof response === "object" && "agent_id" in response) {
      const rawAgentId = response.agent_id;
      // Security: Validate extracted agentId before use (defense-in-depth)
      if (
        typeof rawAgentId === "string" &&
        rawAgentId.length > 0 &&
        isValidId(rawAgentId)
      ) {
        agentId = rawAgentId;
      }
    }
    // Record a "started" broadcast to track which agents are in the swarm
    const insert = `
import sqlite3
import json
import sys
from datetime import datetime
from uuid import uuid4

db_path = sys.argv[1]
swarm_id = sys.argv[2]
agent_id = sys.argv[3]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Insert "started" broadcast to track this agent in the swarm
broadcast_id = uuid4().hex[:12]
payload = json.dumps({"type": "task_spawned"})
conn.execute('''
    INSERT INTO broadcasts (id, swarm_id, sender_agent, broadcast_type, payload, created_at)
    VALUES (?, ?, ?, 'started', ?, ?)
''', (broadcast_id, swarm_id, agent_id, payload, datetime.now().isoformat()))
conn.commit()
conn.close()
`;
    const result = runPythonQuery(insert, [dbPath, swarmId, agentId]);
    if (!result.success) {
      console.error("Task completion tracking error:", result.stderr);
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Task completion tracking error:", err);
    return { result: "continue" };
  }
}
// =============================================================================
// onStop Handler
// =============================================================================
/**
 * Handles Stop hook for swarm pattern.
 * Blocks coordinator until all agents have completed.
 * Returns 'continue' when all done or when stop_hook_active (prevents loops).
 */
export async function onStop(input) {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    return { result: "continue" };
  }
  // Validate SWARM_ID format
  if (!isValidId(swarmId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Query completion status
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
swarm_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count agents that have broadcast "done" - these have completed their work
cursor = conn.execute('''
    SELECT COUNT(DISTINCT sender_agent) as done_count
    FROM broadcasts
    WHERE swarm_id = ? AND broadcast_type = 'done'
''', (swarm_id,))
done_count = cursor.fetchone()[0]

# Count total agents - any agent that has ever broadcast anything in this swarm
cursor = conn.execute('''
    SELECT COUNT(DISTINCT sender_agent) as total_count
    FROM broadcasts
    WHERE swarm_id = ?
''', (swarm_id,))
total_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'done': done_count, 'total': total_count}))
`;
    const result = runPythonQuery(query, [dbPath, swarmId]);
    if (!result.success) {
      return { result: "continue" };
    }
    // Parse Python output
    let counts;
    try {
      counts = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (counts.done < counts.total) {
      const waiting = counts.total - counts.done;
      return {
        result: "block",
        message: `Waiting for ${waiting} agent(s) to complete. Synthesize results when all agents broadcast 'done'.`,
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
