/**
 * Spec Anchor (PreToolUse:Edit Hook)
 *
 * Before every Edit, injects the relevant spec requirements into context.
 * This keeps the spec visible and prevents drift.
 */
import { readFileSync, existsSync } from "fs";
import {
  getSessionContext,
  extractSpecRequirements,
} from "./shared/spec-context.js";
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  // Get session context
  const session = getSessionContext(projectDir, input.session_id);
  if (!session?.active_spec) {
    // No active spec, allow edit without context
    console.log("{}");
    return;
  }
  // Load spec file
  if (!existsSync(session.active_spec)) {
    console.log("{}");
    return;
  }
  const specContent = readFileSync(session.active_spec, "utf-8");
  const requirements = extractSpecRequirements(
    specContent,
    session.current_phase ?? undefined,
  );
  if (!requirements) {
    console.log("{}");
    return;
  }
  // Build context message
  const filePath = input.tool_input.file_path || "unknown";
  const phase = session.current_phase ? ` (${session.current_phase})` : "";
  const contextMessage = `📋 SPEC ANCHOR${phase}

Editing: ${filePath}
Verify this change aligns with requirements:

${requirements}`;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: contextMessage,
      },
    }),
  );
}
main().catch(() => console.log("{}"));
