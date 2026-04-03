/**
 * SessionStart Hook: TLDR Cache Awareness
 *
 * On session startup, checks if TLDR caches exist and emits a system reminder.
 * Does NOT load the full JSON - just notifies Claude that caches are available.
 */
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
function readStdin() {
  return readFileSync(0, "utf-8");
}
function getCacheStatus(projectDir) {
  const cacheDir = join(projectDir, ".claude", "cache", "tldr");
  if (!existsSync(cacheDir)) {
    return { exists: false, files: { arch: false, calls: false, dead: false } };
  }
  const archPath = join(cacheDir, "arch.json");
  const callsPath = join(cacheDir, "calls.json");
  const deadPath = join(cacheDir, "dead.json");
  const metaPath = join(cacheDir, "meta.json");
  const files = {
    arch: existsSync(archPath) && statSync(archPath).size > 10,
    calls: existsSync(callsPath) && statSync(callsPath).size > 10,
    dead: existsSync(deadPath) && statSync(deadPath).size > 2,
  };
  let age_hours;
  if (existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      const cachedAt = new Date(meta.cached_at);
      age_hours = Math.round(
        (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60),
      );
    } catch {
      // Ignore parse errors
    }
  }
  return {
    exists: files.arch || files.calls || files.dead,
    age_hours,
    files,
  };
}
async function main() {
  const input = JSON.parse(readStdin());
  // Only run on startup/resume (not clear/compact)
  if (!["startup", "resume"].includes(input.source)) {
    console.log("{}");
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const cache = getCacheStatus(projectDir);
  if (!cache.exists) {
    // No cache - silent exit (don't spam user)
    console.log("{}");
    return;
  }
  // Build status message
  const available = [];
  if (cache.files.arch) available.push("arch");
  if (cache.files.calls) available.push("calls");
  if (cache.files.dead) available.push("dead");
  const ageStr =
    cache.age_hours !== undefined ? ` (${cache.age_hours}h old)` : "";
  const freshness =
    cache.age_hours !== undefined && cache.age_hours > 168 ? " ⚠️ STALE" : "";
  // Emit system message - don't load full JSON, just notify availability
  const message = `📊 TLDR cache available${ageStr}${freshness}: ${available.join(", ")}. Query with: cat .claude/cache/tldr/<file>.json | jq`;
  // Output as system reminder (not full context injection)
  console.log(message);
}
main().catch(() => {
  // Silent fail - don't block session start
  console.log("{}");
});
