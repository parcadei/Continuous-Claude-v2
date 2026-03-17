#!/usr/bin/env node

// src/telemetry-tracker.ts
import { readFileSync as readFileSync2, appendFileSync, existsSync as existsSync2, mkdirSync as mkdirSync2 } from "fs";
import { join as join2 } from "path";

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
function logSkill(sessionId, skillName) {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.skills, skillName);
  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: "utf-8" });
}
function logAgent(sessionId, agentType) {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.agents, agentType);
  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: "utf-8" });
}

// src/telemetry-tracker.ts
function getTelemetryPath() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const telemetryDir = join2(homeDir, ".claude", "cache");
  if (!existsSync2(telemetryDir)) {
    mkdirSync2(telemetryDir, { recursive: true });
  }
  return join2(telemetryDir, "skill-telemetry.jsonl");
}
function logEvent(event) {
  const telemetryPath = getTelemetryPath();
  const line = JSON.stringify(event) + "\n";
  appendFileSync(telemetryPath, line, "utf-8");
}
function determineSource(toolInput) {
  const skill = toolInput.skill || "";
  if (skill.startsWith("/")) {
    return "explicit";
  }
  return "llm";
}
async function main() {
  try {
    const input = readFileSync2(0, "utf-8");
    const data = JSON.parse(input);
    if (data.tool_name === "Skill") {
      const skillName = data.tool_input?.skill || "unknown";
      const success = data.tool_response?.status !== "error";
      const event = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        session_id: data.session_id,
        type: "skill_used",
        name: skillName,
        trigger_source: determineSource(data.tool_input),
        success
      };
      logEvent(event);
      try {
        logSkill(data.session_id, skillName);
      } catch {
      }
    } else if (data.tool_name === "Task") {
      const agentType = data.tool_input?.subagent_type || "unknown";
      const success = data.tool_response?.status !== "error";
      const event = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        session_id: data.session_id,
        type: "agent_spawned",
        name: agentType,
        trigger_source: "llm",
        success
      };
      logEvent(event);
      try {
        logAgent(data.session_id, agentType);
      } catch {
      }
    }
    process.exit(0);
  } catch {
    process.exit(0);
  }
}
main();
