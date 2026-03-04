#!/usr/bin/env node

// src/ralph-task-monitor.ts
import { readFileSync as readFileSync2, existsSync as existsSync3 } from "fs";
import { join as join3 } from "path";
import { spawnSync } from "child_process";

// src/shared/logger.ts
import { appendFileSync, existsSync, mkdirSync, statSync, renameSync } from "fs";
import { join } from "path";
import { homedir } from "os";
var LOG_DIR = join(homedir(), ".claude", "logs");
var LOG_FILE = join(LOG_DIR, "hooks.log");
var MAX_LOG_SIZE = 5 * 1024 * 1024;
var MIN_LEVEL = process.env.CLAUDE_HOOK_LOG_LEVEL || "info";
var LEVEL_ORDER = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function shouldLog(level) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}
function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}
function rotateIfNeeded() {
  try {
    if (existsSync(LOG_FILE)) {
      const stat = statSync(LOG_FILE);
      if (stat.size > MAX_LOG_SIZE) {
        const rotated = LOG_FILE + ".1";
        renameSync(LOG_FILE, rotated);
      }
    }
  } catch {
  }
}
function getSessionId() {
  return process.env.CLAUDE_SESSION_ID || void 0;
}
function writeLog(entry) {
  try {
    ensureLogDir();
    rotateIfNeeded();
    appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {
  }
}
function createLogger(hookName) {
  function log3(level, msg, data) {
    if (!shouldLog(level)) return;
    const entry = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hook: hookName,
      msg,
      sessionId: getSessionId()
    };
    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }
    writeLog(entry);
    if (level === "error" || level === "warn") {
      console.error(`[${hookName}] ${level.toUpperCase()}: ${msg}`);
    }
  }
  return {
    debug: (msg, data) => log3("debug", msg, data),
    info: (msg, data) => log3("info", msg, data),
    warn: (msg, data) => log3("warn", msg, data),
    error: (msg, data) => log3("error", msg, data)
  };
}

// src/shared/state-schema.ts
import { existsSync as existsSync2, readFileSync } from "fs";
import { join as join2 } from "path";
var log = createLogger("state-schema");
function readRalphUnifiedState(projectDir) {
  const dir = projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statePath = join2(dir, ".ralph", "state.json");
  if (!existsSync2(statePath)) return null;
  try {
    const content = readFileSync(statePath, "utf-8");
    const state = JSON.parse(content);
    if (!state.version || !state.version.startsWith("2.")) {
      log.warn("Ralph unified state version mismatch (expected 2.x) \u2014 returning null", {
        version: state.version,
        statePath: join2(dir, ".ralph", "state.json")
      });
      return null;
    }
    return state;
  } catch (err) {
    log.warn("Failed to read Ralph unified state", { error: String(err) });
    return null;
  }
}

