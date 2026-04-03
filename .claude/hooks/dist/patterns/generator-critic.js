/**
 * Unified Generator-Critic Pattern Handlers
 *
 * Implements generator-critic coordination logic for iterative refinement:
 * - onSubagentStart: Inject role context (generator or critic)
 * - onSubagentStop: Track iteration completion
 * - onPreToolUse: Inject critic feedback to generator
 * - onStop: Block until approved or max rounds reached
 *
 * Environment Variables:
 * - GC_ID: Generator-critic identifier (required for GC operations)
 * - AGENT_ROLE: Role of this agent ('generator' or 'critic')
 * - GC_ITERATION: Current iteration number (1-indexed)
 * - GC_MAX_ROUNDS: Maximum number of refinement rounds
 * - CLAUDE_PROJECT_DIR: Project directory for DB path
 */
import { existsSync } from "fs";
// Import shared utilities
import { getDbPath, runPythonQuery, isValidId } from "../shared/db-utils.js";
// =============================================================================
// onSubagentStart Handler
// =============================================================================
/**
 * Handles SubagentStart hook for generator-critic pattern.
 * Injects role context (generator or critic) and iteration info.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(input) {
  const gcId = process.env.GC_ID;
  // If no GC_ID, continue silently (not in a generator-critic pattern)
  if (!gcId) {
    return { result: "continue" };
  }
  // Validate GC_ID format
  if (!isValidId(gcId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const iteration = parseInt(process.env.GC_ITERATION || "1", 10);
  const maxRounds = parseInt(process.env.GC_MAX_ROUNDS || "3", 10);
  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[gc] ${role} starting for iteration ${iteration}/${maxRounds} (${gcId})`,
  );
  // Inject role-specific context
  let message = "";
  if (role === "generator") {
    message = `You are the GENERATOR in an iterative refinement loop (iteration ${iteration}/${maxRounds}). `;
    if (iteration === 1) {
      message += "Create an initial solution to the task.";
    } else {
      message += "Refine your previous output based on critic feedback.";
    }
  } else if (role === "critic") {
    message = `You are the CRITIC in an iterative refinement loop (iteration ${iteration}/${maxRounds}). `;
    message +=
      "Review the generator's output and provide constructive feedback. ";
    message +=
      'If the output meets all requirements, include "APPROVED" in your response.';
  } else {
    message = `Generator-Critic pattern active (iteration ${iteration}/${maxRounds}).`;
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
 * Handles SubagentStop hook for generator-critic pattern.
 * Tracks iteration completion in database.
 * Records generator output and critic feedback.
 */
