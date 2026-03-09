#!/usr/bin/env node

// src/smarter-everyday.ts
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

// src/shared/atomic-write.ts
import {
  writeFileSync,
  renameSync as renameSync2,
  unlinkSync,
  existsSync as existsSync2,
  openSync,
  closeSync,
  readFileSync,
  statSync as statSync2,
  constants
} from "fs";
import { dirname, basename, join as join2 } from "path";

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
  function log2(level, msg, data) {
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
    debug: (msg, data) => log2("debug", msg, data),
    info: (msg, data) => log2("info", msg, data),
    warn: (msg, data) => log2("warn", msg, data),
    error: (msg, data) => log2("error", msg, data)
  };
}

// src/shared/atomic-write.ts
var log = createLogger("atomic-write");
var LOCK_STALE_MS = 1e4;
var LOCK_RETRY_MS = 50;
var LOCK_TIMEOUT_MS = 5e3;
function atomicWriteSync(filePath, content) {
  const dir = dirname(filePath);
  const tmpFile = join2(dir, `.${basename(filePath)}.tmp.${process.pid}`);
  try {
    writeFileSync(tmpFile, content, "utf-8");
    renameSync2(tmpFile, filePath);
  } catch (err) {
    try {
      if (existsSync2(tmpFile)) unlinkSync(tmpFile);
    } catch {
    }
    throw err;
  }
}
function acquireLockSync(filePath, timeoutMs = LOCK_TIMEOUT_MS) {
  const lockFile = filePath + ".lock";
  const startTime = Date.now();
  while (true) {
    try {
      const fd = openSync(lockFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
      writeFileSync(fd, `${process.pid}
${Date.now()}`, "utf-8");
      closeSync(fd);
      return true;
    } catch (err) {
      if (err.code === "EEXIST") {
        try {
          const stat = statSync2(lockFile);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
            log.warn("Removing stale lock", { lockFile, ageMs: Date.now() - stat.mtimeMs });
            unlinkSync(lockFile);
            continue;
          }
        } catch {
          continue;
        }
        if (Date.now() - startTime > timeoutMs) {
          log.error("Lock acquisition timed out", { lockFile, timeoutMs });
          return false;
        }
        const waitUntil = Date.now() + LOCK_RETRY_MS;
        while (Date.now() < waitUntil) {
        }
      } else {
        log.error("Lock acquisition failed", { lockFile, error: String(err) });
        return false;
      }
    }
  }
}
function releaseLockSync(filePath) {
  const lockFile = filePath + ".lock";
  try {
    if (existsSync2(lockFile)) {
      unlinkSync(lockFile);
    }
  } catch (err) {
    log.warn("Failed to release lock", { lockFile, error: String(err) });
  }
}
function writeStateWithLock(filePath, content) {
  const locked = acquireLockSync(filePath);
  try {
    atomicWriteSync(filePath, content);
  } catch (err) {
    log.error("State write failed", { filePath, error: String(err) });
  } finally {
    if (locked) {
      releaseLockSync(filePath);
    }
  }
}

// src/shared/session-isolation.ts
import { tmpdir, hostname } from "os";
import { join as join3 } from "path";
function getSessionId2() {
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }
  const host = hostname().replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);
  return `${host}-${process.pid}`;
}
function getSessionStatePath(baseName, sessionId) {
  const sid = sessionId || getSessionId2();
  const safeSid = sid.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 32);
  return join3(tmpdir(), `claude-${baseName}-${safeSid}.json`);
}

