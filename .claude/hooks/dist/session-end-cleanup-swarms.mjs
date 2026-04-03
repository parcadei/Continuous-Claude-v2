// src/session-end-cleanup-swarms.ts
import { readFileSync, existsSync } from "fs";
import { spawn, spawnSync } from "child_process";
import { join } from "path";
async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf-8"));
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId = input.session_id || "unknown-session";
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
    const cleanup = `
import sqlite3
import sys
from datetime import datetime

db_path = sys.argv[1]
session_id = sys.argv[2]

conn = sqlite3.connect(db_path)
# Set busy_timeout to prevent indefinite blocking (Finding 3: STARVATION_FINDINGS.md)
conn.execute("PRAGMA busy_timeout = 5000")
conn.execute("PRAGMA journal_mode = WAL")

# Create orphaned_agents table if not exists
conn.execute('''
    CREATE TABLE IF NOT EXISTS orphaned_agents (
        swarm_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        orphaned_at TEXT NOT NULL,
        PRIMARY KEY (swarm_id, agent_id)
    )
''')

# Find agents that started (in completed_tasks) but never broadcast 'done'
# and mark them as orphaned. INSERT OR IGNORE ensures idempotency.
conn.execute('''
    INSERT OR IGNORE INTO orphaned_agents (swarm_id, agent_id, session_id, orphaned_at)
    SELECT DISTINCT ct.swarm_id, ct.agent_id, ?, ?
    FROM completed_tasks ct
    LEFT JOIN broadcasts b ON ct.swarm_id = b.swarm_id
        AND ct.agent_id = b.sender_agent
        AND b.broadcast_type = 'done'
    WHERE b.id IS NULL
''', (session_id, datetime.now().isoformat()))

conn.commit()
conn.close()
`;
    const result = spawnSync("python3", ["-c", cleanup, dbPath, sessionId], {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0) {
      console.error("SessionEnd cleanup error:", result.stderr);
    }
    const cleanupScript = join(
      projectDir,
      "scripts",
      "agentica",
      "cleanup_orphans.py",
    );
    if (existsSync(cleanupScript)) {
      try {
        const orphanCleanup = spawn(
          "uv",
          ["run", "python", cleanupScript, "--kill", "--tier", "1"],
          {
            detached: true,
            stdio: "ignore",
            cwd: projectDir,
          },
        );
        orphanCleanup.unref();
        console.error(
          "SessionEnd: Triggered tier-1 orphan cleanup (fire-and-forget)",
        );
      } catch (spawnErr) {
        console.error("SessionEnd: Failed to spawn orphan cleanup:", spawnErr);
      }
    }
    console.log(JSON.stringify({ result: "continue" }));
  } catch (err) {
    console.error("SessionEnd cleanup error:", err);
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main().catch((err) => {
  console.error("Uncaught error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
