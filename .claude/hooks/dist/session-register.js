/**
 * SessionStart Hook - Registers session in coordination layer.
 *
 * This hook:
 * 1. Registers the session in PostgreSQL for cross-session awareness
 * 2. Injects a system reminder about coordination layer features
 * 3. Shows other active sessions working on the same project
 *
 * Part of the coordination layer architecture (Phase 1).
 */
import { readFileSync } from "fs";
import { registerSession, getActiveSessions } from "./shared/db-utils-pg.js";
// Generate a short session ID from environment or random
function getSessionId() {
  // Use Braintrust span ID if available, otherwise generate
  const spanId = process.env.BRAINTRUST_SPAN_ID;
  if (spanId) {
    return spanId.slice(0, 8);
  }
  // Fallback to timestamp-based ID
  return `s-${Date.now().toString(36)}`;
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
    // If we can't read input, just continue silently
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const sessionId = getSessionId();
  const project = getProject();
  const projectName = project.split("/").pop() || "unknown";
  // Store session ID in environment for other hooks
  process.env.COORDINATION_SESSION_ID = sessionId;
  // Register session in PostgreSQL
  const registerResult = registerSession(sessionId, project, "");
  // Get other active sessions
  const sessionsResult = getActiveSessions(project);
  const otherSessions = sessionsResult.sessions.filter(
    (s) => s.id !== sessionId,
  );
  // Build awareness message
  let awarenessMessage = `
<system-reminder>
MULTI-SESSION COORDINATION ACTIVE

Session: ${sessionId}
Project: ${projectName}
`;
  if (otherSessions.length > 0) {
    awarenessMessage += `
Active peer sessions (${otherSessions.length}):
${otherSessions.map((s) => `  - ${s.id}: ${s.working_on || "working..."}`).join("\n")}

Coordination features:
- File edits are tracked to prevent conflicts
- Research findings are shared automatically
- Use Task tool normally - coordination happens via hooks
`;
  } else {
    awarenessMessage += `
No other sessions active on this project.
You are the only session currently working here.
`;
  }
  awarenessMessage += `</system-reminder>`;
  // Output hook result with awareness injection
  const output = {
    result: "continue",
    message: awarenessMessage,
  };
  console.log(JSON.stringify(output));
}
// Run if executed directly
main();
