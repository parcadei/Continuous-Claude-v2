/**
 * Phase Gate (Stop Hook)
 *
 * Before Claude stops, validates that:
 * 1. Acceptance criteria from the spec are addressed
 * 2. Forces Claude to verify implementation matches spec
 */
import { readFileSync, existsSync } from "fs";
import {
  getSessionContext,
  extractAcceptanceCriteria,
} from "./shared/spec-context.js";
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  // CRITICAL: Prevent infinite loop
  if (input.stop_hook_active) {
    console.log("{}");
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  // Get session context
  const session = getSessionContext(projectDir, input.session_id);
  if (!session?.active_spec) {
    // No active spec, allow stop
    console.log("{}");
    return;
  }
  // Only gate if there were edits
  if (session.edit_count < 3) {
    // Too few edits, probably not a real implementation
    console.log("{}");
    return;
  }
  // Load spec
  if (!existsSync(session.active_spec)) {
    console.log("{}");
    return;
  }
  const specContent = readFileSync(session.active_spec, "utf-8");
  const criteria = extractAcceptanceCriteria(
    specContent,
    session.current_phase ?? undefined,
  );
  if (criteria.length === 0) {
    // No criteria to validate
    console.log("{}");
    return;
  }
  const phase = session.current_phase ? ` (${session.current_phase})` : "";
  // Force validation before stop
  console.log(
    JSON.stringify({
      decision: "block",
      reason: `🚦 PHASE GATE - Implementation validation required${phase}

You've made ${session.edit_count} edits. Before finishing, verify against acceptance criteria:

${criteria.join("\n")}

**For each criterion:**
- ✅ Met: Explain how
- ⏳ Partial: What's done, what's left
- ❌ Not addressed: Why, and should it be?

After verification, you may continue or finish.`,
    }),
  );
}
main().catch(() => console.log("{}"));
