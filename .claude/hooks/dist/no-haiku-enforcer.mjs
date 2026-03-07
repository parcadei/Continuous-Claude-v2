#!/usr/bin/env node

// src/no-haiku-enforcer.ts
async function main() {
  let input = {};
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  try {
    const rawInput = Buffer.concat(chunks).toString("utf-8").trim();
    if (rawInput) {
      input = JSON.parse(rawInput);
    }
  } catch {
    console.log("{}");
    return;
  }
  const tool = input.tool || input.tool_name;
  const model = input.tool_input?.model;
  if (tool !== "Agent" && tool !== "Task" || model?.toLowerCase() !== "haiku") {
    console.log("{}");
    return;
  }
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `BLOCKED: model='haiku' not allowed.

Per ~/.claude/rules/no-haiku.md:
- Haiku is unreliable for agent tasks
- REMOVE the model parameter (inherits Opus from parent)
- Or use model='sonnet' if you need a specific model`
    }
  };
  console.log(JSON.stringify(output));
}
main().catch(() => {
  console.log("{}");
});
