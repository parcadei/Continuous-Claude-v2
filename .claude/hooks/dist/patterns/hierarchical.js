/**
 * Unified Hierarchical Pattern Handlers
 *
 * Implements hierarchical coordination logic for coordinator-specialist relationships:
 * - onSubagentStart: Inject subtask context for specialists
 * - onSubagentStop: Notify coordinator of specialist completion
 * - onPreToolUse: Scope broadcasts to hierarchy level
 * - onPostToolUse: Track specialist spawns when coordinator uses Task tool
 * - onStop: Synthesis verification (block until all specialists complete)
 *
 * Environment Variables:
 * - HIERARCHY_ID: Hierarchy identifier (required for hierarchy operations)
 * - AGENT_ROLE: Role in hierarchy ('coordinator' or 'specialist')
 * - COORDINATOR_ID: ID of coordinator (for specialists)
 * - AGENT_ID: ID of the current agent
 * - HIERARCHY_LEVEL: Level in hierarchy (0 = coordinator, 1+ = specialist)
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */
import { existsSync } from "fs";
// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
// =============================================================================
// onSubagentStart Handler
// =============================================================================
/**
 * Handles SubagentStart hook for hierarchical pattern.
 * Injects role-specific context message.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(input) {
  const hierarchyId = process.env.HIERARCHY_ID;
  // If no HIERARCHY_ID, continue silently (not in a hierarchy)
  if (!hierarchyId) {
    return { result: "continue" };
  }
  // Validate HIERARCHY_ID format
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE || "specialist";
  const hierarchyLevel = process.env.HIERARCHY_LEVEL || "1";
  const coordinatorId = process.env.COORDINATOR_ID;
  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[hierarchical] Starting ${agentRole} at level ${hierarchyLevel} for hierarchy ${hierarchyId}`,
  );
  // Inject role-specific context message
  let message = "";
  if (agentRole === "coordinator") {
    message = `You are the coordinator in a hierarchical pattern. `;
    message +=
      "Your role is to decompose complex tasks into subtasks for specialist agents. ";
    message +=
      "Delegate to specialists, then synthesize their results into a comprehensive answer.";
  } else {
    // Specialist
    message = `You are a specialist in a hierarchical pattern (level ${hierarchyLevel}). `;
    message += "Focus on executing your assigned subtask thoroughly. ";
    message += "Your results will be aggregated by the coordinator.";
    if (coordinatorId) {
      message += ` Report to coordinator: ${coordinatorId}`;
    }
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
 * Handles SubagentStop hook for hierarchical pattern.
 * Marks specialist as completed in database.
 * Notifies when specialists complete.
 */
