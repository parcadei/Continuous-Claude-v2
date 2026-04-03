/**
 * Explore to Scout Redirect Hook
 *
 * Intercepts Task tool calls with subagent_type="Explore" and redirects to "scout".
 * Explore uses Haiku which is unreliable. Scout uses Sonnet with a detailed prompt.
 */
import { readFileSync } from "fs";
// Agent types that should be used instead of Explore
const RELIABLE_ALTERNATIVES = {
  // For codebase exploration, use scout
  default: "scout",
  // Could add more specific mappings based on prompt content
};
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  // Only intercept Task tool
  if (input.tool_name !== "Task") {
    console.log("{}");
    return;
  }
  const subagentType = input.tool_input.subagent_type;
  // Only redirect Explore agents (case-insensitive)
  if (!subagentType || subagentType.toLowerCase() !== "explore") {
    console.log("{}");
    return;
  }
  // Block and redirect to scout
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `REDIRECT: Explore agent uses Haiku which is unreliable. Use subagent_type="scout" instead.

Scout uses Sonnet with a detailed 197-line prompt for accurate codebase exploration.

Alternatives by task:
- Codebase exploration → scout
- External research → oracle
- Pattern finding → scout or codebase-pattern-finder
- Bug investigation → sleuth
- File location → codebase-locator

Re-run the Task tool with subagent_type="scout" and the same prompt.`,
    },
  };
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error(`explore-to-scout hook error: ${err.message}`);
  console.log("{}");
});
