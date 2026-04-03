// src/explore-to-scout.ts
import { readFileSync } from "fs";
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  if (input.tool_name !== "Task") {
    console.log("{}");
    return;
  }
  const subagentType = input.tool_input.subagent_type;
  if (!subagentType || subagentType.toLowerCase() !== "explore") {
    console.log("{}");
    return;
  }
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `REDIRECT: Explore agent uses Haiku which is unreliable. Use subagent_type="scout" instead.

Scout uses Sonnet with a detailed 197-line prompt for accurate codebase exploration.

Alternatives by task:
- Codebase exploration \u2192 scout
- External research \u2192 oracle
- Pattern finding \u2192 scout or codebase-pattern-finder
- Bug investigation \u2192 sleuth
- File location \u2192 codebase-locator

Re-run the Task tool with subagent_type="scout" and the same prompt.`,
    },
  };
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error(`explore-to-scout hook error: ${err.message}`);
  console.log("{}");
});
