// src/mcp-directory-guard.ts
import { readFileSync } from "fs";

// src/shared/opc-path.ts
import { existsSync } from "fs";
import { join } from "path";
function getOpcDir() {
  const envOpcDir = process.env.CLAUDE_OPC_DIR;
  if (envOpcDir && existsSync(envOpcDir)) {
    return envOpcDir;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const localOpc = join(projectDir, "opc");
  if (existsSync(localOpc)) {
    return localOpc;
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (homeDir) {
    const globalClaude = join(homeDir, ".claude");
    const globalScripts = join(globalClaude, "scripts", "core");
    if (existsSync(globalScripts)) {
      return globalClaude;
    }
  }
  return null;
}

// src/mcp-directory-guard.ts
var SCRIPT_PATH_PATTERN = /\bscripts\/(mcp|core)\//;
function buildCdPrefixPattern(opcDir) {
  const escapedDir = opcDir ? opcDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
  const variants = [
    "\\$CLAUDE_OPC_DIR",
    "\\$\\{CLAUDE_OPC_DIR\\}"
  ];
  if (escapedDir) {
    variants.push(escapedDir);
  }
  return new RegExp(`^\\s*cd\\s+(${variants.join("|")})\\s*&&`);
}
function main() {
  let input;
  try {
    const stdinContent = readFileSync(0, "utf-8");
    input = JSON.parse(stdinContent);
  } catch {
    console.log("{}");
    return;
  }
  if (input.tool_name !== "Bash") {
    console.log("{}");
    return;
  }
  const command = input.tool_input?.command;
  if (!command) {
    console.log("{}");
    return;
  }
  if (!SCRIPT_PATH_PATTERN.test(command)) {
    console.log("{}");
    return;
  }
  const opcDir = getOpcDir();
  const cdPrefix = buildCdPrefixPattern(opcDir);
  if (cdPrefix.test(command)) {
    console.log("{}");
    return;
  }
  const dirRef = opcDir || "$CLAUDE_OPC_DIR";
  const corrected = `cd ${dirRef} && ${command.trimStart()}`;
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `OPC directory guard: commands referencing scripts/(mcp|core)/ must run from the OPC directory so uv can find pyproject.toml.

Blocked command:
  ${command.trim()}

Corrected command:
  ${corrected}`
    }
  };
  console.log(JSON.stringify(output));
}
main();
