// src/hook-health-monitor.ts
import * as fs from "fs";
import * as path from "path";
function parseHookCommands(settings) {
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== "object") {
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const [eventName, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!group.hooks || !Array.isArray(group.hooks)) continue;
      for (const hook of group.hooks) {
        if (hook.type !== "command" || !hook.command) continue;
        const distPath = extractDistPath(hook.command);
        if (!distPath) continue;
        if (seen.has(distPath)) continue;
        seen.add(distPath);
        const hookName = path.basename(distPath, ".mjs");
        const srcPath = deriveSrcPath(distPath);
        results.push({
          distPath,
          srcPath,
          hookEvent: eventName,
          hookName,
          matcher: group.matcher
        });
      }
    }
  }
  return results;
}
function extractDistPath(command) {
  const match = command.match(/^node\s+(.+\.mjs)\s*$/);
  if (!match) return null;
  const filePath = match[1].trim();
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.includes("hooks/dist/")) return null;
  return filePath;
}
function deriveSrcPath(distPath) {
  const normalized = distPath.replace(/\\/g, "/");
  const srcPath = normalized.replace("/hooks/dist/", "/hooks/src/").replace(/\.mjs$/, ".ts");
  return srcPath;
}
function checkHookHealth(hookInfo) {
  const { distPath, srcPath, hookEvent, hookName } = hookInfo;
  if (!fs.existsSync(distPath)) {
    return { hookName, status: "missing", hookEvent };
  }
  if (!fs.existsSync(srcPath)) {
    return { hookName, status: "healthy", hookEvent };
  }
  const distMtime = fs.statSync(distPath).mtime.getTime();
  const srcMtime = fs.statSync(srcPath).mtime.getTime();
  if (srcMtime > distMtime) {
    return { hookName, status: "stale", hookEvent };
  }
  return { hookName, status: "healthy", hookEvent };
}
function formatHealthReport(results) {
  if (results.length === 0) {
    return "Hook Health: No hooks registered";
  }
  const healthy = results.filter((r) => r.status === "healthy");
  const issues = results.filter((r) => r.status !== "healthy");
  if (issues.length === 0) {
    return `Hook Health: All ${results.length} hooks healthy`;
  }
  const lines = [];
  const issueWord = issues.length === 1 ? "issue" : "issues";
  lines.push(`Hook Health: ${healthy.length}/${results.length} healthy, ${issues.length} ${issueWord} found`);
  for (const issue of issues) {
    if (issue.status === "missing") {
      lines.push(`- MISSING: ${issue.hookName}.mjs (fix: npm run build)`);
    } else if (issue.status === "stale") {
      lines.push(`- STALE: ${issue.hookName}.mjs (src newer than dist, fix: npm run build)`);
    }
  }
  return lines.join("\n");
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
async function main() {
  let input;
  try {
    const stdin = await readStdin();
    input = stdin ? JSON.parse(stdin) : { session_id: "unknown" };
  } catch {
    input = { session_id: "unknown" };
  }
  try {
    const userProfile = process.env.USERPROFILE || process.env.HOME || "";
    const settingsPath = path.join(userProfile, ".claude", "settings.json");
    if (!fs.existsSync(settingsPath)) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    let settings;
    try {
      const content = fs.readFileSync(settingsPath, "utf-8");
      settings = JSON.parse(content);
    } catch {
      console.error("hook-health-monitor: Could not parse settings.json");
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const hookFiles = parseHookCommands(settings);
    if (hookFiles.length === 0) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const results = hookFiles.map((hf) => checkHookHealth(hf));
    const report = formatHealthReport(results);
    const hasIssues = results.some((r) => r.status !== "healthy");
    const output = { result: "continue" };
    if (hasIssues) {
      output.hookSpecificOutput = {
        hookEventName: "SessionStart",
        additionalContext: report
      };
      console.error(report);
    } else {
      console.error(`Hook Health: All ${results.length} hooks healthy`);
    }
    console.log(JSON.stringify(output));
  } catch (err) {
    console.error(`hook-health-monitor error: ${err}`);
    console.log(JSON.stringify({ result: "continue" }));
  }
}
main().catch((err) => {
  console.error(err);
  console.log(JSON.stringify({ result: "continue" }));
});
export {
  checkHookHealth,
  formatHealthReport,
  parseHookCommands
};
