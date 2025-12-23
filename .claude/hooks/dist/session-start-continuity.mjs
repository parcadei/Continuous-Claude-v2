// src/session-start-continuity.ts
import * as fs from "fs";
import * as path from "path";
function getLatestHandoff(handoffDir) {
  if (!fs.existsSync(handoffDir)) return null;
  const handoffFiles = fs.readdirSync(handoffDir).filter((f) => (f.startsWith("task-") || f.startsWith("auto-handoff-")) && f.endsWith(".md")).sort((a, b) => {
    const statA = fs.statSync(path.join(handoffDir, a));
    const statB = fs.statSync(path.join(handoffDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  if (handoffFiles.length === 0) return null;
  const latestFile = handoffFiles[0];
  const content = fs.readFileSync(path.join(handoffDir, latestFile), "utf-8");
  const isAutoHandoff = latestFile.startsWith("auto-handoff-");
  let taskNumber;
  let status;
  let summary;
  if (isAutoHandoff) {
    const typeMatch = content.match(/type:\s*auto-handoff/i);
    status = typeMatch ? "auto-handoff" : "unknown";
    const timestampMatch = latestFile.match(/auto-handoff-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
    taskNumber = timestampMatch ? timestampMatch[1] : "auto";
    const inProgressMatch = content.match(/## In Progress\n([\s\S]*?)(?=\n## |$)/);
    summary = inProgressMatch ? inProgressMatch[1].trim().split("\n").slice(0, 3).join("; ").substring(0, 150) : "Auto-handoff from pre-compact";
  } else {
    const taskMatch = latestFile.match(/task-(\d+)/);
    taskNumber = taskMatch ? taskMatch[1] : "??";
    const statusMatch = content.match(/status:\s*(success|partial|blocked)/i);
    status = statusMatch ? statusMatch[1] : "unknown";
    const summaryMatch = content.match(/## What Was Done\n([\s\S]*?)(?=\n## |$)/);
    summary = summaryMatch ? summaryMatch[1].trim().split("\n").slice(0, 2).join("; ").substring(0, 150) : "No summary available";
  }
  return {
    filename: latestFile,
    taskNumber,
    status,
    summary,
    isAutoHandoff
  };
}
async function main() {
  const input = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const sessionType = input.source || input.type;
  const ledgerFiles = fs.readdirSync(projectDir).filter((f) => f.startsWith("CONTINUITY_CLAUDE-") && f.endsWith(".md")).sort((a, b) => {
    const statA = fs.statSync(path.join(projectDir, a));
    const statB = fs.statSync(path.join(projectDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  let message = "";
  let additionalContext = "";
  if (ledgerFiles.length > 0) {
    const mostRecent = ledgerFiles[0];
    const ledgerPath = path.join(projectDir, mostRecent);
    const ledgerContent = fs.readFileSync(ledgerPath, "utf-8");
    const goalMatch = ledgerContent.match(/## Goal\n([\s\S]*?)(?=\n## |$)/);
    const nowMatch = ledgerContent.match(/- Now: ([^\n]+)/);
    const goalSummary = goalMatch ? goalMatch[1].trim().split("\n")[0].substring(0, 100) : "No goal found";
    const currentFocus = nowMatch ? nowMatch[1].trim() : "Unknown";
    const sessionName = mostRecent.replace("CONTINUITY_CLAUDE-", "").replace(".md", "");
    const handoffDir = path.join(projectDir, "thoughts", "handoffs", sessionName);
    const latestHandoff = getLatestHandoff(handoffDir);
    if (sessionType === "startup") {
      let startupMsg = `\u{1F4CB} Ledger available: ${sessionName} \u2192 ${currentFocus}`;
      if (latestHandoff) {
        if (latestHandoff.isAutoHandoff) {
          startupMsg += ` | Last handoff: auto (${latestHandoff.status})`;
        } else {
          startupMsg += ` | Last handoff: task-${latestHandoff.taskNumber} (${latestHandoff.status})`;
        }
      }
      startupMsg += " (run /resume_handoff to continue)";
      message = startupMsg;
    } else {
      console.error(`\u2713 Ledger loaded: ${sessionName} \u2192 ${currentFocus}`);
      message = `[${sessionType}] Loaded: ${mostRecent} | Goal: ${goalSummary} | Focus: ${currentFocus}`;
      if (sessionType === "clear" || sessionType === "compact") {
        additionalContext = `Continuity ledger loaded from ${mostRecent}:

${ledgerContent}`;
        if (latestHandoff) {
          const handoffPath = path.join(handoffDir, latestHandoff.filename);
          const handoffContent = fs.readFileSync(handoffPath, "utf-8");
          const handoffLabel = latestHandoff.isAutoHandoff ? "Latest auto-handoff" : "Latest task handoff";
          additionalContext += `

---

${handoffLabel} (${latestHandoff.filename}):
`;
          additionalContext += `Status: ${latestHandoff.status}${latestHandoff.isAutoHandoff ? "" : ` | Task: ${latestHandoff.taskNumber}`}

`;
          const truncatedHandoff = handoffContent.length > 2e3 ? handoffContent.substring(0, 2e3) + "\n\n[... truncated, read full file if needed]" : handoffContent;
          additionalContext += truncatedHandoff;
          const allHandoffs = fs.readdirSync(handoffDir).filter((f) => (f.startsWith("task-") || f.startsWith("auto-handoff-")) && f.endsWith(".md")).sort((a, b) => {
            const statA = fs.statSync(path.join(handoffDir, a));
            const statB = fs.statSync(path.join(handoffDir, b));
            return statB.mtime.getTime() - statA.mtime.getTime();
          });
          if (allHandoffs.length > 1) {
            additionalContext += `

---

All handoffs in ${handoffDir}:
`;
            allHandoffs.forEach((f) => {
              additionalContext += `- ${f}
`;
            });
          }
        }
      }
    }
  } else {
    if (sessionType !== "startup") {
      console.error(`\u26A0 No ledger found. Run /continuity_ledger to track session state.`);
      message = `[${sessionType}] No ledger found. Consider running /continuity_ledger to track session state.`;
    }
  }
  const output = { result: "continue" };
  if (message) {
    output.message = message;
    output.systemMessage = message;
  }
  if (additionalContext) {
    output.hookSpecificOutput = {
      hookEventName: "SessionStart",
      additionalContext
    };
  }
  console.log(JSON.stringify(output));
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
main().catch(console.error);
