#!/usr/bin/env node
/**
 * Agent State Broadcast - PostToolUse hook
 *
 * Broadcasts agent state to PostgreSQL for TUI observability.
 * Only runs for agents (DEPTH_LEVEL > 0), not the main session.
 *
 * Updates:
 * - last_tool: The tool just used
 * - last_tool_at: UTC timestamp
 * - current_todos: Array of todos if tool was TodoWrite
 *
 * Fire-and-forget style - latency is minimal since hooks run in parallel.
 */
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
/**
 * Check if we should broadcast (only for agents, not main session)
 */
function shouldBroadcast() {
  const depthLevel = parseInt(process.env.DEPTH_LEVEL || "0", 10);
  const agentId = process.env.AGENT_ID;
  // Only broadcast for agents (depth > 0) with an ID
  return depthLevel > 0 && !!agentId;
}
/**
 * Extract todos from TodoWrite tool input
 */
function extractTodos(input) {
  if (input.tool_name !== "TodoWrite") {
    return null;
  }
  const todos = input.tool_input?.todos;
  if (Array.isArray(todos)) {
    return todos;
  }
  return null;
}
/**
 * Broadcast state to PostgreSQL via Python script
 */
function broadcastState(agentId, toolName, todos) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const scriptPath = join(
    projectDir,
    "scripts",
    "agentica_patterns",
    "agent_state_broadcast.py",
  );
  const now = new Date().toISOString();
  // Build Python script to call broadcast_state
  const pythonScript = `
import asyncio
import json
import sys
sys.path.insert(0, '${projectDir}')

from scripts.agentica_patterns.agent_state_broadcast import broadcast_state

async def main():
    agent_id = sys.argv[1]
    tool_name = sys.argv[2]
    timestamp = sys.argv[3]
    todos_json = sys.argv[4] if len(sys.argv) > 4 else 'null'

    todos = json.loads(todos_json) if todos_json != 'null' else None

    await broadcast_state(
        agent_id=agent_id,
        last_tool=tool_name,
        last_tool_at=timestamp,
        current_todos=todos
    )

asyncio.run(main())
`;
  const todosJson = todos ? JSON.stringify(todos) : "null";
  // Fire-and-forget - use spawnSync with short timeout
  // We don't wait for the result since hooks run in parallel
  try {
    spawnSync(
      "python3",
      ["-c", pythonScript, agentId, toolName, now, todosJson],
      {
        encoding: "utf-8",
        timeout: 5000, // 5 second timeout
        maxBuffer: 1024 * 64,
      },
    );
  } catch {
    // Silently ignore errors - fire-and-forget
  }
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    input = JSON.parse(rawInput);
  } catch {
    // Malformed input - return continue
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Early exit if not an agent
  if (!shouldBroadcast()) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const agentId = process.env.AGENT_ID;
  if (!agentId) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Extract todos if TodoWrite
  const todos = extractTodos(input);
  // Broadcast state (fire-and-forget)
  broadcastState(agentId, input.tool_name, todos);
  // Always continue - never block
  const output = { result: "continue" };
  console.log(JSON.stringify(output));
}
main().catch(() => {
  // Always return continue on error
  console.log(JSON.stringify({ result: "continue" }));
});
