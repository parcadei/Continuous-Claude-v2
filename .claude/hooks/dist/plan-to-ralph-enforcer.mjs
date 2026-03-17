#!/usr/bin/env node

// src/plan-to-ralph-enforcer.ts
import { readFileSync as readFileSync4 } from "fs";

// src/shared/session-isolation.ts
import { tmpdir, hostname } from "os";
import { join } from "path";
import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
function getSessionId() {
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }
  const host = hostname().replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);
  return `${host}-${process.pid}`;
}
function getSessionStatePath(baseName, sessionId) {
  const sid = sessionId || getSessionId();
  const safeSid = sid.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 32);
  return join(tmpdir(), `claude-${baseName}-${safeSid}.json`);
}
function getLegacyStatePath(baseName) {
  return join(tmpdir(), `claude-${baseName}.json`);
}
function getStatePathWithMigration(baseName, sessionId) {
  const sessionPath = getSessionStatePath(baseName, sessionId);
  const legacyPath = getLegacyStatePath(baseName);
  if (existsSync(sessionPath)) {
    return sessionPath;
  }
  if (existsSync(legacyPath)) {
    try {
      const stat = statSync(legacyPath);
      const oneHourAgo = Date.now() - 60 * 60 * 1e3;
      if (stat.mtimeMs > oneHourAgo) {
        return legacyPath;
      }
    } catch {
    }
  }
  return sessionPath;
}

// src/shared/atomic-write.ts
import {
  writeFileSync,
  renameSync as renameSync2,
  unlinkSync as unlinkSync2,
  existsSync as existsSync3,
  openSync,
  closeSync,
  readFileSync,
  statSync as statSync3,
  constants
} from "fs";

// src/shared/logger.ts
import { appendFileSync, existsSync as existsSync2, mkdirSync, statSync as statSync2, renameSync } from "fs";
import { join as join2 } from "path";
import { homedir } from "os";
var LOG_DIR = join2(homedir(), ".claude", "logs");
var LOG_FILE = join2(LOG_DIR, "hooks.log");
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
  if (!existsSync2(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}
function rotateIfNeeded() {
  try {
    if (existsSync2(LOG_FILE)) {
      const stat = statSync2(LOG_FILE);
      if (stat.size > MAX_LOG_SIZE) {
        const rotated = LOG_FILE + ".1";
        renameSync(LOG_FILE, rotated);
      }
    }
  } catch {
  }
}
function getSessionId2() {
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
  function log4(level, msg, data) {
    if (!shouldLog(level)) return;
    const entry = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hook: hookName,
      msg,
      sessionId: getSessionId2()
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
    debug: (msg, data) => log4("debug", msg, data),
    info: (msg, data) => log4("info", msg, data),
    warn: (msg, data) => log4("warn", msg, data),
    error: (msg, data) => log4("error", msg, data)
  };
}

// src/shared/atomic-write.ts
var log = createLogger("atomic-write");
var LOCK_STALE_MS = 1e4;
var LOCK_RETRY_MS = 50;
var LOCK_TIMEOUT_MS = 5e3;
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
          const stat = statSync3(lockFile);
          if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
            log.warn("Removing stale lock", { lockFile, ageMs: Date.now() - stat.mtimeMs });
            unlinkSync2(lockFile);
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
    if (existsSync3(lockFile)) {
      unlinkSync2(lockFile);
    }
  } catch (err) {
    log.warn("Failed to release lock", { lockFile, error: String(err) });
  }
}
function readStateWithLock(filePath) {
  if (!existsSync3(filePath)) return null;
  const locked = acquireLockSync(filePath, 2e3);
  try {
    return readFileSync(filePath, "utf-8");
  } catch (err) {
    log.error("State read failed", { filePath, error: String(err) });
    return null;
  } finally {
    if (locked) {
      releaseLockSync(filePath);
    }
  }
}

// src/shared/state-schema.ts
import { existsSync as existsSync4, readFileSync as readFileSync2 } from "fs";
import { join as join3 } from "path";
var log2 = createLogger("state-schema");
function readRalphUnifiedState(projectDir) {
  const dir = projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statePath = join3(dir, ".ralph", "state.json");
  if (!existsSync4(statePath)) return null;
  try {
    const content = readFileSync2(statePath, "utf-8");
    const state = JSON.parse(content);
    if (!state.version || !state.version.startsWith("2.")) {
      log2.warn("Ralph unified state version mismatch (expected 2.x) \u2014 returning null", {
        version: state.version,
        statePath: join3(dir, ".ralph", "state.json")
      });
      return null;
    }
    return state;
  } catch (err) {
    log2.warn("Failed to read Ralph unified state", { error: String(err) });
    return null;
  }
}
function isRalphActive(projectDir) {
  const unified = readRalphUnifiedState(projectDir);
  if (unified?.session?.active) {
    return { active: true, storyId: unified.story_id, source: "unified" };
  }
  return { active: false, storyId: "", source: "none" };
}

