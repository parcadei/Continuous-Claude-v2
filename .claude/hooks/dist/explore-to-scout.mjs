#!/usr/bin/env node

// src/explore-to-scout.ts
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
  const subagentType = input.tool_input?.subagent_type;
  if (tool !== "Agent" && tool !== "Task" || subagentType?.toLowerCase() !== "explore") {
    console.log("{}");
    return;
  }
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `BLOCKED: subagent_type='Explore' is not allowed.

Per ~/.claude/rules/use-scout-not-explore.md:
- Explore uses Haiku -- fast but inaccurate
- Scout uses Sonnet with a detailed prompt -- accurate results

REMOVE subagent_type="Explore" and use subagent_type="scout" instead.`
    }
  };
  console.log(JSON.stringify(output));
}
main().catch(() => {
  console.log("{}");
});
