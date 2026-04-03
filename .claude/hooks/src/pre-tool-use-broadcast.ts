#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";

interface PreToolUseInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
}

interface HookOutput {
  result: "continue" | "block";
  message?: string;
}

// Safe ID pattern: alphanumeric with hyphens/underscores, 1-64 chars
// Blocks shell metacharacters, newlines, quotes, etc.
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

async function main() {
  const input = readFileSync(0, "utf-8");
  // Parse input but don't assign to unused variable
  JSON.parse(input) as PreToolUseInput;

  // Check if we're in an agentica swarm
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    // Not in a swarm, continue normally
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  // Validate SWARM_ID format to prevent injection
  if (!SAFE_ID_PATTERN.test(swarmId)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  const agentId = process.env.AGENT_ID || "unknown";
  // Validate AGENT_ID format if provided
  if (agentId !== "unknown" && !SAFE_ID_PATTERN.test(agentId)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  // Query broadcasts table for this swarm
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dbPath = join(
    projectDir,
    ".claude",
    "cache",
    "agentica-coordination",
    "coordination.db",
  );

  if (!existsSync(dbPath)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  try {
    // Use Python to query SQLite with spawnSync for safety (no shell interpolation)
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

    // Use spawnSync with argument array to prevent command injection
    const result = spawnSync(
      "python3",
      ["-c", query, dbPath, swarmId, agentId],
      {
        encoding: "utf-8",
        maxBuffer: 1024 * 1024,
      },
    );

    if (result.status !== 0) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }

    const broadcasts = JSON.parse(result.stdout.trim() || "[]");

    if (broadcasts.length > 0) {
      let contextMessage = "\n--- SWARM BROADCASTS ---\n";
      for (const b of broadcasts) {
        contextMessage += `[${b.type.toUpperCase()}] from ${b.sender}:\n`;
        contextMessage += `  ${JSON.stringify(b.payload)}\n`;
      }
      contextMessage += "------------------------\n";

      console.log(
        JSON.stringify({
          result: "continue",
          message: contextMessage,
        }),
      );
    } else {
      console.log(JSON.stringify({ result: "continue" }));
    }
  } catch (err) {
    // On error, continue without broadcasts
    console.error("Broadcast query error:", err);
    console.log(JSON.stringify({ result: "continue" }));
  }
}

main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
