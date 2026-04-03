/**
 * Unified MapReduce Pattern Handlers
 *
 * Implements map-reduce coordination logic:
 * - onSubagentStart: Inject mapper index and chunk context
 * - onSubagentStop: Track mapper completion, trigger reducer
 * - onPreToolUse: Inject chunk context (optional)
 * - onStop: Block reducer until all mappers complete, then provide results
 *
 * Environment Variables:
 * - MR_ID: MapReduce identifier (required for map-reduce operations)
 * - AGENT_ROLE: Role of this agent ('mapper' or 'reducer')
 * - MAPPER_INDEX: Index of this mapper (0-indexed, for mappers only)
 * - TOTAL_MAPPERS: Total number of mappers in this execution
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
 * Handles SubagentStart hook for map-reduce pattern.
 * Injects mapper index context or reducer context.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(
  input: SubagentStartInput,
): Promise<HookOutput> {
  const mrId = process.env.MR_ID;

  // If no MR_ID, continue silently (not in a map-reduce)
  if (!mrId) {
    return { result: "continue" };
  }

  // Validate MR_ID format
  if (!isValidId(mrId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE || "mapper";
  const mapperIndex = process.env.MAPPER_INDEX || "0";
  const totalMappers = process.env.TOTAL_MAPPERS || "1";

  // Log for debugging - this goes to stderr, not stdout
  console.error(`[map-reduce] ${agentRole} starting for MR ${mrId}`);

  // Inject context based on role
  let message = "";
  if (agentRole === "mapper") {
    message = `You are Mapper ${mapperIndex} (position ${parseInt(mapperIndex) + 1} of ${totalMappers}) in a MapReduce execution.`;
    message += " Process your assigned chunk and return results.";
    message +=
      " Your output will be combined with other mappers by the reducer.";
  } else if (agentRole === "reducer") {
    message = `You are the Reducer in a MapReduce execution with ${totalMappers} mappers.`;
    message += " Synthesize the outputs from all mappers into a final result.";
  }

  return {
    result: "continue",
    message: message || undefined,
  };
}

// =============================================================================
// onSubagentStop Handler
// =============================================================================

/**
 * Handles SubagentStop hook for map-reduce pattern.
 * Marks mapper as completed in database.
 * Triggers reducer when all mappers complete.
 */
