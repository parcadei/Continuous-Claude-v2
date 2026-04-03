/**
 * Unified Jury Pattern Handlers
 *
 * Implements jury coordination logic for independent voting:
 * - onSubagentStart: Inject juror isolation context
 * - onSubagentStop: Track vote completion
 * - onPreToolUse: Block cross-juror data access if JURY_ISOLATION=strict
 * - onStop: Provide verdict summary when all jurors complete
 *
 * Environment Variables:
 * - JURY_ID: Jury identifier (required for jury operations)
 * - JUROR_INDEX: Index of this juror (0-indexed)
 * - TOTAL_JURORS: Total number of jurors in this jury
 * - JURY_ISOLATION: Optional isolation mode ('strict' blocks Read tool)
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
 * Handles SubagentStart hook for jury pattern.
 * Injects juror isolation context message.
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(
  input: SubagentStartInput,
): Promise<HookOutput> {
  const juryId = process.env.JURY_ID;

  // If no JURY_ID, continue silently (not in a jury)
  if (!juryId) {
    return { result: "continue" };
  }

  // Validate JURY_ID format
  if (!isValidId(juryId)) {
    return { result: "continue" };
  }

  const jurorIndex = process.env.JUROR_INDEX || "0";
  const totalJurors = process.env.TOTAL_JURORS || "1";
  const isolation = process.env.JURY_ISOLATION;

  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[jury] Juror ${jurorIndex} of ${totalJurors} starting for jury ${juryId}`,
  );

  // Inject isolation context message
  let message = `You are Juror ${jurorIndex} (position ${parseInt(jurorIndex) + 1} of ${totalJurors}) in an independent jury panel.`;
  message += " Vote based solely on your own analysis.";
  message += " Do not attempt to coordinate with or influence other jurors.";

  if (isolation === "strict") {
    message += " STRICT ISOLATION: Your vote will be recorded independently.";
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
 * Handles SubagentStop hook for jury pattern.
 * Marks juror as completed in database.
 * Injects verdict prompt when all jurors complete.
 */
