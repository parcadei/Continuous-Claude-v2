/**
 * PreToolUse:Edit Hook - Check and claim files for conflict prevention.
 *
 * This hook:
 * 1. Checks if another session has claimed the file
 * 2. Warns if file is being edited by another session
 * 3. Claims the file for the current session
 *
 * Part of the coordination layer architecture (Phase 1).
 */
import { readFileSync } from "fs";
import { checkFileClaim, claimFile } from "./shared/db-utils-pg.js";
// Get session ID from environment (set by session-register hook)
function getSessionId() {
  return (
    process.env.COORDINATION_SESSION_ID ||
    process.env.BRAINTRUST_SPAN_ID?.slice(0, 8) ||
    `s-${Date.now().toString(36)}`
  );
}
// Get project from environment
function getProject() {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}
export function main() {
  // Read hook input from stdin
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    // If we can't read input, continue silently
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Only process Edit tool
  if (input.tool_name !== "Edit") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  // Extract file path from input
  const filePath = input.tool_input?.file_path;
  if (!filePath) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId = getSessionId();
  const project = getProject();
  // Check if file is claimed by another session
  const claimCheck = checkFileClaim(filePath, project, sessionId);
  let output;
  if (claimCheck.claimed) {
    // File is being edited by another session - warn but allow
    const fileName = filePath.split("/").pop() || filePath;
    output = {
      result: "continue", // Allow edit, just warn
      message: `\u26A0\uFE0F **File Conflict Warning**
\`${fileName}\` is being edited by Session ${claimCheck.claimedBy}
Consider coordinating with the other session to avoid conflicts.`,
    };
  } else {
    // Claim the file for this session
    claimFile(filePath, project, sessionId);
    output = { result: "continue" };
  }
  console.log(JSON.stringify(output));
}
// Run if executed directly
main();