// src/smarter-everyday.ts
var TEST_COMMANDS = [
  /\b(npm|yarn|pnpm)\s+(run\s+)?test/i,
  /\bpytest\b/i,
  /\bcargo\s+test\b/i,
  /\bgo\s+test\b/i,
  /\bjest\b/i,
  /\bvitest\b/i,
  /\bmocha\b/i,
  /\bmake\s+test\b/i,
  /\bnpm\s+run\s+check/i,
  /\btsc\s+--noEmit/i
];
var SUCCESS_PATTERNS = [
  /\bpassed\b/i,
  /\bpassing\b/i,
  /\b0\s+(failures?|errors?)\b/i,
  /[\u2713\u2714\u221A]/,
  // Check marks
  /All tests passed/i,
  /PASS\s/,
  /Tests:\s+\d+\s+passed/i,
  /OK\s*\(/i
];
var FAILURE_PATTERNS = [
  /\bfailed\b/i,
  /\bfailing\b/i,
  /\berror\b/i,
  /\bexception\b/i,
  /\b[1-9]\d*\s+(failures?|errors?)\b/i,
  /[\u2717\u2718\u00D7]/,
  // X marks
  /FAILED/,
  /Tests:\s+\d+\s+failed/i
];
var VICTORY_TURN_THRESHOLD = 3;
function getStateFilePath(_projectDir) {
  return getSessionStatePath("smarter-everyday");
}
function loadState(stateFile, sessionId) {
  const defaultState = {
    session_id: sessionId,
    state: "IDLE",
    tracked_file: null,
    attempts: 0,
    failures: [],
    candidate_turn: null,
    last_edit_content: null,
    test_command: null,
    context: null,
    current_turn: 0
  };
  if (!fs.existsSync(stateFile)) {
    return defaultState;
  }
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    if (data.session_id !== sessionId) {
      return defaultState;
    }
    return { ...defaultState, ...data };
  } catch {
    return defaultState;
  }
}
function saveState(stateFile, state) {
  const dir = path.dirname(stateFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  writeStateWithLock(stateFile, JSON.stringify(state, null, 2));
}
function isTestCommand(command) {
  return TEST_COMMANDS.some((pattern) => pattern.test(command));
}
function isTestSuccess(output) {
  const hasSuccess = SUCCESS_PATTERNS.some((p) => p.test(output));
  const hasFailure = FAILURE_PATTERNS.some((p) => p.test(output));
  return hasSuccess && !hasFailure;
}
function isTestFailure(output) {
  return FAILURE_PATTERNS.some((p) => p.test(output));
}
function extractErrorMessage(output) {
  const lines = output.split("\n");
  for (const line of lines) {
    if (/error:|exception:|failed:/i.test(line)) {
      return line.trim().slice(0, 200);
    }
  }
  for (const line of lines) {
    if (line.trim() && /\b(error|fail|exception)\b/i.test(line)) {
      return line.trim().slice(0, 200);
    }
  }
  return "Unknown error";
}
function getOpcDir() {
  return process.env.CLAUDE_OPC_DIR || path.join(process.env.HOME || process.env.USERPROFILE || "", "continuous-claude", "opc");
}
async function storeVictoryLearning(state, projectDir) {
  const opcDir = getOpcDir();
  const failedApproaches = state.failures.map((f) => f.error).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join("; ");
  const content = `Problem solved after ${state.attempts} attempts.
File: ${state.tracked_file}
Solution: ${state.last_edit_content || "Final edit"}
${failedApproaches ? `Failed approaches: ${failedApproaches}` : ""}
Test: ${state.test_command || "Unknown test command"}`;
  const contextStr = `Victory: ${state.context || state.tracked_file}`;
  const tagsStr = `victory,verified,attempts:${state.attempts}`;
  try {
    const child = spawn("uv", [
      "run",
      "python",
      "scripts/core/store_learning.py",
      "--session-id",
      state.session_id,
      "--type",
      "WORKING_SOLUTION",
      "--content",
      content.slice(0, 2e3),
      "--context",
      contextStr,
      "--tags",
      tagsStr,
      "--confidence",
      "high",
      "--project-dir",
      projectDir
    ], {
      cwd: opcDir,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PYTHONPATH: "." }
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
function processTransition(state, toolName, toolInput, toolResponse, projectDir) {
  const newState = { ...state, current_turn: state.current_turn + 1 };
  let message = null;
  if (toolName === "Edit" || toolName === "Write") {
    const filePath = toolInput.file_path || "";
    if (filePath && (filePath.includes("smarter-everyday-state") || filePath.includes(".claude/cache/") || filePath.includes("extraction-state.json") || filePath.includes(".claude/maestro-state.json"))) {
      return { newState: state, message: null };
    }
    const normalizedPath = path.basename(filePath);
    if (newState.state === "IDLE") {
      newState.state = "ATTEMPTING";
      newState.tracked_file = filePath;
      newState.attempts = 1;
      newState.failures = [];
      newState.context = `Editing ${normalizedPath}`;
    } else if (newState.state === "CANDIDATE" && filePath === newState.tracked_file) {
      newState.state = "ATTEMPTING";
      newState.attempts += 1;
      newState.candidate_turn = null;
    } else if (newState.state === "ATTEMPTING" && filePath === newState.tracked_file) {
      newState.attempts += 1;
    } else if (filePath !== newState.tracked_file) {
      if (newState.state === "CANDIDATE" && newState.candidate_turn) {
        const turnsSince = newState.current_turn - newState.candidate_turn;
        if (turnsSince >= VICTORY_TURN_THRESHOLD) {
          storeVictoryLearning(newState, projectDir);
          message = `[SmarterEveryDay] Victory captured: ${normalizedPath} fixed after ${newState.attempts} attempts`;
          newState.state = "IDLE";
          newState.tracked_file = null;
          newState.attempts = 0;
          newState.failures = [];
          newState.candidate_turn = null;
        }
      }
    }
    if (toolInput.new_string) {
      newState.last_edit_content = String(toolInput.new_string).slice(0, 500);
    } else if (toolInput.content) {
      newState.last_edit_content = String(toolInput.content).slice(0, 500);
    }
  }
  if (toolName === "Bash") {
    const command = toolInput.command || "";
    if (isTestCommand(command)) {
      newState.test_command = command;
      const output = String(toolResponse?.output || "");
      if (newState.state === "ATTEMPTING") {
        newState.state = "TESTING";
        if (isTestSuccess(output)) {
          newState.state = "CANDIDATE";
          newState.candidate_turn = newState.current_turn;
        } else if (isTestFailure(output)) {
          newState.state = "ATTEMPTING";
          newState.failures.push({
            turn: newState.current_turn,
            error: extractErrorMessage(output)
          });
          if (newState.failures.length > 5) {
            newState.failures = newState.failures.slice(-5);
          }
        }
      } else if (newState.state === "CANDIDATE") {
        if (isTestSuccess(output)) {
        } else if (isTestFailure(output)) {
          newState.state = "ATTEMPTING";
          newState.candidate_turn = null;
          newState.failures.push({
            turn: newState.current_turn,
            error: extractErrorMessage(output)
          });
        }
      }
    }
  }
  if (toolName === "TaskUpdate") {
    const status = toolInput.status || "";
    if (status === "completed" && newState.state === "CANDIDATE") {
      storeVictoryLearning(newState, projectDir);
      message = `[SmarterEveryDay] Victory confirmed (task complete): ${newState.tracked_file} fixed after ${newState.attempts} attempts`;
      newState.state = "IDLE";
      newState.tracked_file = null;
      newState.attempts = 0;
      newState.failures = [];
      newState.candidate_turn = null;
    }
  }
  if (newState.state === "CANDIDATE" && newState.candidate_turn) {
    const turnsSince = newState.current_turn - newState.candidate_turn;
    if (turnsSince >= VICTORY_TURN_THRESHOLD && newState.attempts >= 2) {
      storeVictoryLearning(newState, projectDir);
      message = `[SmarterEveryDay] Victory (${turnsSince} turns stable): ${newState.tracked_file} fixed after ${newState.attempts} attempts`;
      newState.state = "IDLE";
      newState.tracked_file = null;
      newState.attempts = 0;
      newState.failures = [];
      newState.candidate_turn = null;
    }
  }
  return { newState, message };
}
async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = getStateFilePath(projectDir);
  const state = loadState(stateFile, data.session_id);
  const { newState, message } = processTransition(
    state,
    data.tool_name,
    data.tool_input,
    data.tool_response,
    projectDir
  );
  saveState(stateFile, newState);
  const output = {
    continue: true,
    systemMessage: message || void 0
  };
  console.log(JSON.stringify(output));
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
main().catch((err) => {
  console.error("smarter-everyday error:", err);
  console.log(JSON.stringify({ continue: true }));
});
