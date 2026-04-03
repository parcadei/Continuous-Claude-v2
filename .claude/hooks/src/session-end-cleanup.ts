import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

// Lock file to prevent multiple concurrent braintrust extractors
const EXTRACTOR_LOCK = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".claude",
  "braintrust-extractor.lock",
);
const LOCK_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes - consider stale after this

interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  reason: "clear" | "logout" | "prompt_input_exit" | "other";
}

/**
 * Check if braintrust extractor is already running.
 * Uses lock file with PID to prevent orphan accumulation.
 * Similar pattern to daemon-client.ts isDaemonReachable().
 */
function isExtractorRunning(): boolean {
  if (!fs.existsSync(EXTRACTOR_LOCK)) {
    return false;
  }

  try {
    const lockContent = fs.readFileSync(EXTRACTOR_LOCK, "utf-8").trim();
    const [pidStr, timestampStr] = lockContent.split(":");
    const pid = parseInt(pidStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    // Check if lock is stale (older than 5 min)
    if (Date.now() - timestamp > LOCK_MAX_AGE_MS) {
      fs.unlinkSync(EXTRACTOR_LOCK);
      return false;
    }

    // Check if process is actually running
    try {
      process.kill(pid, 0); // Signal 0 just checks if process exists
      return true; // Process is running
    } catch {
      // Process not running, clean up stale lock
      fs.unlinkSync(EXTRACTOR_LOCK);
      return false;
    }
  } catch {
    // Error reading lock file, remove it
    try {
      fs.unlinkSync(EXTRACTOR_LOCK);
    } catch {
      /* ignore */
    }
    return false;
  }
}

/**
 * Create lock file with PID and timestamp.
 */
function createExtractorLock(pid: number): void {
  try {
    const lockDir = path.dirname(EXTRACTOR_LOCK);
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
    fs.writeFileSync(EXTRACTOR_LOCK, `${pid}:${Date.now()}`);
  } catch {
    // Don't crash on lock creation failure
  }
}

async function main() {
  const input: SessionEndInput = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  try {
    // Update continuity ledger with session end
    const ledgerDir = path.join(projectDir, "thoughts", "ledgers");
    const ledgerFiles = fs
      .readdirSync(ledgerDir)
      .filter((f) => f.startsWith("CONTINUITY_CLAUDE-") && f.endsWith(".md"));

    if (ledgerFiles.length > 0) {
      const mostRecent = ledgerFiles.sort((a, b) => {
        const statA = fs.statSync(path.join(ledgerDir, a));
        const statB = fs.statSync(path.join(ledgerDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      })[0];

      const ledgerPath = path.join(ledgerDir, mostRecent);
      let content = fs.readFileSync(ledgerPath, "utf-8");

      // Update timestamp
      const timestamp = new Date().toISOString();
      content = content.replace(/Updated: .*/, `Updated: ${timestamp}`);

      // Session end notes removed - caused ledger bloat
      // Timestamp update above is sufficient for tracking

      fs.writeFileSync(ledgerPath, content);
    }

    // Clean up old agent cache files (older than 7 days)
    const agentCacheDir = path.join(projectDir, ".claude", "cache", "agents");
    if (fs.existsSync(agentCacheDir)) {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      const agents = fs.readdirSync(agentCacheDir);
      for (const agent of agents) {
        const agentDir = path.join(agentCacheDir, agent);
        const stat = fs.statSync(agentDir);
        if (stat.isDirectory()) {
          const outputFile = path.join(agentDir, "latest-output.md");
          if (fs.existsSync(outputFile)) {
            const fileStat = fs.statSync(outputFile);
            if (now - fileStat.mtime.getTime() > maxAge) {
              fs.unlinkSync(outputFile);
            }
          }
        }
      }
    }

    // Trigger Braintrust learnings extraction (fire and forget, don't block session end)
    // Uses LLM-as-judge to extract What Worked/Failed/Decisions/Patterns
    //
    // Skip if Braintrust isn't configured - no point spawning a process that will just error
    if (!process.env.BRAINTRUST_API_KEY) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }

    const learnScript = path.join(
      projectDir,
      "scripts",
      "braintrust_analyze.py",
    );
    const globalScript = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      ".claude",
      "scripts",
      "braintrust_analyze.py",
    );
    const scriptPath = fs.existsSync(learnScript) ? learnScript : globalScript;

    if (fs.existsSync(scriptPath)) {
      // Check if extractor is already running BEFORE spawning
      // Prevents multiple concurrent extractors when sessions end rapidly
      // (Similar pattern to daemon-client.ts tryStartDaemon)
      if (isExtractorRunning()) {
        // Already running, skip this extraction
        // The running extractor will process recent sessions
        console.log(JSON.stringify({ result: "continue" }));
        return;
      }

      // Use spawn with detached mode so process survives hook exit
      // Pass the ending session's ID explicitly (new session may already be active in Braintrust)

      // For global script, use --with to include deps (works in any project without pyproject.toml)
      // For project script, use regular uv run (project has its own deps)
      const isGlobalScript = scriptPath === globalScript;
      const args = isGlobalScript
        ? [
            "run",
            "--with",
            "braintrust",
            "--with",
            "openai",
            "--with",
            "aiohttp",
            "python",
            scriptPath,
            "--learn",
            "--session-id",
            input.session_id,
          ]
        : [
            "run",
            "python",
            scriptPath,
            "--learn",
            "--session-id",
            input.session_id,
          ];

      const child = spawn("uv", args, {
        cwd: projectDir,
        detached: true,
        stdio: "ignore",
      });

      // Create lock file with spawned PID
      if (child.pid) {
        createExtractorLock(child.pid);
      }

      child.unref(); // Let parent exit without waiting for child
    }

    console.log(JSON.stringify({ result: "continue" }));
  } catch (err) {
    // Don't block session end on errors
    console.log(JSON.stringify({ result: "continue" }));
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

main().catch(console.error);