export async function onSubagentStop(input) {
  const hierarchyId = process.env.HIERARCHY_ID;
  // If no HIERARCHY_ID, continue silently
  if (!hierarchyId) {
    return { result: "continue" };
  }
  // Validate HIERARCHY_ID format
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  const agentId = input.agent_id ?? "unknown";
  // Validate agent_id format
  if (!isValidId(agentId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE || "specialist";
  const coordinatorId = process.env.COORDINATOR_ID;
  const hierarchyLevel = parseInt(process.env.HIERARCHY_LEVEL || "1", 10);
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  // Only track specialist completion (coordinators don't need tracking here)
  if (agentRole !== "specialist") {
    return { result: "continue" };
  }
  try {
    // Mark specialist as completed
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
hierarchy_id = sys.argv[2]
agent_id = sys.argv[3]
coordinator_id = sys.argv[4]
level = int(sys.argv[5])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS hierarchy_agents (
        id TEXT PRIMARY KEY,
        hierarchy_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        coordinator_id TEXT,
        level INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_hierarchy_agents
        ON hierarchy_agents(hierarchy_id, status)
''')

# Update or insert specialist status
specialist_id = f"{hierarchy_id}_{agent_id}"
conn.execute('''
    INSERT OR REPLACE INTO hierarchy_agents
        (id, hierarchy_id, agent_id, role, coordinator_id, level, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
''', (specialist_id, hierarchy_id, agent_id, 'specialist', coordinator_id, level, 'completed'))
conn.commit()

# Count completed specialists for this hierarchy
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM hierarchy_agents
    WHERE hierarchy_id = ? AND role = 'specialist' AND status = 'completed'
''', (hierarchy_id,))
completed_count = cursor.fetchone()[0]

# Count total specialists for this hierarchy
cursor = conn.execute('''
    SELECT COUNT(*) as total_count
    FROM hierarchy_agents
    WHERE hierarchy_id = ? AND role = 'specialist'
''', (hierarchy_id,))
total_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'completed': completed_count, 'total': total_count}))
`;
    const result = runPythonQuery(query, [
      dbPath,
      hierarchyId,
      agentId,
      coordinatorId || "",
      hierarchyLevel.toString(),
    ]);
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
      `[hierarchical] Specialist ${agentId} done. Progress: ${counts.completed}/${counts.total}`,
    );
    // Notify about progress
    if (counts.completed >= counts.total && counts.total > 0) {
      return {
        result: "continue",
        message: `All ${counts.total} specialists have completed their subtasks. Ready for synthesis.`,
      };
    } else {
      const remaining = counts.total - counts.completed;
      return {
        result: "continue",
        message: `Specialist completed. Waiting for ${remaining} more specialist(s) to finish.`,
      };
    }
  } catch (err) {
    console.error("SubagentStop hook error:", err);
    return { result: "continue" };
  }
}
// =============================================================================
// onPreToolUse Handler
// =============================================================================
/**
 * Handles PreToolUse hook for hierarchical pattern.
 * Scopes broadcasts to hierarchy level (if applicable).
 * Currently allows all tools - can be extended for broadcast scoping.
 */
export async function onPreToolUse(input) {
  const hierarchyId = process.env.HIERARCHY_ID;
  // If no HIERARCHY_ID, continue silently
  if (!hierarchyId) {
    return { result: "continue" };
  }
  // Validate HIERARCHY_ID format
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  // For hierarchical pattern, we don't block tools currently
  // This could be extended to scope Task broadcasts to same hierarchy level
  // For now, just continue
  return { result: "continue" };
}
// =============================================================================
// onPostToolUse Handler
// =============================================================================
/**
 * Handles PostToolUse hook for hierarchical pattern.
 * Tracks specialist spawns when coordinator uses Task tool.
 * Records spawned agents in hierarchy_agents table for tracking.
 */
export async function onPostToolUse(input) {
  const hierarchyId = process.env.HIERARCHY_ID;
  const agentRole = process.env.AGENT_ROLE;
  const coordinatorId = process.env.AGENT_ID || process.env.COORDINATOR_ID;
  const hierarchyLevel = parseInt(process.env.HIERARCHY_LEVEL || "0", 10);
  // Only track Task tool usage by coordinators
  if (
    !hierarchyId ||
    agentRole !== "coordinator" ||
    input.tool_name !== "Task"
  ) {
    return { result: "continue" };
  }
  // Validate hierarchy ID
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  // Extract spawned agent ID from tool response
  const response = input.tool_response;
  const spawnedAgentId = response?.agent_id ?? response?.task_id;
  if (!spawnedAgentId || typeof spawnedAgentId !== "string") {
    return { result: "continue" };
  }
  // Validate spawned agent ID
  if (!isValidId(spawnedAgentId)) {
    return { result: "continue" };
  }
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    const query = `
import sqlite3
import sys
from datetime import datetime

db_path = sys.argv[1]
hierarchy_id = sys.argv[2]
agent_id = sys.argv[3]
coordinator_id = sys.argv[4]
level = int(sys.argv[5])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS hierarchy_agents (
        id TEXT PRIMARY KEY,
        hierarchy_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        role TEXT NOT NULL,
        coordinator_id TEXT,
        level INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_hierarchy_agents
        ON hierarchy_agents(hierarchy_id, status)
''')

# Insert specialist record (use agent_id as primary key for PostToolUse)
conn.execute('''
    INSERT OR REPLACE INTO hierarchy_agents
        (id, hierarchy_id, agent_id, role, coordinator_id, level, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
''', (agent_id, hierarchy_id, agent_id, 'specialist', coordinator_id, level, 'active'))
conn.commit()
conn.close()
print('ok')
`;
    const result = runPythonQuery(query, [
      dbPath,
      hierarchyId,
      spawnedAgentId,
      coordinatorId || "",
      (hierarchyLevel + 1).toString(), // Specialist is one level below coordinator
    ]);
    if (!result.success) {
      console.error("PostToolUse Python error:", result.stderr);
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
 * Handles Stop hook for hierarchical pattern.
 * Blocks coordinator until all specialists have completed.
 * Returns synthesis prompt when all specialists are done.
 */
export async function onStop(input) {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const hierarchyId = process.env.HIERARCHY_ID;
  if (!hierarchyId) {
    return { result: "continue" };
  }
  // Validate HIERARCHY_ID format
  if (!isValidId(hierarchyId)) {
    return { result: "continue" };
  }
  const agentRole = process.env.AGENT_ROLE || "specialist";
  // Only block coordinator (specialists can finish immediately)
  if (agentRole !== "coordinator") {
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
hierarchy_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count completed specialists
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM hierarchy_agents
    WHERE hierarchy_id = ? AND role = 'specialist' AND status = 'completed'
''', (hierarchy_id,))
completed_count = cursor.fetchone()[0]

# Count total specialists
cursor = conn.execute('''
    SELECT COUNT(*) as total_count
    FROM hierarchy_agents
    WHERE hierarchy_id = ? AND role = 'specialist'
''', (hierarchy_id,))
total_count = cursor.fetchone()[0]

# Get specialist details if all completed
specialists = []
if completed_count == total_count and total_count > 0:
    cursor = conn.execute('''
        SELECT agent_id, level
        FROM hierarchy_agents
        WHERE hierarchy_id = ? AND role = 'specialist'
        ORDER BY created_at
    ''', (hierarchy_id,))
    for row in cursor.fetchall():
        specialists.append({'agent_id': row[0], 'level': row[1]})

conn.close()
print(json.dumps({'completed': completed_count, 'total': total_count, 'specialists': specialists}))
`;
    const result = runPythonQuery(query, [dbPath, hierarchyId]);
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
    if (data.completed < data.total) {
      const waiting = data.total - data.completed;
      return {
        result: "block",
        message: `Waiting for ${waiting} specialist(s) to complete their subtasks. All specialists must finish before synthesis.`,
      };
    }
    // All specialists have completed - provide synthesis prompt
    let message = `All ${data.total} specialists have completed their subtasks.\n\n`;
    message += "SPECIALIST RESULTS:\n";
    for (const spec of data.specialists) {
      message += `- Specialist ${spec.agent_id} (level ${spec.level}): completed\n`;
    }
    message +=
      "\nSynthesize the specialist results into a comprehensive final answer.";
    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
