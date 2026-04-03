/**
 * Working On Sync Hook (PostToolUse:TodoWrite)
 *
 * Updates session's working_on field when TodoWrite is used.
 * Other sessions can see what you're currently working on.
 *
 * Extracts the in_progress task from TodoWrite input and syncs it to the database.
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
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Only process TodoWrite
  if (input.tool_name !== "TodoWrite") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId = getSessionId();
  const project = getProject();
  if (!sessionId) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Extract in_progress task from todos
  const todos = input.tool_input?.todos || [];
  const inProgressTodo = todos.find((t) => t.status === "in_progress");
  // Use activeForm if available (more descriptive), fall back to content
  const workingOn = inProgressTodo
    ? inProgressTodo.activeForm || inProgressTodo.content
    : "";
  // Update working_on in sessions table
  const pythonCode = `
import asyncpg
import os

session_id = sys.argv[1]
project = sys.argv[2]
working_on = sys.argv[3] if len(sys.argv) > 3 else ''
pg_url = os.environ.get('CONTINUOUS_CLAUDE_DB_URL', 'postgresql://claude:claude_dev@localhost:5432/continuous_claude')

async def main():
    conn = await asyncpg.connect(pg_url)
    try:
        await conn.execute('''
            UPDATE sessions
            SET working_on = $3, last_heartbeat = NOW()
            WHERE id = $1 AND project = $2
        ''', session_id, project, working_on)
        print('ok')
    finally:
        await conn.close()

asyncio.run(main())
`;
  // Fire and forget
  runPgQuery(pythonCode, [sessionId, project, workingOn]);
  console.log(JSON.stringify({ result: "continue" }));
}
main();