export async function onSubagentStop(
  input: SubagentStopInput,
): Promise<HookOutput> {
  const juryId = process.env.JURY_ID;

  // If no JURY_ID, continue silently
  if (!juryId) {
    return { result: "continue" };
  }

  // Validate JURY_ID format
  if (!isValidId(juryId)) {
    return { result: "continue" };
  }

  const jurorId = input.agent_id ?? "unknown";

  // Validate agent_id format
  if (!isValidId(jurorId)) {
    return { result: "continue" };
  }

  const jurorIndex = process.env.JUROR_INDEX || "0";
  const totalJurors = parseInt(process.env.TOTAL_JURORS || "1", 10);
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Mark juror as completed and check if all are done
    const query = `
import sqlite3
import json
import sys
from datetime import datetime
from uuid import uuid4

db_path = sys.argv[1]
jury_id = sys.argv[2]
juror_id = sys.argv[3]
juror_index = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS jury_votes (
        id TEXT PRIMARY KEY,
        jury_id TEXT NOT NULL,
        juror_id TEXT NOT NULL,
        vote TEXT,
        created_at TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_jury_votes
        ON jury_votes(jury_id, completed)
''')

# Insert or update vote completion
vote_id = f"{jury_id}_{juror_index}"
conn.execute('''
    INSERT OR REPLACE INTO jury_votes (id, jury_id, juror_id, vote, created_at, completed)
    VALUES (?, ?, ?, NULL, ?, 1)
''', (vote_id, jury_id, juror_id, datetime.now().isoformat()))
conn.commit()

# Count completed jurors
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM jury_votes
    WHERE jury_id = ? AND completed = 1
''', (jury_id,))
completed_count = cursor.fetchone()[0]

conn.close()
print(json.dumps({'completed': completed_count}))
`;

    const result = runPythonQuery(query, [dbPath, juryId, jurorId, jurorIndex]);

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
      `[jury] Juror ${jurorId} done. Progress: ${counts.completed}/${totalJurors}`,
    );

    // Check if all jurors have completed
    if (counts.completed >= totalJurors && totalJurors > 0) {
      return {
        result: "continue",
        message:
          "All jurors have completed their deliberations. Review the votes and provide your final verdict.",
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
 * Handles PreToolUse hook for jury pattern.
 * Blocks cross-juror data access if JURY_ISOLATION=strict.
 * Allows all tools when isolation not set.
 */
export async function onPreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const juryId = process.env.JURY_ID;

  // If no JURY_ID, continue silently
  if (!juryId) {
    return { result: "continue" };
  }

  // Validate JURY_ID format
  if (!isValidId(juryId)) {
    return { result: "continue" };
  }

  const isolation = process.env.JURY_ISOLATION;

  // If no isolation mode, allow all tools
  if (isolation !== "strict") {
    return { result: "continue" };
  }

  // In strict isolation mode, block Read tool to prevent cross-contamination
  const toolName = input.tool_name;

  if (toolName === "Read") {
    return {
      result: "block",
      message:
        "JURY ISOLATION: Read tool is blocked in strict isolation mode to prevent cross-juror contamination. Vote based on your independent analysis.",
    };
  }

  // Allow safe tools (Bash, Write, etc.)
  return { result: "continue" };
}

// =============================================================================
// onPostToolUse Handler
// =============================================================================

/**
 * Handles PostToolUse hook for jury pattern.
 * Currently no-op for jury pattern.
 */
export async function onPostToolUse(
  input: PostToolUseInput,
): Promise<HookOutput> {
  // No special handling needed for jury pattern
  return { result: "continue" };
}

// =============================================================================
// onStop Handler
// =============================================================================

/**
 * Handles Stop hook for jury pattern.
 * Blocks coordinator until all jurors have voted.
 * Returns verdict summary when all votes are in.
 */
export async function onStop(input: StopInput): Promise<HookOutput> {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }

  const juryId = process.env.JURY_ID;

  if (!juryId) {
    return { result: "continue" };
  }

  // Validate JURY_ID format
  if (!isValidId(juryId)) {
    return { result: "continue" };
  }

  const totalJurors = parseInt(process.env.TOTAL_JURORS || "0", 10);
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
jury_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Count completed jurors
cursor = conn.execute('''
    SELECT COUNT(*) as completed_count
    FROM jury_votes
    WHERE jury_id = ? AND completed = 1
''', (jury_id,))
completed_count = cursor.fetchone()[0]

# Get votes if all completed
votes = []
if completed_count > 0:
    cursor = conn.execute('''
        SELECT juror_id, vote
        FROM jury_votes
        WHERE jury_id = ? AND completed = 1
        ORDER BY created_at
    ''', (jury_id,))
    for row in cursor.fetchall():
        votes.append({'juror': row[0], 'vote': row[1]})

conn.close()
print(json.dumps({'completed': completed_count, 'votes': votes}))
`;

    const result = runPythonQuery(query, [dbPath, juryId]);

    if (!result.success) {
      return { result: "continue" };
    }

    // Parse Python output
    let data: {
      completed: number;
      votes: Array<{ juror: string; vote: string | null }>;
    };
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    if (data.completed < totalJurors) {
      const waiting = totalJurors - data.completed;
      return {
        result: "block",
        message: `Waiting for ${waiting} juror(s) to complete their deliberations. All votes must be recorded before reaching a verdict.`,
      };
    }

    // All jurors have voted - provide verdict summary
    let message = `All ${totalJurors} jurors have completed their deliberations.\n\n`;
    message += "JURY VOTES:\n";
    for (const v of data.votes) {
      message += `- ${v.juror}: ${v.vote || "(pending)"}\n`;
    }
    message += "\nProvide your final verdict based on the consensus.";

    return {
      result: "continue",
      message,
    };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
