/**
 * Learning Extractor - Shared module for auto-learning hooks
 *
 * Extracts structured learnings from conversation events and stores them.
 * Used by PostToolUse, UserPromptSubmit, and SubagentStop hooks.
 */
import { spawnSync } from "child_process";
import { join } from "path";
/**
 * Store a learning to archival memory via store_learning.py
 */
export async function storeLearning(learning, sessionId, projectDir) {
  const opcDir = join(projectDir, "opc");
  // Build args based on outcome
  const args = [
    "run",
    "python",
    "scripts/store_learning.py",
    "--session-id",
    sessionId,
  ];
  // Map learning to store_learning.py interface
  if (learning.outcome === "success") {
    args.push("--worked", `${learning.what}. ${learning.how}`);
  } else if (learning.outcome === "failure") {
    args.push("--failed", `${learning.what}. ${learning.why}`);
  } else {
    // Partial/progress - use patterns
    args.push("--patterns", `${learning.what}: ${learning.how}`);
  }
  // Add decisions if there's a why
  if (learning.why && learning.outcome !== "failure") {
    args.push("--decisions", learning.why);
  }
  const result = spawnSync("uv", args, {
    encoding: "utf-8",
    cwd: opcDir,
    env: {
      ...process.env,
      PYTHONPATH: opcDir,
    },
    timeout: 10000,
  });
  return result.status === 0;
}
/**
 * Format learning into storable content
 */
function formatLearningContent(learning) {
  const lines = [];
  lines.push(`What: ${learning.what}`);
  lines.push(`Why: ${learning.why}`);
  lines.push(`How: ${learning.how}`);
  lines.push(`Outcome: ${learning.outcome}`);
  if (learning.context) {
    lines.push(`Context: ${learning.context}`);
  }
  return lines.join("\n");
}
/**
 * Extract learning from a test pass event
 */
export function extractTestPassLearning(event, recentEdits) {
  if (!event.tool_response) return null;
  const output = String(event.tool_response.output || "");
  // Detect test pass patterns
  const passPatterns = [
    /(\d+) passed/i,
    /tests? passed/i,
    /ok \(/i,
    /success/i,
    /\u2713/, // checkmark
  ];
  const isPass = passPatterns.some((p) => p.test(output));
  if (!isPass) return null;
  // Build learning from recent edits
  const editSummary = recentEdits
    .map((e) => `${e.file}: ${e.description}`)
    .join("; ");
  return {
    what: `Tests passed after: ${editSummary || "recent changes"}`,
    why: "Changes addressed the failing tests",
    how:
      recentEdits.length > 0
        ? `Files modified: ${recentEdits.map((e) => e.file).join(", ")}`
        : "See recent edit history",
    outcome: "success",
    tags: ["test_pass", "fix", "auto_extracted"],
    context: output.slice(0, 200),
  };
}
/**
 * Extract learning from user confirmation
 */
export function extractConfirmationLearning(prompt, recentContext) {
  // Detect confirmation patterns
  const confirmPatterns = [
    /\b(works?|working)\b/i,
    /\b(good|great|perfect|nice)\b/i,
    /\b(thanks?|thank you)\b/i,
    /\b(yes|yep|yeah)\b/i,
    /\bthat('s| is) (it|right|correct)\b/i,
  ];
  const isConfirmation = confirmPatterns.some((p) => p.test(prompt));
  if (!isConfirmation) return null;
  // Need some recent context to make this meaningful
  if (!recentContext || recentContext.length < 20) return null;
  return {
    what: `User confirmed: "${prompt.slice(0, 50)}"`,
    why: "Approach/solution worked for user",
    how: recentContext.slice(0, 300),
    outcome: "success",
    tags: ["user_confirmed", "solution", "auto_extracted"],
  };
}
/**
 * Generate periodic summary learning
 */
export function extractPeriodicLearning(turnCount, recentActions, sessionGoal) {
  return {
    what: `Turn ${turnCount} checkpoint: ${recentActions.length} actions`,
    why: sessionGoal || "Session progress tracking",
    how: recentActions.join("; ").slice(0, 500),
    outcome: "partial",
    tags: ["periodic", "progress", "procedural", "auto_extracted"],
  };
}
/**
 * Extract learning from agent completion
 */
export function extractAgentLearning(agentType, agentPrompt, agentResult) {
  return {
    what: `Agent ${agentType} completed task`,
    why: agentPrompt.slice(0, 200),
    how: `Result: ${agentResult.slice(0, 300)}`,
    outcome: agentResult.toLowerCase().includes("error")
      ? "failure"
      : "success",
    tags: ["agent", agentType, "auto_extracted"],
    context: agentPrompt,
  };
}
