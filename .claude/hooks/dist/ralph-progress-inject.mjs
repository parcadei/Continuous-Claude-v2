#!/usr/bin/env node

// src/ralph-progress-inject.ts
import { readFileSync as readFileSync2 } from "fs";

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

// src/ralph-progress-inject.ts
var log2 = createLogger("ralph-progress");
function readStdin() {
  try {
    return readFileSync2(0, "utf-8");
  } catch {
    return "{}";
  }
}
function makeProgressBar(done, total, width = 20) {
  if (total === 0) return "[" + "-".repeat(width) + "]";
  const filled = Math.round(done / total * width);
  const empty = width - filled;
  return "[" + "=".repeat(filled) + "-".repeat(empty) + "]";
}
function timeAgo(isoString) {
  if (!isoString) return "never";
  const elapsed = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(elapsed / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
async function main() {
  const start = Date.now();
  let input = {};
  try {
    input = JSON.parse(readStdin());
  } catch {
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const unified = readRalphUnifiedState(projectDir);
  if (!unified?.session?.active) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const tasks = Array.isArray(unified.tasks) ? unified.tasks : Object.values(unified.tasks || {});
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "complete" || t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const pct = total > 0 ? Math.round(completed / total * 100) : 0;
  const retryCount = (unified.retry_queue || []).length;
  const checkpoints = unified.checkpoints || [];
  const lastCheckpoint = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;
  const lastCommitTime = lastCheckpoint ? timeAgo(lastCheckpoint.timestamp || null) : "none";
  const bar = makeProgressBar(completed, total);
  const parts = [
    `RALPH: ${unified.story_id} ${bar} ${completed}/${total} (${pct}%)`
  ];
  if (inProgress > 0) parts.push(`active: ${inProgress}`);
  if (failed > 0) parts.push(`failed: ${failed}`);
  if (retryCount > 0) parts.push(`retry: ${retryCount}`);
  parts.push(`commit: ${lastCommitTime}`);
  const message = parts.join(" | ");
  const elapsed = Date.now() - start;
  if (elapsed > 100) {
    log2.warn("Progress injection slow", { elapsed });
  }
  console.log(JSON.stringify({ result: "continue", message }));
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
});
