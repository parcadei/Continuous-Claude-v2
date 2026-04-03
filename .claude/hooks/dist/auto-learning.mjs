// src/auto-learning.ts
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join as join2, dirname } from "path";

// src/shared/learning-extractor.ts
import { spawnSync } from "child_process";
import { join } from "path";
async function storeLearning(learning, sessionId, projectDir) {
  const opcDir = join(projectDir, "opc");
  const args = [
    "run",
    "python",
    "scripts/store_learning.py",
    "--session-id",
    sessionId,
  ];
  if (learning.outcome === "success") {
    args.push("--worked", `${learning.what}. ${learning.how}`);
  } else if (learning.outcome === "failure") {
    args.push("--failed", `${learning.what}. ${learning.why}`);
  } else {
    args.push("--patterns", `${learning.what}: ${learning.how}`);
  }
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
    timeout: 1e4,
  });
  return result.status === 0;
}
function extractTestPassLearning(event, recentEdits) {
  if (!event.tool_response) return null;
  const output = String(event.tool_response.output || "");
  const passPatterns = [
    /(\d+) passed/i,
    /tests? passed/i,
    /ok \(/i,
    /success/i,
    /\u2713/,
    // checkmark
  ];
  const isPass = passPatterns.some((p) => p.test(output));
  if (!isPass) return null;
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
function extractPeriodicLearning(turnCount, recentActions, sessionGoal) {
  return {
    what: `Turn ${turnCount} checkpoint: ${recentActions.length} actions`,
    why: sessionGoal || "Session progress tracking",
    how: recentActions.join("; ").slice(0, 500),
    outcome: "partial",
    tags: ["periodic", "progress", "procedural", "auto_extracted"],
  };
}

// src/auto-learning.ts
var PERIODIC_INTERVAL = 5;
function getStateFilePath() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    return join2(projectDir, ".claude", "cache", "auto-learning-state.json");
  }
  return join2(
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
      return {
        edits: parsed.edits || [],
        turnCount: parsed.turnCount || 0,
        recentActions: parsed.recentActions || [],
      };
    } catch {}
  }
  return { edits: [], turnCount: 0, recentActions: [] };
}
function saveState(state) {
  const stateFile = getStateFilePath();
  const cacheDir = dirname(stateFile);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  state.edits = state.edits.slice(-10);
  state.recentActions = state.recentActions.slice(-10);
  writeFileSync(stateFile, JSON.stringify(state));
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
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
  state.turnCount++;
  const actionDesc = buildActionDescription(input.tool_name, input.tool_input);
  state.recentActions.push(actionDesc);
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
      state.recentActions = [];
      saveState(state);
    }
  }
  if (input.tool_name === "Edit" || input.tool_name === "Write") {
    const filePath = String(input.tool_input.file_path || "");
    const oldString = String(input.tool_input.old_string || "").slice(0, 50);
    const newString = String(input.tool_input.new_string || "").slice(0, 50);
    state.edits.push({
      file: filePath.split("/").pop() || filePath,
      description: oldString
        ? `${oldString} \u2192 ${newString}`
        : "New content",
      timestamp: Date.now(),
    });
    saveState(state);
    return;
  }
  if (input.tool_name === "Bash") {
    const command = String(input.tool_input.command || "");
    const output = String(input.tool_response.output || "");
    const exitCode = input.tool_response.exitCode;
    const isTestCommand =
      /\b(test|pytest|vitest|jest|npm run test|cargo test)\b/i.test(command);
    if (!isTestCommand) {
      saveState(state);
      return;
    }
    const passPatterns = [
      /(\d+) passed/i,
      /tests? passed/i,
      /ok \(/i,
      /\bPASS\b/,
      /\u2713/,
      // checkmark
    ];
    const isPass = exitCode === 0 && passPatterns.some((p) => p.test(output));
    if (isPass && state.edits.length > 0) {
      const fiveMinAgo = Date.now() - 5 * 60 * 1e3;
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
            state.edits = [];
            saveState(state);
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
    }
  }
  saveState(state);
  console.log("{}");
}
main().catch(() => {
  console.log("{}");
});
