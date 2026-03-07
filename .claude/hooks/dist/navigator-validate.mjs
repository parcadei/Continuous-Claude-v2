// src/navigator-validate.ts
import { readFileSync as readFileSync2 } from "fs";

// src/shared/navigator-state.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
var VALID_AGENTS = {
  RESEARCH: ["scout", "oracle", "pathfinder"],
  IMPLEMENTATION: ["kraken", "spark", "architect", "plan-agent", "strategic-refactorer"],
  DEBUGGING: ["debug-agent", "sleuth", "profiler", "spark", "aegis", "principal-debugger"],
  REFACTORING: ["phoenix", "spark", "strategic-refactorer", "kraken"],
  REVIEW: ["critic", "judge", "liaison", "surveyor", "principal-reviewer", "react-perf-reviewer", "ui-compliance-reviewer"],
  CASUAL: [],
  // No specific agents
  UNKNOWN: []
  // Allow any
};
var STATE_DIR = join(tmpdir(), "claude-navigator");
var STATE_FILE = "navigator-state.json";
function getStateFilePath(sessionId) {
  return join(STATE_DIR, `${sessionId}-${STATE_FILE}`);
}
function loadState(sessionId) {
  const filePath = getStateFilePath(sessionId);
  try {
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch {
  }
  return {
    sessionId,
    detectedTaskType: "UNKNOWN",
    currentPromptKeywords: [],
    guidanceShown: {
      decisionTree: false,
      rulesShown: [],
      agentsShown: []
    },
    lastActivity: Date.now(),
    promptCount: 0
  };
}
function isAgentValidForTask(agentType, taskType) {
  if (taskType === "UNKNOWN" || taskType === "CASUAL") return true;
  const validAgents = VALID_AGENTS[taskType];
  if (!validAgents || validAgents.length === 0) return true;
  return validAgents.some(
    (valid) => agentType.toLowerCase().includes(valid.toLowerCase()) || valid.toLowerCase().includes(agentType.toLowerCase())
  );
}
function getSuggestedAgents(taskType) {
  return VALID_AGENTS[taskType] || [];
}

// src/shared/output.ts
function outputContinue() {
  console.log(JSON.stringify({ result: "continue" }));
}

// src/navigator-validate.ts
function readStdin() {
  return readFileSync2(0, "utf-8");
}
function buildMismatchWarning(agentType, taskType, suggestedAgents) {
  const suggestions = suggestedAgents.slice(0, 3).join(", ");
  return `
NAVIGATOR WARNING: Agent mismatch detected

Spawning: ${agentType}
Detected Task: ${taskType}
Suggested Agents: ${suggestions}

This agent may not be optimal for ${taskType.toLowerCase()} tasks.
Consider using one of the suggested agents instead.
`.trim();
}
function buildHaikuWarning(agentType) {
  return `
NAVIGATOR WARNING: Model violation

Agent: ${agentType}
Model: haiku (NOT RECOMMENDED)

Per agent-model-selection.md, haiku should only be used for
truly mechanical tasks. Most agents need sonnet/opus accuracy.

Remove the model parameter to inherit the parent model.
`.trim();
}
async function main() {
  const input = JSON.parse(readStdin());
  if (input.tool_name !== "Agent" && input.tool_name !== "Task") {
    outputContinue();
    return;
  }
  const agentType = input.tool_input.subagent_type;
  const model = input.tool_input.model;
  if (!agentType) {
    outputContinue();
    return;
  }
  const state = loadState(input.session_id);
  const taskType = state.detectedTaskType;
  const warnings = [];
  if (taskType && taskType !== "UNKNOWN" && taskType !== "CASUAL") {
    if (!isAgentValidForTask(agentType, taskType)) {
      const suggestedAgents = getSuggestedAgents(taskType);
      warnings.push(buildMismatchWarning(agentType, taskType, suggestedAgents));
    }
  }
  if (model?.toLowerCase() === "haiku") {
    warnings.push(buildHaikuWarning(agentType));
  }
  if (warnings.length > 0) {
    const output = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: warnings.join("\n\n---\n\n")
      }
    };
    console.log(JSON.stringify(output));
  } else {
    outputContinue();
  }
}
main().catch(() => {
  outputContinue();
});
