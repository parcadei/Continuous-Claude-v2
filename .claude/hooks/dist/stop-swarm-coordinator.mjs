// src/stop-swarm-coordinator.ts
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
var SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf-8"));
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.stop_hook_active) {
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
    const result = spawnSync("python3", ["-c", query, dbPath, swarmId], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0) {
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
    if (counts.done < counts.total) {
      const waiting = counts.total - counts.done;
      console.log(
        JSON.stringify({
          result: "block",
          message: `Waiting for ${waiting} agent(s) to complete. Synthesize results when all agents broadcast 'done'.`,
        }),
      );
    } else {
      console.log(JSON.stringify({ result: "continue" }));
    }
  } catch (err) {
    console.error("Stop hook error:", err);
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
