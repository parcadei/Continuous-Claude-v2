/**
 * SessionStart Hook: Learning Injection
 *
 * On session startup/resume, queries relevant learnings from archival_memory
 * and injects them into Claude's context.
 */
import { spawnSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
function readStdin() {
  return readFileSync(0, "utf-8");
}
function extractQueryFromContext(cwd) {
  // Try to find current ledger
  const ledgerDir = join(cwd, "thoughts", "ledgers");
  if (existsSync(ledgerDir)) {
    const files = readdirSync(ledgerDir);
    const ledger = files.find((f) => f.startsWith("CONTINUITY_CLAUDE-"));
    if (ledger) {
      const content = readFileSync(join(ledgerDir, ledger), "utf-8");
      // Extract session name from filename
      const sessionName = ledger
        .replace("CONTINUITY_CLAUDE-", "")
        .replace(".md", "");
      return sessionName.replace(/-/g, " ");
    }
  }
  // Try to find recent handoff
  const handoffDir = join(cwd, "thoughts", "shared", "handoffs");
  if (existsSync(handoffDir)) {
    // Get most recent handoff
    const result = spawnSync(
      "find",
      [handoffDir, "-name", "*.yaml", "-type", "f"],
      {
        encoding: "utf-8",
      },
    );
    if (result.stdout) {
      const files = result.stdout.trim().split("\n").filter(Boolean);
      if (files.length > 0) {
        const latest = files[files.length - 1];
        const content = readFileSync(latest, "utf-8");
        // Extract goal from YAML
        const goalMatch = content.match(/^goal:\s*(.+)$/m);
        if (goalMatch) {
          return goalMatch[1].slice(0, 100);
        }
      }
    }
  }
  // Default query
  return "session patterns learnings";
}
async function main() {
  const input = JSON.parse(readStdin());
  // Inject on startup, resume, or clear (all session-restoring events)
  if (!["startup", "resume", "clear"].includes(input.source)) {
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const opcDir = join(projectDir, "opc");
  // Extract query from current context
  const query = extractQueryFromContext(projectDir);
  // Query learnings
  const result = spawnSync(
    "uv",
    [
      "run",
      "python",
      "scripts/recall_learnings.py",
      "--query",
      query,
      "--k",
      "3",
    ],
    {
      encoding: "utf-8",
      cwd: opcDir,
      env: {
        ...process.env,
        PYTHONPATH: opcDir,
      },
      timeout: 20000,
    },
  );
  if (result.status === 0 && result.stdout) {
    // Filter to just the learnings (skip header lines)
    const lines = result.stdout.split("\n");
    const learningLines = lines.filter(
      (l) =>
        l.includes("[0.") ||
        l.trim().startsWith("What ") ||
        l.trim().startsWith("Decisions:"),
    );
    if (learningLines.length > 0) {
      // Aesthetic display with box drawing
      console.log("");
      console.log(
        "┌─────────────────────────────────────────────────────────────┐",
      );
      console.log(
        "│  📚 RECALLED LEARNINGS                                      │",
      );
      console.log(
        "├─────────────────────────────────────────────────────────────┤",
      );
      // Format each learning nicely
      for (const line of learningLines) {
        const trimmed = line.trim();
        // Score line - e.g. "1. [0.403] Session: backfill (2026-01-06)"
        const scoreMatch = trimmed.match(
          /\d+\.\s*\[(\d\.\d+)\]\s*Session:\s*(\S+)/,
        );
        if (scoreMatch) {
          const score = scoreMatch[1];
          const session = scoreMatch[2].slice(0, 35);
          console.log(`│  ⭐ [${score}] ${session.padEnd(48)} │`);
          continue;
        }
        if (trimmed.startsWith("What worked:")) {
          const content = trimmed.slice(12).trim().slice(0, 50);
          console.log(`│     ✓ ${content.padEnd(52)} │`);
        } else if (trimmed.startsWith("What failed:")) {
          const content = trimmed.slice(12).trim().slice(0, 50);
          console.log(`│     ✗ ${content.padEnd(52)} │`);
        } else if (trimmed.startsWith("Decisions:")) {
          const content = trimmed.slice(10).trim().slice(0, 50);
          console.log(`│     → ${content.padEnd(52)} │`);
        }
      }
      console.log(
        "└─────────────────────────────────────────────────────────────┘",
      );
      console.log("");
    }
  }
}
main().catch(() => {
  // Silent fail - don't block session start
});
