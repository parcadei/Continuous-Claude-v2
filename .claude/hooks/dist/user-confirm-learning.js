/**
 * User Confirmation Learning Hook (UserPromptSubmit)
 *
 * Detects user confirmations ("works", "good", "thanks", etc.) and
 * extracts learnings from recent edits. This captures implicit positive
 * feedback that an approach worked.
 *
 * Flow:
 * 1. Check if user message matches confirmation patterns
 * 2. Read recent edits from auto-learning state file
 * 3. Use extractConfirmationLearning() to create structured learning
 * 4. Store to archival memory via storeLearning()
 * 5. Output success message in hookSpecificOutput
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  storeLearning,
  extractConfirmationLearning,
} from "./shared/learning-extractor.js";
/**
 * Get state file path - project-local if CLAUDE_PROJECT_DIR set, else global
 * Must match auto-learning.ts to share state
 */
function getStateFilePath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    return join(projectDir, ".claude", "cache", "auto-learning-state.json");
  }
  return join(
    process.env.HOME || "/tmp",
    ".claude",
    "cache",
    "auto-learning-state.json",
  );
}
// Recency threshold: only consider edits from last 10 minutes
const RECENCY_THRESHOLD_MS = 10 * 60 * 1000;
function readStdin() {
  return readFileSync(0, "utf-8");
}
/**
 * Load auto-learning state (recent edits tracked by PostToolUse hook)
 */
function loadState() {
  const stateFile = getStateFilePath();
  if (existsSync(stateFile)) {
    try {
      const parsed = JSON.parse(readFileSync(stateFile, "utf-8"));
      return {
        edits: parsed.edits || [],
        turnCount: parsed.turnCount || 0,
        recentActions: parsed.recentActions || [],
      };
    } catch {
      // Corrupted state
    }
  }
  return { edits: [], turnCount: 0, recentActions: [] };
}
/**
 * Check if prompt is a confirmation message.
 * Uses same patterns as extractConfirmationLearning but adds more.
 */
function isConfirmationPrompt(prompt) {
  const normalizedPrompt = prompt.toLowerCase().trim();
  // Skip if too long (likely a real task, not just confirmation)
  if (normalizedPrompt.length > 100) {
    return false;
  }
  // Confirmation patterns
  const confirmPatterns = [
    /^(works?|working|worked)!*$/i,
    /^(good|great|perfect|nice|excellent|awesome)!*$/i,
    /^(thanks?|thank you|thx|ty)!*$/i,
    /^(yes|yep|yeah|yup)!*$/i,
    /^(ok|okay|k)!*$/i,
    /^(cool|sweet|neat)!*$/i,
    /^(lgtm|ship it)!*$/i,
    /\b(works?|working)\b/i,
    /\b(that('s| is) (it|right|correct|perfect|good))\b/i,
    /\b(looks? good)\b/i,
    /\b(nice work|good job|well done)\b/i,
    /\b(fixed|solved|resolved)\b/i,
    /^[^a-z]*$/i, // Just punctuation like "!" or emojis
  ];
  return confirmPatterns.some((p) => p.test(normalizedPrompt));
}
/**
 * Build recent context string from edit history
 */
function buildRecentContext(state) {
  const now = Date.now();
  const recentEdits = state.edits.filter(
    (e) => now - e.timestamp < RECENCY_THRESHOLD_MS,
  );
  if (recentEdits.length === 0) {
    return "";
  }
  // Build context from edits
  const contextParts = [];
  for (const edit of recentEdits.slice(-5)) {
    contextParts.push(`${edit.file}: ${edit.description}`);
  }
  return contextParts.join("; ");
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  // Skip empty prompts
  if (!input.prompt || input.prompt.trim().length === 0) {
    console.log("{}");
    return;
  }
  // Check if this is a confirmation
  if (!isConfirmationPrompt(input.prompt)) {
    console.log("{}");
    return;
  }
  // Load recent edit state
  const state = loadState();
  // Build context from recent edits
  const recentContext = buildRecentContext(state);
  // Need some context to make learning meaningful
  if (!recentContext || recentContext.length < 20) {
    console.log("{}");
    return;
  }
  // Extract learning using shared function
  const learning = extractConfirmationLearning(input.prompt, recentContext);
  if (!learning) {
    console.log("{}");
    return;
  }
  // Store the learning
  const stored = await storeLearning(learning, input.session_id, projectDir);
  if (stored) {
    // Output notification for Claude's context
    const learningPreview = learning.what.slice(0, 50);
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: `AUTO-LEARNING: Captured user confirmation. Stored: "${learningPreview}..." Recent edits validated as successful approach.`,
        },
      }),
    );
  } else {
    console.log("{}");
  }
}
main().catch(() => {
  // Silent fail - don't block user input
  console.log("{}");
});
