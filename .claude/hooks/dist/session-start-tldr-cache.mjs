// src/session-start-tldr-cache.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
function readStdin() {
  return readFileSync(0, "utf-8");
}
function getCacheAge(projectDir) {
  const metaPath = join(projectDir, ".claude", "cache", "tldr", "meta.json");
  if (!existsSync(metaPath)) return void 0;
  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const cachedAt = new Date(meta.cached_at);
    return Math.round((Date.now() - cachedAt.getTime()) / (1e3 * 60 * 60));
  } catch {
    return void 0;
  }
}
function isCacheStale(projectDir) {
  const cacheDir = join(projectDir, ".claude", "cache", "tldr");
  if (!existsSync(cacheDir)) return true;
  const age = getCacheAge(projectDir);
  return age === void 0 || age > 24;
}
function main() {
  let input;
  try {
    input = JSON.parse(readStdin());
  } catch {
    console.log("{}");
    return;
  }
  if (!["startup", "resume"].includes(input.source)) {
    console.log("{}");
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (isCacheStale(projectDir)) {
    const child = spawn("tldr", ["daemon", "warm", "--project", projectDir], {
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32"
      // Shell needed on Windows
    });
    child.unref();
  }
  console.log("{}");
}
main();
