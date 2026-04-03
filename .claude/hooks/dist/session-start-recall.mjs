// src/session-start-recall.ts
import { spawnSync } from "child_process";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
function readStdin() {
  return readFileSync(0, "utf-8");
}
function extractQueryFromContext(cwd) {
  const ledgerDir = join(cwd, "thoughts", "ledgers");
  if (existsSync(ledgerDir)) {
    const files = readdirSync(ledgerDir);
    const ledger = files.find((f) => f.startsWith("CONTINUITY_CLAUDE-"));
    if (ledger) {
      const content = readFileSync(join(ledgerDir, ledger), "utf-8");
      const sessionName = ledger
        .replace("CONTINUITY_CLAUDE-", "")
        .replace(".md", "");
      return sessionName.replace(/-/g, " ");
    }
  }
  const handoffDir = join(cwd, "thoughts", "shared", "handoffs");
  if (existsSync(handoffDir)) {
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
        const goalMatch = content.match(/^goal:\s*(.+)$/m);
        if (goalMatch) {
          return goalMatch[1].slice(0, 100);
        }
      }
    }
  }
  return "session patterns learnings";
}
async function main() {
  const input = JSON.parse(readStdin());
  if (!["startup", "resume", "clear"].includes(input.source)) {
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const opcDir = join(projectDir, "opc");
  const query = extractQueryFromContext(projectDir);
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
      timeout: 2e4,
    },
  );
  if (result.status === 0 && result.stdout) {
    const lines = result.stdout.split("\n");
    const learningLines = lines.filter(
      (l) =>
        l.includes("[0.") ||
        l.trim().startsWith("What ") ||
        l.trim().startsWith("Decisions:"),
    );
    if (learningLines.length > 0) {
      console.log("");
      console.log(
        "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
      );
      console.log(
        "\u2502  \u{1F4DA} RECALLED LEARNINGS                                      \u2502",
      );
      console.log(
        "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524",
      );
      for (const line of learningLines) {
        const trimmed = line.trim();
        const scoreMatch = trimmed.match(
          /\d+\.\s*\[(\d\.\d+)\]\s*Session:\s*(\S+)/,
        );
        if (scoreMatch) {
          const score = scoreMatch[1];
          const session = scoreMatch[2].slice(0, 35);
          console.log(`\u2502  \u2B50 [${score}] ${session.padEnd(48)} \u2502`);
          continue;
        }
        if (trimmed.startsWith("What worked:")) {
          const content = trimmed.slice(12).trim().slice(0, 50);
          console.log(`\u2502     \u2713 ${content.padEnd(52)} \u2502`);
        } else if (trimmed.startsWith("What failed:")) {
          const content = trimmed.slice(12).trim().slice(0, 50);
          console.log(`\u2502     \u2717 ${content.padEnd(52)} \u2502`);
        } else if (trimmed.startsWith("Decisions:")) {
          const content = trimmed.slice(10).trim().slice(0, 50);
          console.log(`\u2502     \u2192 ${content.padEnd(52)} \u2502`);
        }
      }
      console.log(
        "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
      );
      console.log("");
    }
  }
}
main().catch(() => {});
