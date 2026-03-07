#!/usr/bin/env node

// src/skill-install-registrar.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
var HOME_DIR = process.env.HOME || process.env.USERPROFILE || "";
var SKILLS_DIR = path.join(HOME_DIR, ".claude", "skills");
var SKILL_RULES_PATH = path.join(SKILLS_DIR, "skill-rules.json");
var TRUSTED_PUBLISHERS_PATH = path.join(SKILLS_DIR, "trusted-publishers.json");
var LOCK_FILE_PATH = path.join(HOME_DIR, ".agents", ".skill-lock.json");
var EXTRACT_TRIGGERS_SCRIPT = path.join(SKILLS_DIR, "vet-skill", "scripts", "extract_triggers.py");
var REGISTER_SCRIPT = path.join(SKILLS_DIR, "vet-skill", "scripts", "register_skill.py");
var SKILL_INSTALL_PATTERN = /npx\s+skills?\s+add\b/i;
var SOURCE_EXTRACT_PATTERN = /npx\s+skills?\s+add\s+(?:--[^\s]+\s+)*["']?([^\s"']+)["']?/i;
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 14e3);
  });
}
function emitContinue(message) {
  const output = { result: "continue" };
  if (message) {
    output.message = message;
  }
  console.log(JSON.stringify(output));
}
function extractResponse(toolResponse) {
  if (typeof toolResponse === "string") {
    return toolResponse;
  }
  if (toolResponse && typeof toolResponse === "object") {
    const resp = toolResponse;
    if (typeof resp.output === "string") return resp.output;
    if (typeof resp.stdout === "string") return resp.stdout;
  }
  return JSON.stringify(toolResponse || "");
}
function isFailedExecution(response) {
  if (/exit\s*code[:\s]+[1-9]\d*/i.test(response)) return true;
  if (/ENOENT|EACCES|EPERM/i.test(response)) return true;
  const lines = response.trim().split("\n");
  const tail = lines.slice(-5).join(" ");
  if (/error/i.test(tail) && /failed/i.test(tail)) return true;
  return false;
}
function extractOrg(source) {
  const slashIndex = source.indexOf("/");
  if (slashIndex === -1) return source;
  return source.substring(0, slashIndex);
}
function extractSkillNameHint(source) {
  const atIndex = source.indexOf("@");
  if (atIndex === -1) return null;
  const afterAt = source.substring(atIndex + 1);
  return afterAt.split("/")[0] || null;
}
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function findNewSkills(lockFile, skillRules) {
  const registeredSkills = new Set(Object.keys(skillRules.skills || {}));
  const lockSkills = Object.keys(lockFile.skills || {});
  return lockSkills.filter((name) => !registeredSkills.has(name));
}
function isTrustedPublisher(org, publishers) {
  if (!publishers.publishers || !Array.isArray(publishers.publishers)) return false;
  return publishers.publishers.some(
    (p) => p.org.toLowerCase() === org.toLowerCase()
  );
}
function findSkillMdPath(skillName) {
  const candidates = [
    path.join(SKILLS_DIR, skillName, "SKILL.md"),
    path.join(HOME_DIR, ".agents", "skills", skillName, "SKILL.md"),
    path.join(SKILLS_DIR, skillName, "skill.md")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  const pluginsDir = path.join(HOME_DIR, ".claude", "plugins");
  if (fs.existsSync(pluginsDir)) {
    try {
      for (const pkg of fs.readdirSync(pluginsDir)) {
        const pluginSkillPath = path.join(pluginsDir, pkg, "skills", skillName, "SKILL.md");
        if (fs.existsSync(pluginSkillPath)) {
          return pluginSkillPath;
        }
      }
    } catch {
    }
  }
  return null;
}
function extractDescriptionFromSkillMd(skillMdPath) {
  try {
    const content = fs.readFileSync(skillMdPath, "utf-8");
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const descMatch = frontmatterMatch[1].match(/description:\s*["']?(.+?)["']?\s*$/m);
      if (descMatch) return descMatch[1].trim();
    }
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
        return trimmed.substring(0, 120);
      }
    }
    return "No description available";
  } catch {
    return "No description available";
  }
}
function runExtractTriggers(skillMdPath) {
  if (!fs.existsSync(EXTRACT_TRIGGERS_SCRIPT)) {
    console.error("[skill-install-registrar] extract_triggers.py not found at:", EXTRACT_TRIGGERS_SCRIPT);
    return null;
  }
  try {
    const result = execFileSync("uv", ["run", "python", EXTRACT_TRIGGERS_SCRIPT, "--skill-path", skillMdPath], {
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return JSON.parse(result.trim());
  } catch (err) {
    console.error("[skill-install-registrar] extract_triggers.py failed:", err);
    return null;
  }
}
function runRegisterSkill(skillName, entryJson) {
  if (!fs.existsSync(REGISTER_SCRIPT)) {
    console.error("[skill-install-registrar] register_skill.py not found at:", REGISTER_SCRIPT);
    return false;
  }
  const tempFile = path.join(
    os.tmpdir(),
    `skill-entry-${Date.now()}.json`
  );
  fs.writeFileSync(tempFile, entryJson, "utf-8");
  try {
    execFileSync("uv", [
      "run",
      "python",
      REGISTER_SCRIPT,
      "--rules-path",
      SKILL_RULES_PATH,
      "--skill-name",
      skillName,
      "--entry-file",
      tempFile
    ], {
      encoding: "utf-8",
      timeout: 1e4,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch (err) {
    console.error("[skill-install-registrar] register_skill.py failed:", err);
    return false;
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {
    }
  }
}
function buildSkillEntry(skillName, description, triggers, org) {
  const entry = {
    type: "domain",
    enforcement: "suggest",
    priority: "high",
    description,
    promptTriggers: {
      keywords: triggers.keywords || [],
      intentPatterns: triggers.intentPatterns || []
    },
    source: {
      registry: "skills.sh",
      repo: `${org}/unknown`,
      installedAt: (/* @__PURE__ */ new Date()).toISOString(),
      trustTier: "trusted",
      evalScores: null
    }
  };
  return JSON.stringify(entry);
}
async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    emitContinue();
    return;
  }
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    emitContinue();
    return;
  }
  if (data.tool_name !== "Bash") {
    emitContinue();
    return;
  }
  const command = data.tool_input?.command || "";
  if (!SKILL_INSTALL_PATTERN.test(command)) {
    emitContinue();
    return;
  }
  const response = extractResponse(data.tool_response);
  if (isFailedExecution(response)) {
    console.error("[skill-install-registrar] Skill install command appears to have failed, skipping");
    emitContinue();
    return;
  }
  const sourceMatch = command.match(SOURCE_EXTRACT_PATTERN);
  const source = sourceMatch ? sourceMatch[1] : "";
  const org = source ? extractOrg(source) : "";
  const skillNameHint = source ? extractSkillNameHint(source) : null;
  console.error(`[skill-install-registrar] Detected skill install: source="${source}" org="${org}"`);
  let newSkills = [];
  const lockFile = readJsonFile(LOCK_FILE_PATH);
  const skillRules = readJsonFile(SKILL_RULES_PATH);
  if (lockFile && skillRules) {
    newSkills = findNewSkills(lockFile, skillRules);
  }
  if (newSkills.length === 0 && skillNameHint) {
    newSkills = [skillNameHint];
  }
  if (newSkills.length === 0) {
    console.error("[skill-install-registrar] No new skills detected");
    emitContinue("Skill install detected but no new unregistered skills found.");
    return;
  }
  console.error(`[skill-install-registrar] New skills detected: ${newSkills.join(", ")}`);
  const trustedPublishers = readJsonFile(TRUSTED_PUBLISHERS_PATH);
  const isTrusted = trustedPublishers ? isTrustedPublisher(org, trustedPublishers) : false;
  if (isTrusted) {
    const messages = [];
    const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
    for (const skillName of newSkills) {
      if (!SKILL_NAME_PATTERN.test(skillName)) {
        console.error(`[skill-install-registrar] Invalid skill name: "${skillName}", skipping`);
        continue;
      }
      const skillMdPath = findSkillMdPath(skillName);
      if (!skillMdPath) {
        console.error(`[skill-install-registrar] SKILL.md not found for "${skillName}"`);
        messages.push(`Warning: Could not find SKILL.md for "${skillName}" -- manual registration needed.`);
        continue;
      }
      const triggers = runExtractTriggers(skillMdPath);
      if (!triggers) {
        console.error(`[skill-install-registrar] Failed to extract triggers for "${skillName}"`);
        messages.push(`Warning: Could not extract triggers for "${skillName}" -- run /vet-skill ${skillName} manually.`);
        continue;
      }
      const description = triggers.description || extractDescriptionFromSkillMd(skillMdPath);
      const entryJson = buildSkillEntry(skillName, description, triggers, org);
      const registered = runRegisterSkill(skillName, entryJson);
      if (registered) {
        messages.push(`Trusted skill '${skillName}' registered at tier: trusted (publisher: ${org})`);
        console.error(`[skill-install-registrar] Registered trusted skill: ${skillName}`);
      } else {
        messages.push(`Warning: Failed to register "${skillName}" -- run /vet-skill ${skillName} manually.`);
      }
    }
    emitContinue(messages.join("\n"));
  } else {
    const skillList = newSkills.join(", ");
    const message = `New community skill detected: '${skillList}' from '${org}'. Run /vet-skill ${newSkills[0]} to evaluate trigger accuracy and register it in the routing graph.`;
    console.error(`[skill-install-registrar] Community skill detected, recommending /vet-skill`);
    emitContinue(message);
  }
}
main().catch((err) => {
  console.error("[skill-install-registrar] Error:", err);
  emitContinue();
});
