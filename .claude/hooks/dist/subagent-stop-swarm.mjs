// src/subagent-stop-swarm.ts
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
var SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    if (!rawInput.trim()) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    input = JSON.parse(rawInput);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const swarmId = process.env.SWARM_ID;
  if (!swarmId) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (!SAFE_ID_PATTERN.test(swarmId)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const agentId = input.agent_id ?? "unknown";
  if (!SAFE_ID_PATTERN.test(agentId)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
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
    const result = spawnSync(
      "python3",
      ["-c", query, dbPath, swarmId, agentId],
      {
        encoding: "utf-8",
        maxBuffer: 1024 * 1024,
      },
    );
    if (result.status !== 0) {
      console.error("SubagentStop Python error:", result.stderr);
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    let counts;
    try {
      counts = JSON.parse(result.stdout.trim());
    } catch (parseErr) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    console.error(
      `[subagent-stop] Agent ${agentId} done. Progress: ${counts.done}/${counts.total}`,
    );
    if (counts.done >= counts.total && counts.total > 0) {
      const output = {
        result: "continue",
        message:
          "All agents complete. Consider synthesizing findings into final report.",
      };
      console.log(JSON.stringify(output));
    } else {
      console.log(JSON.stringify({ result: "continue" }));
    }
  } catch (err) {
    console.error("SubagentStop hook error:", err);
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