// src/shared/session-activity.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "fs";
import { join as join4 } from "path";
function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE || "/tmp";
}
function getActivityPath(sessionId) {
  const dir = join4(getHomeDir(), ".claude", "cache", "session-activity");
  try {
    mkdirSync2(dir, { recursive: true });
  } catch {
  }
  return join4(dir, `${sessionId}.json`);
}
function readActivity(sessionId) {
  const filePath = getActivityPath(sessionId);
  try {
    if (!existsSync5(filePath)) {
      return null;
    }
    const raw = readFileSync3(filePath, "utf-8");
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function loadOrCreate(sessionId) {
  const existing = readActivity(sessionId);
  if (existing) {
    if (!existing.agents) existing.agents = [];
    if (!existing.mcp_servers) existing.mcp_servers = [];
    return existing;
  }
  return {
    session_id: sessionId,
    started_at: (/* @__PURE__ */ new Date()).toISOString(),
    skills: [],
    hooks: [],
    agents: [],
    mcp_servers: []
  };
}
function upsertEntry(entries, name) {
  const existing = entries.find((e) => e.name === name);
  if (existing) {
    existing.count++;
  } else {
    entries.push({
      name,
      first_seen: (/* @__PURE__ */ new Date()).toISOString(),
      count: 1
    });
  }
}
function logHook(sessionId, hookName) {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.hooks, hookName);
  const filePath = getActivityPath(sessionId);
  writeFileSync2(filePath, JSON.stringify(activity), { encoding: "utf-8" });
}

// src/shared/file-classification.ts
function isCodeFile(filePath) {
  const codeExtensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".pyi",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".scala",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".rb",
    ".php",
    ".swift",
    ".vue",
    ".svelte"
  ];
  return codeExtensions.some((ext) => filePath.endsWith(ext));
}
function isAllowedConfigFile(filePath) {
  const configPatterns = [
    /\.ralph\//,
    /IMPLEMENTATION_PLAN\.md$/,
    /tasks\/.*\.md$/,
    /\.json$/,
    /\.yaml$/,
    /\.yml$/,
    /\.env/,
    /\.gitignore$/,
    /package\.json$/,
    /tsconfig\.json$/,
    /\.md$/
  ];
  return configPatterns.some((p) => p.test(filePath));
}

// src/plan-to-ralph-enforcer.ts
var log3 = createLogger("plan-to-ralph-enforcer");
function decidePlanEnforcement(params) {
  const { planApproved, ralphActive, filePath } = params;
  if (!planApproved) {
    return { block: false };
  }
  if (ralphActive) {
    return { block: false };
  }
  if (isAllowedConfigFile(filePath)) {
    return { block: false };
  }
  if (isCodeFile(filePath)) {
    return {
      block: true,
      reason: "Plan approved -- direct code edits are blocked. Use /ralph to delegate implementation to agents."
    };
  }
  return { block: false };
}
function makeBlockOutput(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  };
  console.log(JSON.stringify(output));
}
function makeAllowOutput() {
  console.log(JSON.stringify({}));
}
async function main() {
  try {
    const rawInput = readFileSync4(0, "utf-8");
    if (!rawInput.trim()) {
      makeAllowOutput();
      return;
    }
    let input;
    try {
      input = JSON.parse(rawInput);
    } catch {
      makeAllowOutput();
      return;
    }
    if (input.tool_name !== "Edit" && input.tool_name !== "Write") {
      makeAllowOutput();
      return;
    }
    const sessionId = input.session_id || "";
    const filePath = input.tool_input?.file_path || "";
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    let planApproved = false;
    try {
      const statePath = getStatePathWithMigration("plan-approved", sessionId);
      const content = readStateWithLock(statePath);
      if (content) {
        const state = JSON.parse(content);
        planApproved = state?.approved === true;
      }
    } catch {
      planApproved = false;
    }
    let ralphActive = false;
    if (planApproved) {
      try {
        const ralphStatus = isRalphActive(projectDir);
        ralphActive = ralphStatus.active;
      } catch {
        ralphActive = false;
      }
    }
    const result = decidePlanEnforcement({
      sessionId,
      toolName: input.tool_name,
      filePath,
      planApproved,
      ralphActive
    });
    if (result.block && result.reason) {
      log3.info(`Blocking ${input.tool_name} on ${filePath}: plan approved, Ralph not active`, { sessionId });
      try {
        logHook(sessionId, "plan-to-ralph-enforcer");
      } catch {
      }
      makeBlockOutput(result.reason);
    } else {
      makeAllowOutput();
    }
  } catch (err) {
    log3.error(`Unexpected error, failing open`, { error: String(err) });
    makeAllowOutput();
  }
}
if (!process.env.VITEST) {
  main();
}
export {
  decidePlanEnforcement
};
