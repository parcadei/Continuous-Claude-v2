#!/usr/bin/env node

// src/agent-state-broadcast.ts
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
function shouldBroadcast() {
  const depthLevel = parseInt(process.env.DEPTH_LEVEL || "0", 10);
  const agentId = process.env.AGENT_ID;
  return depthLevel > 0 && !!agentId;
}
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
function broadcastState(agentId, toolName, todos) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const scriptPath = join(
    projectDir,
    "scripts",
    "agentica_patterns",
    "agent_state_broadcast.py",
  );
  const now = /* @__PURE__ */ new Date().toISOString();
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
  try {
    spawnSync(
      "python3",
      ["-c", pythonScript, agentId, toolName, now, todosJson],
      {
        encoding: "utf-8",
        timeout: 5e3,
        // 5 second timeout
        maxBuffer: 1024 * 64,
      },
    );
  } catch {}
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    input = JSON.parse(rawInput);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (!shouldBroadcast()) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const agentId = process.env.AGENT_ID;
  if (!agentId) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const todos = extractTodos(input);
  broadcastState(agentId, input.tool_name, todos);
  const output = { result: "continue" };
  console.log(JSON.stringify(output));
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
});
