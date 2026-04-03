/**
 * Heartbeat Hook (PostToolUse:*)
 *
 * Updates session's last_heartbeat timestamp on every tool use.
 * Keeps the session marked as "alive" in the coordination layer.
 *
 * This is critical for cross-terminal coordination:
 * - Other sessions check heartbeat to know if you're active
 * - File claims are only valid if the claiming session is alive
 * - Stale sessions (>10 min no heartbeat) get cleaned up
 */
import { readFileSync } from "fs";
import { runPgQuery } from "./shared/db-utils-pg.js";
function getSessionId() {
  return (
    process.env.COORDINATION_SESSION_ID ||
    process.env.BRAINTRUST_SPAN_ID?.slice(0, 8) ||
    ""
  );
}
function getProject() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}
function readStdin() {
  try {
    return readFileSync(0, "utf-8");
  } catch {
    return "{}";
  }
}
export function main() {
  // Skip if coordination not enabled (SQLite users)
  if (process.env.CONTINUOUS_CLAUDE_COORDINATION !== "true") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId = getSessionId();
  const project = getProject();
  // Skip if no session ID (shouldn't happen, but be safe)
  if (!sessionId) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Update heartbeat - single fast UPDATE query
  const pythonCode = `
import asyncpg
import os

session_id = sys.argv[1]
project = sys.argv[2]
pg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')

async def main():
    conn = await asyncpg.connect(pg_url)
    try:
        await conn.execute('''
            UPDATE sessions SET last_heartbeat = NOW()
            WHERE id = $1 AND project = $2
        ''', session_id, project)
        print('ok')
    finally:
        await conn.close()

asyncio.run(main())
`;
  // Fire and forget - don't block on result
  runPgQuery(pythonCode, [sessionId, project]);
  // Always continue
  console.log(JSON.stringify({ result: "continue" }));
}
main();
