/**
 * Drift Detector (PostToolUse:Edit Hook)
 *
 * After each Edit:
 * 1. Tracks edit count per session
 * 2. Every N edits, forces a validation checkpoint
 * 3. Claude must confirm alignment with spec before continuing
 */
import { readFileSync, existsSync } from "fs";
import {
  getSessionContext,
  incrementEditCount,
  extractSpecRequirements,
} from "./shared/spec-context.js";
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  // Only process successful edits
  if (!input.tool_response?.success) {
    console.log("{}");
    return;
  }
  // Get session context
  const session = getSessionContext(projectDir, input.session_id);
  if (!session?.active_spec) {
    // No active spec, no tracking
    console.log("{}");
    return;
  }
  // Increment edit count and check if checkpoint needed
  const { count, needsCheckpoint } = incrementEditCount(
    projectDir,
    input.session_id,
  );
  if (!needsCheckpoint) {
    // Not time for checkpoint yet
    console.log("{}");
    return;
  }
  // Load spec for checkpoint validation
  if (!existsSync(session.active_spec)) {
    console.log("{}");
    return;
  }
  const specContent = readFileSync(session.active_spec, "utf-8");
  const requirements = extractSpecRequirements(
    specContent,
    session.current_phase ?? undefined,
  );
  const phase = session.current_phase ? ` (${session.current_phase})` : "";
  // Force validation checkpoint
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `🔍 DRIFT CHECK - ${count} edits made${phase}

Before continuing, verify alignment with spec:

${requirements}

**Respond with:**
1. Are these changes aligned with the spec? (Yes/No + brief explanation)
2. Any unintended side effects or deviations?
3. Should anything be adjusted?

Then continue with your work.`,
    }),
  );
}
main().catch(() => console.log("{}"));
