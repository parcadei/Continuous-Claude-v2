/**
 * Unified Adversarial Pattern Handlers
 *
 * Implements adversarial coordination logic for structured debate:
 * - onSubagentStart: Inject role context (advocate/adversary/judge)
 * - onSubagentStop: Track round completion
 * - onPreToolUse: Inject opponent's last argument as context
 * - onPostToolUse: Log debate turns to database
 * - onStop: Capture verdict when debate completes
 *
 * Environment Variables:
 * - ADV_ID: Adversarial debate identifier (required for adversarial operations)
 * - AGENT_ROLE: Role of this agent (advocate, adversary, or judge)
 * - ADVERSARIAL_ROUND: Current debate round (1-indexed)
 * - ADVERSARIAL_MAX_ROUNDS: Maximum debate rounds
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
 * Handles SubagentStart hook for adversarial pattern.
 * Injects role context message (advocate/adversary/judge).
 * Always returns 'continue' - never blocks agent start.
 */
export async function onSubagentStart(
  input: SubagentStartInput,
): Promise<HookOutput> {
  const advId = process.env.ADV_ID;

  // If no ADV_ID, continue silently (not in an adversarial debate)
  if (!advId) {
    return { result: "continue" };
  }

  // Validate ADV_ID format
  if (!isValidId(advId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "unknown";
  const round = process.env.ADVERSARIAL_ROUND || "1";
  const maxRounds = process.env.ADVERSARIAL_MAX_ROUNDS || "3";

  // Log for debugging - this goes to stderr, not stdout
  console.error(
    `[adversarial] ${role} starting round ${round}/${maxRounds} for debate ${advId}`,
  );

  // Inject role context message
  let message = "";

  if (role === "advocate") {
    message = `You are the ADVOCATE in round ${round} of ${maxRounds}.`;
    message += " Present arguments in favor of the position.";
    message +=
      " Be persuasive, thorough, and address critiques from previous rounds.";
  } else if (role === "adversary") {
    message = `You are the ADVERSARY in round ${round} of ${maxRounds}.`;
    message += " Critique and attack the advocate's arguments.";
    message += " Find flaws, weaknesses, and counterarguments.";
  } else if (role === "judge") {
    message = `You are the JUDGE evaluating the complete debate.`;
    message +=
      " Review both positions objectively and decide which is stronger.";
    message += " Provide your verdict with clear reasoning.";
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
 * Handles SubagentStop hook for adversarial pattern.
 * Tracks round completion and provides context for next round.
 */
export async function onSubagentStop(
  input: SubagentStopInput,
): Promise<HookOutput> {
  const advId = process.env.ADV_ID;

  // If no ADV_ID, continue silently
  if (!advId) {
    return { result: "continue" };
  }

  // Validate ADV_ID format
  if (!isValidId(advId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const maxRounds = parseInt(process.env.ADVERSARIAL_MAX_ROUNDS || "3", 10);

  // Log for debugging
  console.error(`[adversarial] ${role} completed round ${round}/${maxRounds}`);

  // Check if we need to prompt for next round
  if (round < maxRounds) {
    return {
      result: "continue",
      message: `Round ${round} of ${maxRounds} complete. Prepare for next round of debate.`,
    };
  } else if (round === maxRounds && role !== "judge") {
    return {
      result: "continue",
      message: `All ${maxRounds} debate rounds complete. Ready for judge's verdict.`,
    };
  }

  return { result: "continue" };
}

// =============================================================================
// onPreToolUse Handler
// =============================================================================

/**
 * Handles PreToolUse hook for adversarial pattern.
 * Injects opponent's last argument as context for informed debate.
 */
export async function onPreToolUse(
  input: PreToolUseInput,
): Promise<HookOutput> {
  const advId = process.env.ADV_ID;

  // If no ADV_ID, continue silently
  if (!advId) {
    return { result: "continue" };
  }

  // Validate ADV_ID format
  if (!isValidId(advId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const dbPath = getDbPath();

  // Only inject opponent context for advocate/adversary, not judge
  if (role !== "advocate" && role !== "adversary") {
    return { result: "continue" };
  }

  // Only if we're past round 1 (need previous arguments)
  if (round <= 1 || !existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Query for opponent's last argument
    const opponentRole = role === "advocate" ? "adversary" : "advocate";
    const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
adv_id = sys.argv[2]
prev_round = sys.argv[3]
opponent_role = sys.argv[4]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get opponent's argument from previous round
cursor = conn.execute('''
    SELECT ${opponentRole === "advocate" ? "advocate_argument" : "adversary_argument"}
    FROM adversarial_rounds
    WHERE adv_id = ? AND round = ?
''', (adv_id, prev_round))

row = cursor.fetchone()
opponent_arg = row[0] if row and row[0] else None

conn.close()
print(json.dumps({'opponent_argument': opponent_arg}))
`;

    const result = runPythonQuery(query, [
      dbPath,
      advId,
      (round - 1).toString(),
      opponentRole,
    ]);

    if (!result.success) {
      return { result: "continue" };
    }

    // Parse Python output
    let data: { opponent_argument: string | null };
    try {
      data = JSON.parse(result.stdout);
    } catch (parseErr) {
      return { result: "continue" };
    }

    if (data.opponent_argument) {
      return {
        result: "continue",
        message: `OPPONENT'S LAST ARGUMENT:\n${data.opponent_argument}\n\nConsider this when forming your response.`,
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
 * Handles PostToolUse hook for adversarial pattern.
 * Logs debate turns to database for history tracking.
 */
export async function onPostToolUse(
  input: PostToolUseInput,
): Promise<HookOutput> {
  const advId = process.env.ADV_ID;

  // If no ADV_ID, continue silently
  if (!advId) {
    return { result: "continue" };
  }

  // Validate ADV_ID format
  if (!isValidId(advId)) {
    return { result: "continue" };
  }

  // Only log Write tool calls (arguments being saved)
  if (input.tool_name !== "Write") {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // Extract argument content from tool input
    const toolInput = input.tool_input as { content?: string };
    const argument = toolInput.content || "";

    // Log debate turn to database
    const query = `
import sqlite3
import json
import sys
from datetime import datetime

db_path = sys.argv[1]
adv_id = sys.argv[2]
round_num = int(sys.argv[3])
role = sys.argv[4]
argument = sys.argv[5]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS adversarial_rounds (
        id TEXT PRIMARY KEY,
        adv_id TEXT NOT NULL,
        round INTEGER NOT NULL,
        advocate_argument TEXT,
        adversary_argument TEXT,
        judge_verdict TEXT,
        created_at TEXT NOT NULL
    )
''')
conn.execute('''
    CREATE INDEX IF NOT EXISTS idx_adversarial_rounds
        ON adversarial_rounds(adv_id, round)
''')

# Insert or update round record
round_id = f"{adv_id}_round_{round_num}"
column = 'advocate_argument' if role == 'advocate' else 'adversary_argument' if role == 'adversary' else 'judge_verdict'

# Try to get existing record
cursor = conn.execute('SELECT id FROM adversarial_rounds WHERE id = ?', (round_id,))
existing = cursor.fetchone()

if existing:
    # Update existing record
    conn.execute(f'''
        UPDATE adversarial_rounds
        SET {column} = ?
        WHERE id = ?
    ''', (argument, round_id))
else:
    # Insert new record
    conn.execute('''
        INSERT INTO adversarial_rounds (id, adv_id, round, advocate_argument, adversary_argument, judge_verdict, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        round_id,
        adv_id,
        round_num,
        argument if role == 'advocate' else None,
        argument if role == 'adversary' else None,
        argument if role == 'judge' else None,
        datetime.now().isoformat()
    ))

conn.commit()
conn.close()
print(json.dumps({'success': True}))
`;

    runPythonQuery(query, [dbPath, advId, round.toString(), role, argument]);

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
 * Handles Stop hook for adversarial pattern.
 * Captures verdict when debate completes.
 */
export async function onStop(input: StopInput): Promise<HookOutput> {
  // Prevent infinite loops - if we're already in a stop hook, continue
  if (input.stop_hook_active) {
    return { result: "continue" };
  }

  const advId = process.env.ADV_ID;

  if (!advId) {
    return { result: "continue" };
  }

  // Validate ADV_ID format
  if (!isValidId(advId)) {
    return { result: "continue" };
  }

  const role = process.env.AGENT_ROLE || "unknown";
  const round = parseInt(process.env.ADVERSARIAL_ROUND || "1", 10);
  const maxRounds = parseInt(process.env.ADVERSARIAL_MAX_ROUNDS || "3", 10);
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    return { result: "continue" };
  }

  try {
    // If we're the judge at the end, provide debate summary
    if (role === "judge" && round === maxRounds) {
      const query = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
adv_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Get all debate rounds
cursor = conn.execute('''
    SELECT round, advocate_argument, adversary_argument, judge_verdict
    FROM adversarial_rounds
    WHERE adv_id = ?
    ORDER BY round
''', (adv_id,))

rounds = []
for row in cursor.fetchall():
    rounds.append({
        'round': row[0],
        'advocate': row[1],
        'adversary': row[2],
        'verdict': row[3]
    })

conn.close()
print(json.dumps({'rounds': rounds}))
`;

      const result = runPythonQuery(query, [dbPath, advId]);

      if (!result.success) {
        return { result: "continue" };
      }

      // Parse Python output
      let data: {
        rounds: Array<{
          round: number;
          advocate: string | null;
          adversary: string | null;
          verdict: string | null;
        }>;
      };
      try {
        data = JSON.parse(result.stdout);
      } catch (parseErr) {
        return { result: "continue" };
      }

      // Provide debate summary
      let message = `DEBATE SUMMARY (${data.rounds.length} rounds):\n\n`;
      for (const r of data.rounds) {
        message += `Round ${r.round}:\n`;
        message += `- Advocate: ${r.advocate ? r.advocate.substring(0, 100) + "..." : "(pending)"}\n`;
        message += `- Adversary: ${r.adversary ? r.adversary.substring(0, 100) + "..." : "(pending)"}\n`;
      }
      message += "\nProvide your final verdict.";

      return {
        result: "continue",
        message,
      };
    }

    return { result: "continue" };
  } catch (err) {
    console.error("Stop hook error:", err);
    return { result: "continue" };
  }
}
