/**
 * Subagent Learning Hook (SubagentStop)
 *
 * Automatically extracts and stores learnings when agents complete:
 * - Captures agent type, prompt, and result
 * - Uses extractAgentLearning() to create structured learning
 * - Stores to archival memory for future recall
 *
 * Filters out:
 * - Empty or error-only results
 * - Results < 100 characters (not meaningful)
 */
import { readFileSync } from "fs";
import {
  storeLearning,
  extractAgentLearning,
} from "./shared/learning-extractor.js";
const MIN_RESULT_LENGTH = 100;
function readStdin() {
  return readFileSync(0, "utf-8");
}
/**
 * Check if result is meaningful enough to store
 */
function isMeaningfulResult(result) {
  if (!result || result.length < MIN_RESULT_LENGTH) {
    return false;
  }
  // Skip if result is just an error message
  const lowerResult = result.toLowerCase();
  const errorOnlyPatterns = [
    /^error:/i,
    /^failed:/i,
    /^exception:/i,
    /^traceback/i,
    /^fatal:/i,
  ];
  // If result is short and matches error patterns, skip
  if (
    result.length < 200 &&
    errorOnlyPatterns.some((p) => p.test(result.trim()))
  ) {
    return false;
  }
  // Skip empty or whitespace-only
  if (result.trim().length < MIN_RESULT_LENGTH) {
    return false;
  }
  // Skip if it looks like a template or placeholder
  if (result.includes("TODO") && result.length < 200) {
    return false;
  }
  return true;
}
/**
 * Clean and normalize agent type
 */
function normalizeAgentType(agentType) {
  if (!agentType) return "unknown";
  // Clean up common variations
  const type = agentType.toLowerCase().trim();
  // Map common aliases
  const aliases = {
    code: "kraken",
    research: "scout",
    search: "scout",
    explore: "scout",
  };
  return aliases[type] || type;
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  // Validate we have the required fields
  if (!input.agent_result) {
    console.log("{}");
    return;
  }
  // Check if result is meaningful
  if (!isMeaningfulResult(input.agent_result)) {
    console.log("{}");
    return;
  }
  const agentType = normalizeAgentType(input.agent_type);
  const agentPrompt = input.agent_prompt || "No prompt provided";
  try {
    // Extract learning from agent completion
    const learning = extractAgentLearning(
      agentType,
      agentPrompt,
      input.agent_result,
    );
    // Store the learning
    const stored = await storeLearning(learning, input.session_id, projectDir);
    if (stored) {
      // Create summary for output
      const promptSummary = agentPrompt.slice(0, 50).replace(/\n/g, " ");
      const resultSummary = input.agent_result.slice(0, 80).replace(/\n/g, " ");
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "SubagentStop",
            additionalContext: `AUTO-LEARNING: Agent ${agentType} completed. Task: "${promptSummary}..." Result: "${resultSummary}..."`,
          },
        }),
      );
      return;
    }
  } catch (err) {
    // Non-fatal - don't break the agent stop flow
    console.error(`[subagent-learning] Error storing learning: ${err}`);
  }
  // Output empty on failure
  console.log("{}");
}
main().catch(() => {
  console.log("{}");
});