export async function onSubagentStop(input) {
  const gcId = process.env.GC_ID;
  // If no GC_ID, continue silently
  if (!gcId) {
    return { result: "continue" };
  }
  // Validate GC_ID format
  if (!isValidId(gcId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const iteration = parseInt(process.env.GC_ITERATION || "1", 10);
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Track iteration completion
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
gc_id = sys.argv[2]
iteration = int(sys.argv[3])
role = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS gc_iterations (
        id TEXT PRIMARY KEY,
        gc_id TEXT NOT NULL,
        iteration INTEGER NOT NULL,
        generator_output TEXT,
        critic_feedback TEXT,
        approved BOOLEAN DEFAULT 0,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_gc_iterations
        ON gc_iterations(gc_id, iteration)
''')

# Record iteration completion
iter_id = f"{gc_id}_iter_{iteration}"
now = datetime.now().isoformat()

# Check if iteration exists
cursor = conn.execute(
    "SELECT id FROM gc_iterations WHERE id = ?",
    (iter_id,)
)
exists = cursor.fetchone() is not None

if not exists:
    conn.execute('''
        INSERT INTO gc_iterations (id, gc_id, iteration, created_at)
        VALUES (?, ?, ?, ?)
    ''', (iter_id, gc_id, iteration, now))
else:
    # Update existing record based on role
    if role == "generator":
        conn.execute('''
            UPDATE gc_iterations
            SET generator_output = ?
            WHERE id = ?
        ''', ("(output recorded)", iter_id))
    elif role == "critic":
        conn.execute('''
            UPDATE gc_iterations
            SET critic_feedback = ?
            WHERE id = ?
        ''', ("(feedback recorded)", iter_id))

conn.commit()
conn.close()

print(json.dumps({'success': True}))
`;
    const result = runPythonQuery(query, [
      dbPath,
      gcId,
      iteration.toString(),
      role,
    ]);
    if (!result.success) {
      console.error("SubagentStop Python error:", result.stderr);
      return { result: "continue" };
    }
    console.error(`[gc] ${role} completed iteration ${iteration}`);
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
 * Handles PreToolUse hook for generator-critic pattern.
 * Injects previous critic feedback to generator on subsequent iterations.
 * No injection for critic or first iteration.
 */
export async function onPreToolUse(input) {
  const gcId = process.env.GC_ID;
  // If no GC_ID, continue silently
  if (!gcId) {
    return { result: "continue" };
  }
  // Validate GC_ID format
  if (!isValidId(gcId)) {
    return { result: "continue" };
  }
  const role = process.env.AGENT_ROLE || "unknown";
  const iteration = parseInt(process.env.GC_ITERATION || "1", 10);
  const dbPath = getDbPath();
  // Only inject feedback to generator on iterations > 1
  if (role !== "generator" || iteration <= 1) {
    return { result: "continue" };
  }
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Fetch previous critic feedback
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
gc_id = sys.argv[2]
prev_iteration = int(sys.argv[3])

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get previous iteration's feedback
cursor = conn.execute('''
    SELECT critic_feedback
    FROM gc_iterations
    WHERE gc_id = ? AND iteration = ?
''', (gc_id, prev_iteration))

row = cursor.fetchone()
feedback = row[0] if row else None

conn.close()
print(json.dumps({'feedback': feedback}))
`;
    const prevIteration = iteration - 1;
    const result = runPythonQuery(query, [
      dbPath,
      gcId,
      prevIteration.toString(),
    ]);
    if (!result.success) {
      return { result: "continue" };
    }
    // Parse feedback
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    if (data.feedback && data.feedback !== "(feedback recorded)") {
      return {
        result: "continue",
        message: `CRITIC FEEDBACK from iteration ${prevIteration}: ${data.feedback}`,
      };
    }
    return { result: "continue" };
  } catch (err) {
    console.error("PreToolUse hook error:", err);
    return { result: "continue" };
  }
}
// =============================================================================
// onPostToolUse Handler
// =============================================================================
/**
 * Handles PostToolUse hook for generator-critic pattern.
 * Currently no-op for generator-critic pattern.
 */
export async function onPostToolUse(input) {
  // No special handling needed for generator-critic pattern
  return { result: "continue" };
}
// =============================================================================
// onStop Handler
// =============================================================================
/**
 * Handles Stop hook for generator-critic pattern.
 * Checks if output is approved or max rounds reached.
 * Blocks if neither condition is met.
 */
export async function onStop(input) {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }
  const gcId = process.env.GC_ID;
  if (!gcId) {
    return { result: "continue" };
  }
  // Validate GC_ID format
  if (!isValidId(gcId)) {
    return { result: "continue" };
  }
  const iteration = parseInt(process.env.GC_ITERATION || "1", 10);
  const maxRounds = parseInt(process.env.GC_MAX_ROUNDS || "3", 10);
  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }
  try {
    // Check if approved or max rounds reached
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
gc_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Check for approved iteration
cursor = conn.execute('''
    SELECT iteration, approved, critic_feedback
    FROM gc_iterations
    WHERE gc_id = ? AND approved = 1
    ORDER BY iteration DESC
    LIMIT 1
''', (gc_id,))

row = cursor.fetchone()
approved_iter = row[0] if row else None

# Get latest feedback
cursor = conn.execute('''
    SELECT iteration, critic_feedback
    FROM gc_iterations
    WHERE gc_id = ?
    ORDER BY iteration DESC
    LIMIT 1
''', (gc_id,))

row = cursor.fetchone()
latest_feedback = row[1] if row else None

conn.close()
print(json.dumps({
    'approved': approved_iter is not None,
    'latest_feedback': latest_feedback
}))
`;
    const result = runPythonQuery(query, [dbPath, gcId]);
    if (!result.success) {
      return { result: "continue" };
    }
    // Parse result
    let data;
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }
    // Check if approved
    if (data.approved) {
      return {
        result: "continue",
        message:
          "Generator-Critic pattern complete: Output approved by critic.",
      };
    }
    // Check if max rounds reached
    if (iteration >= maxRounds) {
      return {
        result: "continue",
        message: `Generator-Critic pattern complete: Max rounds (${maxRounds}) reached.`,
      };
    }
    // Not approved and not at max rounds - could continue or block
    // For now, continue (pattern implementation controls iteration)
    return { result: "continue" };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
