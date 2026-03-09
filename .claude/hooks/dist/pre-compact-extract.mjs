#!/usr/bin/env node

// src/pre-compact-extract.ts
import { spawn } from "child_process";
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

// src/pre-compact-extract.ts
function getOpcDir() {
  return process.env.CLAUDE_OPC_DIR || path.join(process.env.HOME || process.env.USERPROFILE || "", "continuous-claude", "opc");
}
function getStateFilePath(projectDir) {
  return path.join(projectDir, ".claude", "extraction-state.json");
}
function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) {
    return { last_extracted_line: 0, recent_hashes: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    return {
      last_extracted_line: data.last_extracted_line || 0,
      recent_hashes: data.recent_hashes || []
    };
  } catch {
    return { last_extracted_line: 0, recent_hashes: [] };
  }
}
function runBackgroundExtraction(transcriptPath, sessionId, startLine, stateFile, projectDir) {
  const opcDir = getOpcDir();
  const extractScript = path.join(opcDir, "scripts", "core", "incremental_extract.py");
  if (!fs.existsSync(extractScript)) {
    console.error(`incremental_extract.py not found at ${extractScript}`);
    return false;
  }
  try {
    const child = spawn("uv", [
      "run",
      "python",
      "scripts/core/incremental_extract.py",
      "--transcript",
      transcriptPath,
      "--session-id",
      sessionId,
      "--start-line",
      startLine.toString(),
      "--state-file",
      stateFile,
      "--project-dir",
      projectDir,
      "--max-learnings",
      "5",
      "--json"
    ], {
      cwd: opcDir,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, PYTHONPATH: opcDir }
    });
    child.unref();
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
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const sessionId = data.session_id;
  const transcriptPath = data.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    const output2 = {
      continue: true,
      systemMessage: "[PreCompact] No transcript available for extraction"
    };
    console.log(JSON.stringify(output2));
    return;
  }
  const stateFile = getStateFilePath(projectDir);
  const state = loadState(stateFile);
  const COOLDOWN_MS = 5 * 60 * 1e3;
  const stateWithMeta = state;
  if (stateWithMeta.last_launched && Date.now() - stateWithMeta.last_launched < COOLDOWN_MS) {
    console.log(JSON.stringify({ continue: true, systemMessage: "[PreCompact:L0] Cooldown active, skipping extraction" }));
    return;
  }
  try {
    const stateData = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf-8")) : {};
    stateData.last_launched = Date.now();
    writeStateWithLock(stateFile, JSON.stringify(stateData, null, 2));
  } catch {
  }
  const launched = runBackgroundExtraction(
    transcriptPath,
    sessionId,
    state.last_extracted_line,
    stateFile,
    projectDir
  );
  const message = launched ? "[PreCompact:L0] Memory extraction launched (background)" : "[PreCompact:L0] Memory extraction unavailable";
  const output = {
    continue: true,
    systemMessage: message
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
  console.error("pre-compact-extract error:", err);
  console.log(JSON.stringify({ continue: true }));
});