export async function onSubagentStop(
  input: SubagentStopInput,
): Promise<HookOutput> {
  const mrId = process.env.MR_ID;

  // If no MR_ID, continue silently
  if (!mrId) {
    return { result: "continue" };
  }

  // Validate MR_ID format
  if (!isValidId(mrId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE || "mapper";

  // Only track mapper completion (reducers don't need tracking)
  if (agentRole !== "mapper") {
    return { result: "continue" };
  }

  const mapperId = input.agent_id ?? "unknown";

  // Validate agent_id format
  if (!isValidId(mapperId)) {
    return { result: "continue" };
  }

  const mapperIndex = parseInt(process.env.MAPPER_INDEX || "0", 10);
  const totalMappers = parseInt(process.env.TOTAL_MAPPERS || "1", 10);
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Mark mapper as completed and check if all are done
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
mr_id = sys.argv[2]
mapper_id = sys.argv[3]
mapper_index = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS mr_mappers (
        id TEXT PRIMARY KEY,
        mr_id TEXT NOT NULL,
        mapper_index INTEGER NOT NULL,
        agent_id TEXT,
        status TEXT DEFAULT 'pending',
        output TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_mr_mappers
        ON mr_mappers(mr_id, status)
''')

# Insert or update mapper completion
record_id = f"{mr_id}_{mapper_index}"
conn.execute('''
    INSERT OR REPLACE INTO mr_mappers (id, mr_id, mapper_index, agent_id, status, output, created_at)
    VALUES (?, ?, ?, ?, 'completed', NULL, ?)
''', (record_id, mr_id, mapper_index, mapper_id, datetime.now().isoformat()))
conn.commit()

# Count completed mappers
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM mr_mappers
    WHERE mr_id = ? AND status = 'completed'
''', (mr_id,))
completed_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'completed': completed_count}))
`;

    const result = runPythonQuery(query, [
      dbPath,
      mrId,
      mapperId,
      mapperIndex.toString(),
    ]);

    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }

    // Parse Python output
    let counts: { completed: number };
    try {
      counts = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    // Log for debugging
    console.error(
      `[map-reduce] Mapper ${mapperId} done. Progress: ${counts.completed}/${totalMappers}`,
    );

    // Check if all mappers have completed
    if (counts.completed >= totalMappers && totalMappers > 0) {
      return {
        result: "continue",
        message: "All mappers have completed. Proceeding to reduce phase.",
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
 * Handles PreToolUse hook for map-reduce pattern.
 * Currently no special handling needed (chunk context injected at start).
 */
export async function onPreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  // No special handling needed for map-reduce pattern
  // Chunk context is provided in the mapper's initial prompt
  return { result: "continue" };
}

// =============================================================================
// onPostToolUse Handler
// =============================================================================

/**
 * Handles PostToolUse hook for map-reduce pattern.
 * Records mapper outputs when Write tool completes.
 * Signals reducer when all mappers have written their outputs.
 */
export async function onPostToolUse(
  input: PostToolUseInput,
): Promise<HookOutput> {
  const mrId = process.env.MR_ID;

  // If no MR_ID, continue silently (not in a map-reduce)
  if (!mrId) {
    return { result: "continue" };
  }

  // Validate MR_ID format
  if (!isValidId(mrId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE || "mapper";

  // Only track mapper outputs (not reducer)
  if (agentRole !== "mapper") {
    return { result: "continue" };
  }

  // Only process Write tool completions
  if (input.tool_name !== "Write") {
    return { result: "continue" };
  }

  // Validate tool_input is an object with content
  if (!input.tool_input || typeof input.tool_input !== "object") {
    return { result: "continue" };
  }

  const toolInput = input.tool_input as {
    content?: string;
    file_path?: string;
  };
  const outputContent = toolInput.content;

  // No content to record
  if (!outputContent || typeof outputContent !== "string") {
    return { result: "continue" };
  }

  const mapperIndex = parseInt(process.env.MAPPER_INDEX || "0", 10);
  const totalMappers = parseInt(process.env.TOTAL_MAPPERS || "1", 10);
  const agentId = process.env.AGENT_ID || "unknown";
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Record mapper output and check completion status
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
mr_id = sys.argv[2]
mapper_index = int(sys.argv[3])
agent_id = sys.argv[4]
output_content = sys.argv[5]
total_mappers = int(sys.argv[6])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS mr_mappers (
        id TEXT PRIMARY KEY,
        mr_id TEXT NOT NULL,
        mapper_index INTEGER NOT NULL,
        agent_id TEXT,
        status TEXT DEFAULT 'pending',
        output TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_mr_mappers
        ON mr_mappers(mr_id, status)
''')

# Insert or update mapper output
record_id = f"{mr_id}_{mapper_index}"
conn.execute('''
    INSERT OR REPLACE INTO mr_mappers (id, mr_id, mapper_index, agent_id, status, output, created_at)
    VALUES (?, ?, ?, ?, 'completed', ?, ?)
''', (record_id, mr_id, mapper_index, agent_id, output_content, datetime.now().isoformat()))
conn.commit()

# Count completed mappers (those with output)
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM mr_mappers
    WHERE mr_id = ? AND status = 'completed' AND output IS NOT NULL
''', (mr_id,))
completed_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'completed': completed_count, 'total': total_mappers}))
`;

    const result = runPythonQuery(query, [
      dbPath,
      mrId,
      mapperIndex.toString(),
      agentId,
      outputContent,
      totalMappers.toString(),
    ]);

    if (!result.success) {
      console.error("PostToolUse Python error:", result.stderr);
      return { result: "continue" };
    }

    // Parse Python output
    let counts: { completed: number; total: number };
    try {
      counts = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    // Log for debugging
    console.error(
      `[map-reduce] Mapper ${mapperIndex} output recorded. Progress: ${counts.completed}/${counts.total}`,
    );

    // Check if all mappers have completed with output
    if (counts.completed >= counts.total && counts.total > 0) {
      return {
        result: "continue",
        message:
          "All mappers have completed their outputs. Proceeding to reduce phase.",
      };
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
 * Handles Stop hook for map-reduce pattern.
 * Blocks reducer until all mappers have completed.
 * Returns mapper results summary when all are done.
 */
export async function onStop(input: StopInput): Promise<HookOutput> {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }

  const mrId = process.env.MR_ID;

  if (!mrId) {
    return { result: "continue" };
  }

  // Validate MR_ID format
  if (!isValidId(mrId)) {
    return { result: "continue" };
  }

  const agentRole = process.env.AGENT_ROLE || "mapper";

  // Only apply to reducer (mappers can complete independently)
  if (agentRole !== "reducer") {
    return { result: "continue" };
  }

  const totalMappers = parseInt(process.env.TOTAL_MAPPERS || "0", 10);
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
mr_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count completed mappers
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM mr_mappers
    WHERE mr_id = ? AND status = 'completed'
''', (mr_id,))
completed_count = cursor.fetchone()[0]

# Get mapper results if all completed
results = []
if completed_count > 0:
    cursor = conn.execute('''
        SELECT mapper_index, agent_id, output
        FROM mr_mappers
        WHERE mr_id = ? AND status = 'completed'
        ORDER BY mapper_index
    ''', (mr_id,))
    for row in cursor.fetchall():
        results.append({
            'index': row[0],
            'agent_id': row[1],
            'output': row[2]
        })

conn.close()
print(json.dumps({'completed': completed_count, 'results': results}))
`;

    const result = runPythonQuery(query, [dbPath, mrId]);

    if (!result.success) {
      return { result: "continue" };
    }

    // Parse Python output
    let data: {
      completed: number;
      results: Array<{
        index: number;
        agent_id: string;
        output: string | null;
      }>;
    };
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    if (data.completed < totalMappers) {
      const waiting = totalMappers - data.completed;
      return {
        result: "block",
        message: `Waiting for ${waiting} mapper(s) to complete. All mappers must finish before the reduce phase can begin.`,
      };
    }

    // All mappers have completed - provide results summary
    let message = `All ${totalMappers} mappers have completed their work.\n\n`;
    message += "MAPPER RESULTS:\n";
    for (const r of data.results) {
      const output = r.output ? r.output.substring(0, 100) : "(no output)";
      message += `- Mapper ${r.index}: ${output}${r.output && r.output.length > 100 ? "..." : ""}\n`;
    }
    message += "\nProceed with the reduce phase to synthesize these results.";

    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
