// src/sentry-deploy-release.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
var DEPLOY_PATTERN = /(?:^|&&\s*|;\s*)(?:vercel\s+(?:--prod|deploy|promote)|railway\s+(?:up|redeploy))(?:\s|$)/;
function isDeployCommand(command) {
  if (typeof command !== "string" || command.length === 0) return false;
  return DEPLOY_PATTERN.test(command);
}
function hasSentryInProject(dir) {
  if (typeof dir !== "string" || dir.length === 0) return false;
  try {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const content = readFileSync(pkgPath, "utf-8");
      if (content.includes("@sentry/")) return true;
    }
    const reqPath = join(dir, "requirements.txt");
    if (existsSync(reqPath)) {
      const content = readFileSync(reqPath, "utf-8");
      if (content.includes("sentry-sdk")) return true;
    }
    const pyprojectPath = join(dir, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, "utf-8");
      if (content.includes("sentry-sdk")) return true;
    }
    return false;
  } catch {
    return false;
  }
}
function buildReleaseContext() {
  return `[Sentry Release] Deploy detected. Create a release to track errors:
  sentry-cli releases new $(git rev-parse HEAD)
  sentry-cli releases set-commits $(git rev-parse HEAD) --auto
  sentry-cli deploys new -e production -r $(git rev-parse HEAD)
  sentry-cli releases finalize $(git rev-parse HEAD)

Check for post-deploy errors:
  sentry-cli issues list --query "firstSeen:>now-5m"`;
}
function handleDeployPostToolUse(input, cwd) {
  try {
    if (!input || typeof input !== "object") return null;
    if (input.tool_name !== "Bash") return null;
    const command = input.tool_input?.command;
    if (!isDeployCommand(command)) return null;
    const projectDir = cwd || process.cwd();
    if (!hasSentryInProject(projectDir)) return null;
    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: buildReleaseContext()
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
  const result = handleDeployPostToolUse(input);
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
  buildReleaseContext,
  handleDeployPostToolUse,
  hasSentryInProject,
  isDeployCommand
};
