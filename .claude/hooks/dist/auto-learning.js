/**
 * Auto-Learning Hook (PostToolUse)
 *
 * Automatically extracts and stores learnings from conversation events:
 * - Test passes after edits
 * - Successful command completions
 * - Edit patterns worth remembering
 *
 * Builds memory similar to Letta's archival_memory_insert but automatically.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import {
  storeLearning,
  extractTestPassLearning,
  extractPeriodicLearning,
} from "./shared/learning-extractor.js";
const PERIODIC_INTERVAL = 5; // Extract periodic learning every N turns
/**
 * Get state file path - project-local if CLAUDE_PROJECT_DIR set, else global
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
function loadState() {
  const stateFile = getStateFilePath();
  if (existsSync(stateFile)) {
    try {
      const parsed = JSON.parse(readFileSync(stateFile, "utf-8"));
      // Ensure recentActions exists for backward compatibility
      return {
        edits: parsed.edits || [],
        turnCount: parsed.turnCount || 0,
        recentActions: parsed.recentActions || [],
      };
    } catch {
      // Corrupted state, reset
    }
  }
  return { edits: [], turnCount: 0, recentActions: [] };
}
function saveState(state) {
  const stateFile = getStateFilePath();
  // Ensure cache directory exists
  const cacheDir = dirname(stateFile);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  // Keep only last 10 edits and last 10 actions
  state.edits = state.edits.slice(-10);
  state.recentActions = state.recentActions.slice(-10);
  writeFileSync(stateFile, JSON.stringify(state));
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
/**
 * Build brief action description from tool use
 */
function buildActionDescription(toolName, toolInput) {
  switch (toolName) {
    case "Edit":
    case "Write": {
      const filePath = String(toolInput.file_path || "");
      const fileName = filePath.split("/").pop() || filePath;
      return `${toolName}:${fileName}`;
    }
    case "Read": {
      const filePath = String(toolInput.file_path || "");
      const fileName = filePath.split("/").pop() || filePath;
      return `Read:${fileName}`;
    }
    case "Bash": {
      const cmd = String(toolInput.command || "").slice(0, 40);
      return `Bash:${cmd}`;
    }
    case "Grep": {
      const pattern = String(toolInput.pattern || "").slice(0, 20);
      return `Grep:${pattern}`;
    }
    case "Glob": {
      const pattern = String(toolInput.pattern || "").slice(0, 20);
      return `Glob:${pattern}`;
    }
    default:
      return toolName;
  }
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const state = loadState();
  // Increment turn count and track action
  state.turnCount++;
  const actionDesc = buildActionDescription(input.tool_name, input.tool_input);
  state.recentActions.push(actionDesc);
  // Check for periodic learning extraction (every PERIODIC_INTERVAL turns)
  if (
    state.turnCount % PERIODIC_INTERVAL === 0 &&
    state.recentActions.length > 0
  ) {
    const periodicLearning = extractPeriodicLearning(
      state.turnCount,
      state.recentActions,
    );
    const stored = await storeLearning(
      periodicLearning,
      input.session_id,
      projectDir,
    );
    if (stored) {
      // Clear recent actions after storing periodic summary
      state.recentActions = [];
      saveState(state);
      // Continue processing - don't return yet
    }
  }
  // Track edits
  if (input.tool_name === "Edit" || input.tool_name === "Write") {
    const filePath = String(input.tool_input.file_path || "");
    const oldString = String(input.tool_input.old_string || "").slice(0, 50);
    const newString = String(input.tool_input.new_string || "").slice(0, 50);
    state.edits.push({
      file: filePath.split("/").pop() || filePath,
      description: oldString ? `${oldString} → ${newString}` : "New content",
      timestamp: Date.now(),
    });
    saveState(state);
    return; // Don't output anything for Edit tracking
  }
  // Detect test passes
  if (input.tool_name === "Bash") {
    const command = String(input.tool_input.command || "");
    const output = String(input.tool_response.output || "");
    const exitCode = input.tool_response.exitCode;
    // Only process test commands
    const isTestCommand =
      /\b(test|pytest|vitest|jest|npm run test|cargo test)\b/i.test(command);
    if (!isTestCommand) {
      saveState(state); // Save turn count and recent actions
      return;
    }
    // Check for test pass
    const passPatterns = [
      /(\d+) passed/i,
      /tests? passed/i,
      /ok \(/i,
      /\bPASS\b/,
      /\u2713/, // checkmark
    ];
    const isPass = exitCode === 0 && passPatterns.some((p) => p.test(output));
    if (isPass && state.edits.length > 0) {
      // Get recent edits (last 5 minutes)
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const recentEdits = state.edits.filter((e) => e.timestamp > fiveMinAgo);
      if (recentEdits.length > 0) {
        const learning = extractTestPassLearning(
          {
            type: "test_pass",
            tool_name: input.tool_name,
            tool_input: input.tool_input,
            tool_response: input.tool_response,
            session_id: input.session_id,
          },
          recentEdits,
        );
        if (learning) {
          const stored = await storeLearning(
            learning,
            input.session_id,
            projectDir,
          );
          if (stored) {
            // Clear edits after successful learning extraction
            state.edits = [];
            saveState(state);
            // Notify Claude (but don't block)
            console.log(
              JSON.stringify({
                hookSpecificOutput: {
                  hookEventName: "PostToolUse",
                  additionalContext: `AUTO-LEARNING: Stored "${learning.what.slice(0, 60)}..." to memory.`,
                },
              }),
            );
            return;
          }
        }
      }
    }
    // Check for test failure (might want to remember what didn't work)
    const failPatterns = [/(\d+) failed/i, /FAIL/, /error/i];
    const isFail = exitCode !== 0 || failPatterns.some((p) => p.test(output));
    if (isFail && state.edits.length > 0) {
      const recentEdits = state.edits.slice(-3);
      const failLearning = {
        what: `Test failed after: ${recentEdits.map((e) => e.file).join(", ")}`,
        why: "Changes caused test failures",
        how: `Edits: ${recentEdits.map((e) => e.description).join("; ")}`,
        outcome: "failure",
        tags: ["test_fail", "avoid", "auto_extracted"],
        context: output.slice(0, 200),
      };
      await storeLearning(failLearning, input.session_id, projectDir);
      // Don't notify on failures (too noisy)
    }
  }
  // Save state (turn count, recent actions) and output nothing
  saveState(state);
  console.log("{}");
}
main().catch(() => {
  console.log("{}");
});
