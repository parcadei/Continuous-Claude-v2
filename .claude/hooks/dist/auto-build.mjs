#!/usr/bin/env node

// src/auto-build.ts
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
var DEBOUNCE_MS = 5e3;
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
function isHookSourceFile(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, "/");
  const repoPath = (process.env.USERPROFILE || process.env.HOME || "") + "/continuous-claude";
  if (normalized.startsWith(repoPath.replace(/\\/g, "/"))) return false;
  return normalized.includes(".claude/hooks/src/") && normalized.endsWith(".ts");
}
function getStateFile(sessionId) {
  return path.join(os.tmpdir(), `claude-auto-build-${sessionId}.json`);
}
function isDebouncePassed(sessionId) {
  let lastBuild = 0;
  try {
    const state = JSON.parse(fs.readFileSync(getStateFile(sessionId), "utf-8"));
    lastBuild = state.lastBuild || 0;
  } catch {
  }
  return Date.now() - lastBuild >= DEBOUNCE_MS;
}
function updateDebounceState(sessionId) {
  try {
    fs.writeFileSync(getStateFile(sessionId), JSON.stringify({ lastBuild: Date.now() }));
  } catch {
  }
}
function triggerBuild() {
  const hooksDir = path.join(os.homedir(), ".claude", "hooks");
  const logFile = fs.openSync(path.join(os.tmpdir(), "claude-auto-build.log"), "a");
  const child = spawn("npm run build", {
    cwd: hooksDir,
    detached: true,
    stdio: ["ignore", "ignore", logFile],
    shell: true
  });
  child.unref();
}
async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.log(JSON.stringify({}));
    return;
  }
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({}));
    return;
  }
  if (data.tool_name !== "Write" && data.tool_name !== "Edit") {
    console.log(JSON.stringify({}));
    return;
  }
  const filePath = data.tool_input?.file_path || "";
  if (!isHookSourceFile(filePath)) {
    console.log(JSON.stringify({}));
    return;
  }
  const sessionId = data.session_id || "default";
  if (!isDebouncePassed(sessionId)) {
    console.log(JSON.stringify({}));
    return;
  }
  updateDebounceState(sessionId);
  triggerBuild();
  const fileName = path.basename(filePath);
  console.error(`[auto-build] Triggered by ${fileName}`);
  console.log(JSON.stringify({}));
}
main().catch((err) => {
  console.error("[auto-build] Error:", err.message);
  console.log(JSON.stringify({}));
});
