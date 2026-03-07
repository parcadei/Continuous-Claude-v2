#!/usr/bin/env node
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/user-confirmation-detector.ts
import * as fs from "fs";
import * as path from "path";

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

// src/user-confirmation-detector.ts
var RESOLUTION_SIGNALS = [
  // Direct confirmations
  /(?:this|it)(?:'s| is)(?: now)? (?:fixed|working|resolved|done)/i,
  /(?:that|it) (?:worked|works)(?: now)?[.!]?$/i,
  /(?:problem|issue|bug)(?: is)? (?:fixed|solved|resolved)/i,
  /(?:all|everything)(?: is)? (?:good|working|fixed)/i,
  /(?:got it|figured it out)/i,
  // Success acknowledgments
  /^(?:perfect|excellent|great|awesome|nice)[.!]?$/i,
  /^(?:yes|yep|yeah),? (?:that|it)(?:'s| is) (?:it|right|correct)/i,
  /^thanks?,? (?:that|it) (?:worked|fixed)/i
];
var MEMORY_SIGNALS = [
  /(?:remember|note|record) (?:this|that)/i,
  /(?:make|take) a note/i,
  /(?:for )?future reference/i,
  /(?:keep|save) (?:this|that) (?:in mind|for later)/i,
  /(?:don't forget|important to remember)/i,
  /(?:store|save) (?:this|that) (?:learning|insight)/i
];
var ANTI_PATTERNS = [
  /\?$/,
  // Questions
  /^(?:can you|could you|please|would you)/i,
  /^(?:try|check|look|see|run|test|fix|change)/i,
  /^(?:wait|stop|hold on|actually)/i
];
function getOpcDir() {
  return process.env.CLAUDE_OPC_DIR || path.join(process.env.HOME || process.env.USERPROFILE || "", "continuous-claude", "opc");
}
function getSmarterStateFilePath(projectDir) {
  return path.join(projectDir, ".claude", "smarter-everyday-state.json");
}
function loadSmarterState(stateFile) {
  if (!fs.existsSync(stateFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  } catch {
    return null;
  }
}
function saveSmarterState(stateFile, state) {
  writeStateWithLock(stateFile, JSON.stringify(state, null, 2));
}
function isResolutionConfirmation(prompt) {
  if (ANTI_PATTERNS.some((p) => p.test(prompt))) {
    return false;
  }
  return RESOLUTION_SIGNALS.some((p) => p.test(prompt));
}
function isMemoryRequest(prompt) {
  return MEMORY_SIGNALS.some((p) => p.test(prompt));
}
async function storeUserConfirmedLearning(sessionId, prompt, context, projectDir) {
  const opcDir = getOpcDir();
  const content = context ? `User confirmed: "${prompt}". Context: ${context}` : `User confirmed: "${prompt}"`;
  const script = "scripts/core/store_learning.py";
  const escapedContent = content.slice(0, 1e3).replace(/"/g, '\\"');
  const cmd = `uv run python ${script} --session-id "${sessionId}" --type USER_PREFERENCE --content "${escapedContent}" --context "user confirmation" --tags "user_confirmed,verified" --confidence high --project-dir "${projectDir}"`;
  try {
    const { execSync } = __require("child_process");
    execSync(cmd, {
      encoding: "utf-8",
      cwd: opcDir,
      timeout: 6e4,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true
    });
    return true;
  } catch {
    return false;
  }
}
async function storeVictoryFromConfirmation(state, prompt, projectDir) {
  const opcDir = getOpcDir();
  const failedApproaches = state.failures.map((f) => f.error).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join("; ");
  const content = `Problem solved after ${state.attempts} attempts (user confirmed: "${prompt}").
File: ${state.tracked_file}
Solution: ${state.last_edit_content || "Final edit"}
${failedApproaches ? `Failed approaches: ${failedApproaches}` : ""}`;
  const script = "scripts/core/store_learning.py";
  const escapedContent = content.slice(0, 2e3).replace(/"/g, '\\"');
  const contextStr = `Victory (user confirmed): ${state.context || state.tracked_file}`;
  const tagsStr = `victory,verified,user_confirmed,attempts:${state.attempts}`;
  const cmd = `uv run python ${script} --session-id "${state.session_id}" --type WORKING_SOLUTION --content "${escapedContent}" --context "${contextStr}" --tags "${tagsStr}" --confidence high --project-dir "${projectDir}"`;
  try {
    const { execSync } = __require("child_process");
    execSync(cmd, {
      encoding: "utf-8",
      cwd: opcDir,
      timeout: 6e4,
      stdio: ["pipe", "pipe", "pipe"],
      shell: true
    });
    return true;
  } catch {
    return false;
  }
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
  const prompt = data.prompt?.trim() || "";
  const sessionId = data.session_id;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (prompt.length < 3) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  let message = null;
  if (isResolutionConfirmation(prompt)) {
    const smarterStateFile = getSmarterStateFilePath(projectDir);
    const smarterState = loadSmarterState(smarterStateFile);
    if (smarterState && smarterState.state === "CANDIDATE") {
      const stored = await storeVictoryFromConfirmation(smarterState, prompt, projectDir);
      if (stored) {
        message = `[UserConfirm:L1] Victory confirmed by user: ${smarterState.tracked_file} (${smarterState.attempts} attempts)`;
        smarterState.state = "IDLE";
        smarterState.tracked_file = null;
        smarterState.attempts = 0;
        smarterState.failures = [];
        smarterState.candidate_turn = null;
        saveSmarterState(smarterStateFile, smarterState);
      }
    } else {
      const stored = await storeUserConfirmedLearning(
        sessionId,
        prompt,
        smarterState?.context || null,
        projectDir
      );
      if (stored) {
        message = "[UserConfirm:L1] User confirmation captured";
      }
    }
  }
  if (isMemoryRequest(prompt)) {
    message = message ? message + " (memory request noted)" : "[UserConfirm:L1] Memory request detected - watching for content to remember";
  }
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
  console.error("user-confirmation-detector error:", err);
  console.log(JSON.stringify({ continue: true }));
});
