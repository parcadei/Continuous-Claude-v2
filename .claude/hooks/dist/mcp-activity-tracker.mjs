#!/usr/bin/env node

// src/mcp-activity-tracker.ts
import { readFileSync as readFileSync2 } from "fs";

// src/shared/session-activity.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE || "/tmp";
}
function getActivityPath(sessionId) {
  const dir = join(getHomeDir(), ".claude", "cache", "session-activity");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
  }
  return join(dir, `${sessionId}.json`);
}
function readActivity(sessionId) {
  const filePath = getActivityPath(sessionId);
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const raw = readFileSync(filePath, "utf-8");
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
function logMcpServer(sessionId, serverName) {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.mcp_servers, serverName);
  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: "utf-8" });
}

// src/mcp-activity-tracker.ts
async function main() {
  try {
    const input = JSON.parse(readFileSync2(0, "utf-8"));
    const toolName = input.tool_name || "";
    if (!toolName.startsWith("mcp__")) {
      process.exit(0);
    }
    const parts = toolName.split("__");
    if (parts.length >= 3 && input.session_id) {
      try {
        logMcpServer(input.session_id, parts[1]);
      } catch {
      }
    }
    process.exit(0);
  } catch {
    process.exit(0);
  }
}
main();
