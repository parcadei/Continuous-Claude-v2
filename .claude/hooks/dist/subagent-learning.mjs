// src/subagent-learning.ts
import { readFileSync } from "fs";

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
function extractAgentLearning(agentType, agentPrompt, agentResult) {
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

// src/subagent-learning.ts
var MIN_RESULT_LENGTH = 100;
function readStdin() {
  return readFileSync(0, "utf-8");
}
function isMeaningfulResult(result) {
  if (!result || result.length < MIN_RESULT_LENGTH) {
    return false;
  }
  const lowerResult = result.toLowerCase();
  const errorOnlyPatterns = [
    /^error:/i,
    /^failed:/i,
    /^exception:/i,
    /^traceback/i,
    /^fatal:/i,
  ];
  if (
    result.length < 200 &&
    errorOnlyPatterns.some((p) => p.test(result.trim()))
  ) {
    return false;
  }
  if (result.trim().length < MIN_RESULT_LENGTH) {
    return false;
  }
  if (result.includes("TODO") && result.length < 200) {
    return false;
  }
  return true;
}
function normalizeAgentType(agentType) {
  if (!agentType) return "unknown";
  const type = agentType.toLowerCase().trim();
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
  if (!input.agent_result) {
    console.log("{}");
    return;
  }
  if (!isMeaningfulResult(input.agent_result)) {
    console.log("{}");
    return;
  }
  const agentType = normalizeAgentType(input.agent_type);
  const agentPrompt = input.agent_prompt || "No prompt provided";
  try {
    const learning = extractAgentLearning(
      agentType,
      agentPrompt,
      input.agent_result,
    );
    const stored = await storeLearning(learning, input.session_id, projectDir);
    if (stored) {
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
    console.error(`[subagent-learning] Error storing learning: ${err}`);
  }
  console.log("{}");
}
main().catch(() => {
  console.log("{}");
});
