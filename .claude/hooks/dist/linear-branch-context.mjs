// src/linear-branch-context.ts
import { readFileSync } from "fs";
var BRANCH_CREATE = /(?:git\s+(?:checkout\s+-b|switch\s+-c))\s+\S*(?:LIN|lin|Lin)-(\d+)/i;
function extractLinearIssue(command) {
  if (typeof command !== "string" || command.length === 0) return null;
  const match = command.match(BRANCH_CREATE);
  return match ? match[1] : null;
}
function buildBranchContext(issueNumber) {
  return `[Linear] Branch linked to issue LIN-${issueNumber}.
View: https://linear.app/minions-lab/issue/LIN-${issueNumber}
Consider updating issue status to "In Progress":
  linearis issue update LIN-${issueNumber} --status "In Progress" --json`;
}
function handleBranchPostToolUse(input) {
  try {
    if (!input || typeof input !== "object") return null;
    if (input.tool_name !== "Bash") return null;
    const command = input.tool_input?.command;
    const issueNumber = extractLinearIssue(command);
    if (!issueNumber) return null;
    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: buildBranchContext(issueNumber)
      }
    };
  } catch {
    return null;
  }
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    console.log("{}");
    return;
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log("{}");
    return;
  }
  const result = handleBranchPostToolUse(input);
  if (result) {
    console.log(JSON.stringify(result));
  } else {
    console.log("{}");
  }
}
if (!process.env.VITEST) {
  main().catch(() => {
    console.log("{}");
  });
}
export {
  buildBranchContext,
  extractLinearIssue,
  handleBranchPostToolUse
};
