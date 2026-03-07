#!/usr/bin/env node

// src/agent-error-capture.ts
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
var ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bexception\b/i,
  /\bfailure\b/i,
  /\bcrashed?\b/i,
  /\btimeout\b/i,
  /\bTraceback\s+\(most recent/i,
  // Python stack trace
  /\bat\s+\S+\s+\(\S+:\d+:\d+\)/,
  // JS stack trace
  /\bpanic:/i,
  // Go panic
  /\bRuntimeError\b/i,
  /\bTypeError\b/i,
  /\bSyntaxError\b/i,
  /\bImportError\b/i,
  /\bModuleNotFoundError\b/i,
  /\bConnectionRefused\b/i,
  /\bENOENT\b/i,
  /\bEPERM\b/i,
  /\bEACCES\b/i
];
var FAILURE_INDICATORS = [
  /\bcould not\b/i,
  /\bunable to\b/i,
  /\bI couldn't\b/i,
  /\bI was unable\b/i,
  /\bI failed to\b/i,
  /\bwas not able to\b/i,
  /\bdidn't work\b/i,
  /\bdoesn't work\b/i
];
function readStdin() {
  return readFileSync(0, "utf-8");
}
function outputContinue() {
  console.log(JSON.stringify({}));
}
function getOpcDir() {
  return process.env.CLAUDE_OPC_DIR || join(process.env.HOME || process.env.USERPROFILE || "", "continuous-claude", "opc");
}
function responseToString(response) {
  if (typeof response === "string") return response;
  if (response === null || response === void 0) return "";
  try {
    return JSON.stringify(response, null, 2);
  } catch {
    return String(response);
  }
}
function hasErrorPattern(text) {
  return ERROR_PATTERNS.some((p) => p.test(text));
}
function hasFailureIndicator(text) {
  return FAILURE_INDICATORS.some((p) => p.test(text));
}
function extractErrorContext(response, maxLen = 500) {
  const lines = response.split("\n");
  const errorLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (ERROR_PATTERNS.some((p) => p.test(line))) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 4);
      errorLines.push(...lines.slice(start, end));
      break;
    }
  }
  if (errorLines.length > 0) {
    return errorLines.join("\n").substring(0, maxLen);
  }
  if (response.length <= maxLen) return response;
  return response.substring(0, maxLen / 2) + "\n...\n" + response.substring(response.length - maxLen / 2);
}
function storeLearning(sessionId, agentType, prompt, errorContext) {
  const opcDir = getOpcDir();
  const storeScript = join(opcDir, "scripts", "core", "store_learning.py");
  if (!existsSync(storeScript)) {
    console.error("[AgentErrorCapture] store_learning.py not found");
    return;
  }
  const content = `Agent '${agentType}' error: ${errorContext}`;
  const tags = [
    "auto_captured",
    "agent_failure",
    `agent:${agentType}`,
    "scope:global"
  ];
  try {
    const escapedContent = content.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    const escapedContext = `Failed agent invocation: ${agentType}`;
    const tagsStr = tags.join(",");
    execSync(
      `cd "${opcDir}" && uv run python scripts/core/store_learning.py --session-id "${sessionId}" --type FAILED_APPROACH --content "${escapedContent}" --context "${escapedContext}" --tags "${tagsStr}" --confidence medium`,
      { encoding: "utf-8", timeout: 1e4, stdio: ["pipe", "pipe", "pipe"] }
    );
    console.error(`[AgentErrorCapture] Stored failure learning for agent '${agentType}'`);
  } catch (err) {
    console.error(`[AgentErrorCapture] Failed to store learning: ${err}`);
  }
}
async function main() {
  try {
    const rawInput = readStdin();
    if (!rawInput.trim()) {
      outputContinue();
      return;
    }
    let input;
    try {
      input = JSON.parse(rawInput);
    } catch {
      outputContinue();
      return;
    }
    if (input.tool_name !== "Agent" && input.tool_name !== "Task") {
      outputContinue();
      return;
    }
    const agentType = input.tool_input.subagent_type || "unknown";
    const prompt = input.tool_input.prompt || input.tool_input.description || "";
    const responseStr = responseToString(input.tool_response);
    const hasError = hasErrorPattern(responseStr);
    const hasFailure = hasFailureIndicator(responseStr);
    if (hasError) {
      const errorContext = extractErrorContext(responseStr);
      console.error(`[AgentErrorCapture] Detected error in ${agentType} agent response`);
      storeLearning(
        input.session_id,
        agentType,
        prompt,
        errorContext
      );
    }
    outputContinue();
  } catch (err) {
    console.error(`[AgentErrorCapture] Hook error: ${err}`);
    outputContinue();
  }
}
main();
