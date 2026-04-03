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
import {
  generateSessionId,
  writeSessionId,
  getProject,
} from "./shared/session-id.js";
import type { SessionStartInput, HookOutput } from "./shared/types.js";

/**
 * Main entry point for the SessionStart hook.
 * Registers the session, persists the ID to file, and injects awareness message.
 */
export function main(): void {
  // Read hook input from stdin
  let input: SessionStartInput;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent) as SessionStartInput;
  } catch {
    // If we can't read input, just continue silently
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }

  const sessionId = generateSessionId();
  const project = getProject();
  const projectName = project.split("/").pop() || "unknown";

  // Store session ID in environment and file for other hooks
  process.env.COORDINATION_SESSION_ID = sessionId;
  if (!writeSessionId(sessionId)) {
    console.error(
      `[session-register] WARNING: Failed to persist session ID ${sessionId} to file`,
    );
  }

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
  const output: HookOutput = {
    result: "continue",
    message: awarenessMessage,
  };

  console.log(JSON.stringify(output));
}

// Run if executed directly
main();