// src/ralph-task-monitor.ts
var log2 = createLogger("ralph-task-monitor");
var SUCCESS_PATTERNS = [
  /task\s+(?:is\s+)?complete/i,
  /implementation\s+(?:is\s+)?complete/i,
  /all\s+tests?\s+pass/i,
  /successfully\s+(?:implemented|completed|created|fixed)/i,
  /changes?\s+(?:have been|were)\s+(?:made|applied|committed)/i,
  /<TASK_COMPLETE\s*\/?>/i,
  /<COMPLETE\s*\/?>/i
];
var TASK_ID_PATTERN = /(?:Task|task)[- ]?(?:ID|id)?:?\s*(\d+(?:\.\d+)?)/;
var FAILURE_PATTERNS = [
  /(?:test|build|compilation)\s+(?:failed|failing|errors?)/i,
  /could\s+not\s+(?:complete|fix|resolve)/i,
  /blocked\s+(?:by|on|due)/i,
  /<BLOCKED(?:\s+reason="([^"]+)")?\s*\/?>/i,
  /<ERROR(?:\s+reason="([^"]+)")?\s*\/?>/i,
  /unable\s+to\s+(?:complete|resolve|implement)/i
];
function readStdin() {
  try {
    return readFileSync2(0, "utf-8");
  } catch {
    return "{}";
  }
}
function detectOutcome(text) {
  for (const pattern of FAILURE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { success: false, reason: match[1] || match[0] };
    }
  }
  for (const pattern of SUCCESS_PATTERNS) {
    if (pattern.test(text)) {
      return { success: true };
    }
  }
  return null;
}
function getV2ScriptPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const v2Script = join3(homeDir, ".claude", "scripts", "ralph", "ralph-state-v2.py");
  return existsSync3(v2Script) ? v2Script : null;
}
async function main() {
  let input = {};
  try {
    input = JSON.parse(readStdin());
  } catch {
    return;
  }
  if (input.tool_name !== "Task") return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const unified = readRalphUnifiedState(projectDir);
  if (!unified?.session?.active) return;
  const v2Script = getV2ScriptPath();
  if (!v2Script) return;
  const resultText = input.tool_result?.stdout || input.tool_result?.content || input.tool_result?.text || "";
  if (!resultText) return;
  const agentType = input.tool_input?.subagent_type || "unknown";
  const description = input.tool_input?.description || "";
  const outcome = detectOutcome(resultText);
  if (!outcome) {
    log2.info("No clear outcome detected from agent", { agentType, description });
    return;
  }
  const listResult = spawnSync("python", [
    v2Script,
    "-p",
    projectDir,
    "task-list"
  ], { encoding: "utf-8", timeout: 5e3 });
  if (listResult.status !== 0) return;
  let allTasks = [];
  try {
    const parsed = JSON.parse(listResult.stdout);
    allTasks = parsed.tasks || [];
  } catch {
    return;
  }
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress");
  if (inProgressTasks.length === 0) {
    log2.info("No in-progress tasks to update", { agentType });
    return;
  }
  const agentPrompt = String(input.tool_input?.prompt || "");
  const taskIdMatch = agentPrompt.match(TASK_ID_PATTERN);
  const extractedTaskId = taskIdMatch ? taskIdMatch[1] : null;
  let tasksToUpdate;
  if (extractedTaskId) {
    const matched = inProgressTasks.filter((t) => String(t.id) === extractedTaskId);
    if (matched.length > 0) {
      tasksToUpdate = matched;
      log2.info(`Matched agent to task ${extractedTaskId} via prompt`, { agentType });
    } else {
      log2.warn(`Task ID ${extractedTaskId} from prompt not found in in_progress tasks`, { agentType });
      return;
    }
  } else if (inProgressTasks.length === 1) {
    tasksToUpdate = inProgressTasks;
  } else {
    log2.warn(`Ambiguous: ${inProgressTasks.length} in_progress tasks, no task ID in prompt. Skipping update.`, { agentType });
    return;
  }
  for (const task of tasksToUpdate) {
    const taskId = String(task.id);
    if (outcome.success) {
      log2.info(`Agent completed task ${taskId}`, { agentType, taskName: task.name });
      spawnSync("python", [
        v2Script,
        "-p",
        projectDir,
        "task-complete",
        "--id",
        taskId
      ], { encoding: "utf-8", timeout: 5e3 });
    } else {
      log2.warn(`Agent failed task ${taskId}`, { agentType, reason: outcome.reason, taskName: task.name });
      spawnSync("python", [
        v2Script,
        "-p",
        projectDir,
        "task-fail",
        "--id",
        taskId,
        "--error",
        outcome.reason || "Agent reported failure"
      ], { encoding: "utf-8", timeout: 5e3 });
    }
  }
  const statusLines = [
    "",
    "\u2500".repeat(40),
    `\u{1F4CB} RALPH TASK MONITOR: ${agentType} agent ${outcome.success ? "completed" : "failed"}`,
    "\u2500".repeat(40)
  ];
  for (const task of tasksToUpdate) {
    const taskId = String(task.id);
    if (outcome.success) {
      statusLines.push(`  \u2713 Task ${taskId} marked complete`);
    } else {
      statusLines.push(`  \u2717 Task ${taskId} marked failed: ${outcome.reason || "unknown"}`);
    }
  }
  statusLines.push("\u2500".repeat(40));
  const message = statusLines.join("\n");
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: message } }));
}
main().catch(() => {
});
