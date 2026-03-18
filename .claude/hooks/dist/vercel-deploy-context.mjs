// src/vercel-deploy-context.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
var GIT_PUSH_PATTERN = /(?:^|&&\s*|;\s*)git\s+push(?:\s|$)/;
function isGitPush(command) {
  if (typeof command !== "string" || command.length === 0) return false;
  return GIT_PUSH_PATTERN.test(command);
}
function isVercelProject(dir) {
  if (typeof dir !== "string" || dir.length === 0) return false;
  try {
    return existsSync(join(dir, ".vercel", "project.json"));
  } catch {
    return false;
  }
}
function buildDeployContext() {
  return `[Vercel Deploy Context]
Git push detected in Vercel-linked project. Deployment is now in progress.

Monitor deployment:
- Check status: mcp__claude_ai_Vercel__list_deployments (teamId from .vercel/project.json)
- Build logs: mcp__claude_ai_Vercel__get_deployment_build_logs
- Runtime logs: mcp__claude_ai_Vercel__get_runtime_logs

Review feedback:
- Toolbar threads: mcp__claude_ai_Vercel__list_toolbar_threads

For operations (env vars, promote, rollback): use Vercel CLI via /vercel-cli skill.`;
}
function handleBashPostToolUse(input, cwd) {
  try {
    if (!input || typeof input !== "object") return null;
    if (input.tool_name !== "Bash") return null;
    const command = input.tool_input?.command;
    if (!isGitPush(command)) return null;
    const projectDir = cwd || process.cwd();
    if (!isVercelProject(projectDir)) return null;
    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: buildDeployContext()
      }
    };
  } catch {
    return null;
  }
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    console.log("{}");
    return;
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log("{}");
    return;
  }
  const result = handleBashPostToolUse(input);
  if (result) {
    console.log(JSON.stringify(result));
  } else {
    console.log("{}");
  }
}
if (!process.env.VITEST) {
  main().catch(() => {
    console.log("{}");
  });
}
export {
  buildDeployContext,
  handleBashPostToolUse,
  isGitPush,
  isVercelProject
};
