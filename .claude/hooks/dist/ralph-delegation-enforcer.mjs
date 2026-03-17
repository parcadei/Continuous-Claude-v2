#!/usr/bin/env node

// src/ralph-delegation-enforcer.ts
import { readFileSync as readFileSync3, existsSync as existsSync5, statSync as statSync3 } from "fs";
import { join as join5 } from "path";
import { spawnSync } from "child_process";

// src/shared/session-isolation.ts
import { tmpdir, hostname } from "os";
import { join } from "path";
import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
function cleanupOldStateFiles(baseName, maxAgeMs = 24 * 60 * 60 * 1e3) {
  const tmpDir = tmpdir();
  const pattern = new RegExp(`^claude-${baseName}-.*\\.json$`);
  let cleaned = 0;
  try {
    const files = readdirSync(tmpDir);
    const now = Date.now();
    for (const file of files) {
      if (!pattern.test(file)) continue;
      const fullPath = join(tmpDir, file);
      try {
        const stat = statSync(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          unlinkSync(fullPath);
          cleaned++;
        }
      } catch {
      }
    }
  } catch {
  }
  return cleaned;
}

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
import { existsSync as existsSync3, readFileSync } from "fs";
import { join as join3 } from "path";
var log = createLogger("state-schema");
function readRalphUnifiedState(projectDir) {
  const dir = projectDir || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const statePath = join3(dir, ".ralph", "state.json");
  if (!existsSync3(statePath)) return null;
  try {
    const content = readFileSync(statePath, "utf-8");
    const state = JSON.parse(content);
    if (!state.version || !state.version.startsWith("2.")) {
      log.warn("Ralph unified state version mismatch (expected 2.x) \u2014 returning null", {
        version: state.version,
        statePath: join3(dir, ".ralph", "state.json")
      });
      return null;
    }
    return state;
  } catch (err) {
    log.warn("Failed to read Ralph unified state", { error: String(err) });
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
import { existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync2, writeFileSync } from "fs";
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
    if (!existsSync4(filePath)) {
      return null;
    }
    const raw = readFileSync2(filePath, "utf-8");
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
  writeFileSync(filePath, JSON.stringify(activity), { encoding: "utf-8" });
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

// src/ralph-delegation-enforcer.ts
var log2 = createLogger("ralph-delegation-enforcer");
var STATE_BASE_NAME = "ralph-state";
function readStdin() {
  return readFileSync3(0, "utf-8");
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
function isTestCommand(command) {
  const testPatterns = [
    /\bnpm\s+(run\s+)?test/i,
    /\byarn\s+test/i,
    /\bpnpm\s+test/i,
    /\bpytest\b/i,
    /\bgo\s+test\b/i,
    /\bcargo\s+test\b/i,
    /\bjest\b/i,
    /\bvitest\b/i,
    /\bmocha\b/i,
    /\bnpm\s+run\s+lint/i,
    /\bnpm\s+run\s+typecheck/i,
    /\btsc\s+--noEmit/i,
    /\bruff\s+check/i,
    /\bmypy\b/i,
    /\bgolangci-lint/i
  ];
  return testPatterns.some((p) => p.test(command));
}
async function main() {
  try {
    if (Math.random() < 0.01) {
      cleanupOldStateFiles(STATE_BASE_NAME);
    }
    const rawInput = readStdin();
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
    const sessionId = input.session_id;
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const ralphStatus = isRalphActive(projectDir);
    if (!ralphStatus.active) {
      makeAllowOutput();
      return;
    }
    const storyId = ralphStatus.storyId;
    if (ralphStatus.source === "unified") {
      try {
        const statePath = join5(projectDir, ".ralph", "state.json");
        const stMtime = existsSync5(statePath) ? statSync3(statePath).mtimeMs : 0;
        const HEARTBEAT_INTERVAL = 5 * 60 * 1e3;
        if (Date.now() - stMtime > HEARTBEAT_INTERVAL) {
          const homeDir = process.env.HOME || process.env.USERPROFILE || "";
          const v2Script = join5(homeDir, ".claude", "scripts", "ralph", "ralph-state-v2.py");
          if (existsSync5(v2Script)) {
            spawnSync("python", [v2Script, "-p", projectDir, "session-heartbeat"], {
              encoding: "utf-8",
              timeout: 3e3
            });
          }
        }
      } catch {
      }
    }
    log2.info(`Enforcing delegation: tool=${input.tool_name}`, { storyId, sessionId, source: ralphStatus.source });
    try {
      logHook(sessionId || "", "ralph-delegation-enforcer");
    } catch {
    }
    if (input.tool_name === "Edit") {
      const filePath = input.tool_input.file_path || "";
      if (isAllowedConfigFile(filePath)) {
        makeAllowOutput();
        return;
      }
      if (isCodeFile(filePath)) {
        makeBlockOutput(`
\u{1F6D1} RALPH DELEGATION ENFORCER

Ralph mode is active. Direct code edits are BLOCKED.

**BLOCKED:** Edit on ${filePath}

**INSTEAD:** Delegate to an agent:
\`\`\`
Task(subagent_type: kraken, prompt: |
  Story: ${storyId}
  Task: <what you want to change>
  File: ${filePath}
  ...
)
\`\`\`

Or for quick fixes (<20 lines):
\`\`\`
Task(subagent_type: spark, prompt: ...)
\`\`\`

Ralph orchestrates, agents implement.
`);
        return;
      }
      makeAllowOutput();
      return;
    }
    if (input.tool_name === "Write") {
      const filePath = input.tool_input.file_path || "";
      if (isAllowedConfigFile(filePath)) {
        makeAllowOutput();
        return;
      }
      if (isCodeFile(filePath)) {
        makeBlockOutput(`
\u{1F6D1} RALPH DELEGATION ENFORCER

Ralph mode is active. Direct code writes are BLOCKED.

**BLOCKED:** Write to ${filePath}

**INSTEAD:** Delegate to an agent:
\`\`\`
Task(subagent_type: kraken, prompt: |
  Story: ${storyId}
  Task: Create new file ${filePath}
  Requirements: ...
)
\`\`\`

Ralph orchestrates, agents implement.
`);
        return;
      }
      makeAllowOutput();
      return;
    }
    if (input.tool_name === "Bash") {
      const command = input.tool_input.command || "";
      if (isTestCommand(command)) {
        makeBlockOutput(`
\u{1F6D1} RALPH DELEGATION ENFORCER

Ralph mode is active. Direct test/lint commands are BLOCKED.

**BLOCKED:** ${command}

**INSTEAD:** Delegate to arbiter:
\`\`\`
Task(subagent_type: arbiter, prompt: |
  Story: ${storyId}
  Task: Run tests and verify implementation
  Files: <affected files>
)
\`\`\`

Ralph orchestrates, agents test.
`);
        return;
      }
      makeAllowOutput();
      return;
    }
    makeAllowOutput();
  } catch (err) {
    makeAllowOutput();
  }
}
main();
