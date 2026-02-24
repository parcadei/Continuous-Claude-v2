// src/session-start-continuity.ts
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync, spawn } from "child_process";
function buildHandoffDirName(sessionName, sessionId) {
  const uuidShort = sessionId.replace(/-/g, "").slice(0, 8);
  return `${sessionName}-${uuidShort}`;
}
function parseHandoffDirName(dirName) {
  const match = dirName.match(/^(.+)-([0-9a-f]{8})$/i);
  if (match) {
    return { sessionName: match[1], uuidShort: match[2].toLowerCase() };
  }
  return { sessionName: dirName, uuidShort: null };
}
function findSessionHandoffWithUUID(sessionName, sessionId) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const handoffsBase = path.join(projectDir, "thoughts", "shared", "handoffs");
  if (!fs.existsSync(handoffsBase)) return null;
  const uuidShort = sessionId.replace(/-/g, "").slice(0, 8).toLowerCase();
  const exactDir = path.join(handoffsBase, `${sessionName}-${uuidShort}`);
  if (fs.existsSync(exactDir)) {
    return findMostRecentMdFile(exactDir);
  }
  const legacyDir = path.join(handoffsBase, sessionName);
  if (fs.existsSync(legacyDir) && fs.statSync(legacyDir).isDirectory()) {
    const result = findMostRecentMdFile(legacyDir);
    if (result) return result;
  }
  const allDirs = fs.readdirSync(handoffsBase).filter((d) => {
    const stat = fs.statSync(path.join(handoffsBase, d));
    if (!stat.isDirectory()) return false;
    const { sessionName: parsedName } = parseHandoffDirName(d);
    return parsedName === sessionName;
  });
  allDirs.sort((a, b) => {
    const statA = fs.statSync(path.join(handoffsBase, a));
    const statB = fs.statSync(path.join(handoffsBase, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  for (const dir of allDirs) {
    const result = findMostRecentMdFile(path.join(handoffsBase, dir));
    if (result) return result;
  }
  return null;
}
function isHandoffFile(filename) {
  return filename.endsWith(".md") || filename.endsWith(".yaml") || filename.endsWith(".yml");
}
function findMostRecentMdFile(dirPath) {
  if (!fs.existsSync(dirPath)) return null;
  const handoffFiles = fs.readdirSync(dirPath).filter((f) => isHandoffFile(f)).sort((a, b) => {
    const statA = fs.statSync(path.join(dirPath, a));
    const statB = fs.statSync(path.join(dirPath, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  return handoffFiles.length > 0 ? path.join(dirPath, handoffFiles[0]) : null;
}
function extractYamlFields(content) {
  const goalMatch = content.match(/^goal:\s*(.+)$/m);
  const nowMatch = content.match(/^now:\s*(.+)$/m);
  if (!goalMatch && !nowMatch) return null;
  return {
    goal: goalMatch ? goalMatch[1].trim().replace(/^["']|["']$/g, "") : "",
    now: nowMatch ? nowMatch[1].trim().replace(/^["']|["']$/g, "") : ""
  };
}
function extractLedgerSection(handoffContent) {
  const match = handoffContent.match(/(?:^|\n)## Ledger\n([\s\S]*?)(?=\n---\n|\n## [^#]|$)/);
  return match ? `## Ledger
${match[1].trim()}` : null;
}
function findSessionHandoff(sessionName) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const handoffDir = path.join(projectDir, "thoughts", "shared", "handoffs", sessionName);
  if (!fs.existsSync(handoffDir)) return null;
  const handoffFiles = fs.readdirSync(handoffDir).filter((f) => isHandoffFile(f)).sort((a, b) => {
    const statA = fs.statSync(path.join(handoffDir, a));
    const statB = fs.statSync(path.join(handoffDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  });
  return handoffFiles.length > 0 ? path.join(handoffDir, handoffFiles[0]) : null;
}
function pruneLedger(ledgerPath) {
  let content = fs.readFileSync(ledgerPath, "utf-8");
  const originalLength = content.length;
  content = content.replace(/\n### Session Ended \([^)]+\)\n- Reason: \w+\n/g, "");
  const agentReportsMatch = content.match(/## Agent Reports\n([\s\S]*?)(?=\n## |$)/);
  if (agentReportsMatch) {
    const agentReportsSection = agentReportsMatch[0];
    const reports = agentReportsSection.match(/### [^\n]+ \(\d{4}-\d{2}-\d{2}[^)]*\)[\s\S]*?(?=\n### |\n## |$)/g);
    if (reports && reports.length > 10) {
      const keptReports = reports.slice(-10);
      const newAgentReportsSection = "## Agent Reports\n" + keptReports.join("");
      content = content.replace(agentReportsSection, newAgentReportsSection);
    }
  }
  if (content.length !== originalLength) {
    fs.writeFileSync(ledgerPath, content);
    console.error(`Pruned ledger: ${originalLength} \u2192 ${content.length} bytes`);
  }
}
function getLatestHandoff(handoffDir) {
  if (!fs.existsSync(handoffDir)) return null;
  const handoffFiles = fs.readdirSync(handoffDir).filter((f) => (f.startsWith("task-") || f.startsWith("auto-handoff-")) && isHandoffFile(f)).sort((a, b) => {
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
function getUnmarkedHandoffs() {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const dbPath = path.join(projectDir, ".claude", "cache", "artifact-index", "context.db");
    if (!fs.existsSync(dbPath)) {
      return [];
    }
    const result = execSync(
      `sqlite3 "${dbPath}" "SELECT id, session_name, task_number, task_summary FROM handoffs WHERE outcome = 'UNKNOWN' ORDER BY indexed_at DESC LIMIT 5"`,
      { encoding: "utf-8", timeout: 3e3 }
    );
    if (!result.trim()) {
      return [];
    }
    return result.trim().split("\n").map((line) => {
      const [id, session_name, task_number, task_summary] = line.split("|");
      return { id, session_name, task_number: task_number || null, task_summary: task_summary || "" };
    });
  } catch (error) {
    return [];
  }
}
function ensureMemoryDaemon() {
  const pidFile = path.join(os.homedir(), ".claude", "memory-daemon.pid");
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, "utf-8").trim(), 10);
      if (!isNaN(pid)) {
        try {
          process.kill(pid, 0);
          return null;
        } catch {
        }
      }
    } catch {
    }
    try {
      fs.unlinkSync(pidFile);
    } catch {
    }
  }
  const hookDir = path.dirname(new URL(import.meta.url).pathname);
  const possibleLocations = [
    // 1. Relative to compiled hook (development: .claude/hooks/dist/ → opc/scripts/core/)
    path.resolve(hookDir, "..", "..", "..", "opc", "scripts", "core", "memory_daemon.py"),
    // 2. In .claude/scripts/core/ (wizard-installed)
    path.resolve(hookDir, "..", "scripts", "core", "memory_daemon.py"),
    // 3. Global ~/.claude/scripts/core/
    path.join(os.homedir(), ".claude", "scripts", "core", "memory_daemon.py")
  ];
  let daemonScript = null;
  for (const loc of possibleLocations) {
    if (fs.existsSync(loc)) {
      daemonScript = loc;
      break;
    }
  }
  if (!daemonScript) {
    console.error("Warning: memory_daemon.py not found, cannot auto-start memory daemon");
    return null;
  }
  try {
    const cwd = path.resolve(daemonScript, "..", "..", "..");
    const logFile = path.join(os.homedir(), ".claude", "memory-daemon.log");
    const logFd = fs.openSync(logFile, "a");
    const child = spawn("uv", ["run", daemonScript, "start"], {
      cwd,
      stdio: ["ignore", logFd, logFd],
      detached: true
    });
    child.unref();
    fs.closeSync(logFd);
    return "Memory daemon: Started";
  } catch (e) {
    console.error(`Warning: Failed to start memory daemon: ${e}`);
    return null;
  }
}
async function main() {
  const input = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const sessionType = input.source || input.type;
  let message = "";
  let additionalContext = "";
  let usedHandoffLedger = false;
  const handoffsDir = path.join(projectDir, "thoughts", "shared", "handoffs");
  if (fs.existsSync(handoffsDir)) {
    try {
      const sessionDirs = fs.readdirSync(handoffsDir).filter((d) => {
        const stat = fs.statSync(path.join(handoffsDir, d));
        return stat.isDirectory();
      });
      let mostRecentLedger = null;
      for (const sessionName of sessionDirs) {
        const handoffPath = findSessionHandoff(sessionName);
        if (handoffPath) {
          const content = fs.readFileSync(handoffPath, "utf-8");
          const isYaml = handoffPath.endsWith(".yaml") || handoffPath.endsWith(".yml");
          let goalSummary = "No goal found";
          let currentFocus = "Unknown";
          let ledgerContent = "";
          if (isYaml) {
            const yamlFields = extractYamlFields(content);
            if (yamlFields) {
              goalSummary = yamlFields.goal || "No goal found";
              currentFocus = yamlFields.now || "Unknown";
              ledgerContent = content;
            }
          } else {
            const ledgerSection = extractLedgerSection(content);
            if (ledgerSection) {
              const goalMatch = ledgerSection.match(/\*\*Goal:\*\*\s*([^\n]+)/);
              const nowMatch = ledgerSection.match(/### Now\n\[?-?>?\]?\s*([^\n]+)/);
              goalSummary = goalMatch ? goalMatch[1].trim().substring(0, 100) : "No goal found";
              currentFocus = nowMatch ? nowMatch[1].trim() : "Unknown";
              ledgerContent = ledgerSection;
            }
          }
          if (ledgerContent || isYaml && (goalSummary !== "No goal found" || currentFocus !== "Unknown")) {
            const mtime = fs.statSync(handoffPath).mtime.getTime();
            if (!mostRecentLedger || mtime > mostRecentLedger.mtime) {
              mostRecentLedger = {
                content: ledgerContent || content,
                sessionName,
                handoffPath,
                mtime,
                goalSummary: goalSummary.substring(0, 100),
                currentFocus
              };
            }
          }
        }
      }
      if (mostRecentLedger) {
        usedHandoffLedger = true;
        const { sessionName, goalSummary, currentFocus, content: ledgerSection, handoffPath } = mostRecentLedger;
        const handoffFilename = path.basename(handoffPath);
        if (sessionType === "startup") {
          message = `\u{1F4CB} Handoff Ledger: ${sessionName} \u2192 ${currentFocus} (run /resume_handoff to continue)`;
        } else {
          console.error(`\u2713 Handoff Ledger loaded: ${sessionName} \u2192 ${currentFocus}`);
          message = `[${sessionType}] Loaded from handoff: ${handoffFilename} | Goal: ${goalSummary} | Focus: ${currentFocus}`;
          if (sessionType === "clear" || sessionType === "compact") {
            additionalContext = `Handoff Ledger loaded from ${handoffFilename}:

${ledgerSection}`;
            const unmarkedHandoffs = getUnmarkedHandoffs();
            if (unmarkedHandoffs.length > 0) {
              additionalContext += `

---

## Unmarked Session Outcomes

`;
              additionalContext += `The following handoffs have no outcome marked. Consider marking them to improve future session recommendations:

`;
              for (const h of unmarkedHandoffs) {
                const taskLabel = h.task_number ? `task-${h.task_number}` : "handoff";
                const summaryPreview = h.task_summary ? h.task_summary.substring(0, 60) + "..." : "(no summary)";
                additionalContext += `- **${h.session_name}/${taskLabel}** (ID: \`${h.id.substring(0, 8)}\`): ${summaryPreview}
`;
              }
              additionalContext += `
To mark an outcome:
\`\`\`bash
cd ~/.claude && uv run python scripts/core/artifact_mark.py --handoff <ID> --outcome SUCCEEDED|PARTIAL_PLUS|PARTIAL_MINUS|FAILED
\`\`\`
`;
            }
            additionalContext += `

---

Full handoff available at: ${handoffPath}
`;
          }
        }
      }
    } catch (error) {
      console.error(`Warning: Error scanning handoffs: ${error}`);
    }
  }
  if (!usedHandoffLedger) {
    const ledgerDir = path.join(projectDir, "thoughts", "ledgers");
    if (!fs.existsSync(ledgerDir)) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const ledgerFiles = fs.readdirSync(ledgerDir).filter((f) => f.startsWith("CONTINUITY_CLAUDE-") && f.endsWith(".md")).sort((a, b) => {
      const statA = fs.statSync(path.join(ledgerDir, a));
      const statB = fs.statSync(path.join(ledgerDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
    if (ledgerFiles.length > 0) {
      console.error("DEPRECATED: Using legacy ledger file. Migrate to handoff format with /create_handoff");
      const mostRecent = ledgerFiles[0];
      const ledgerPath = path.join(ledgerDir, mostRecent);
      pruneLedger(ledgerPath);
      const ledgerContent = fs.readFileSync(ledgerPath, "utf-8");
      const goalMatch = ledgerContent.match(/## Goal\n([\s\S]*?)(?=\n## |$)/);
      const nowMatch = ledgerContent.match(/- Now: ([^\n]+)/);
      const goalSummary = goalMatch ? goalMatch[1].trim().split("\n")[0].substring(0, 100) : "No goal found";
      const currentFocus = nowMatch ? nowMatch[1].trim() : "Unknown";
      const sessionName = mostRecent.replace("CONTINUITY_CLAUDE-", "").replace(".md", "");
      const handoffDir = path.join(projectDir, "thoughts", "shared", "handoffs", sessionName);
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
          const unmarkedHandoffs = getUnmarkedHandoffs();
          if (unmarkedHandoffs.length > 0) {
            additionalContext += `

---

## Unmarked Session Outcomes

`;
            additionalContext += `The following handoffs have no outcome marked. Consider marking them to improve future session recommendations:

`;
            for (const h of unmarkedHandoffs) {
              const taskLabel = h.task_number ? `task-${h.task_number}` : "handoff";
              const summaryPreview = h.task_summary ? h.task_summary.substring(0, 60) + "..." : "(no summary)";
              additionalContext += `- **${h.session_name}/${taskLabel}** (ID: \`${h.id.substring(0, 8)}\`): ${summaryPreview}
`;
            }
            additionalContext += `
To mark an outcome:
\`\`\`bash
cd ~/.claude && uv run python scripts/core/artifact_mark.py --handoff <ID> --outcome SUCCEEDED|PARTIAL_PLUS|PARTIAL_MINUS|FAILED
\`\`\`
`;
          }
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
            const allHandoffs = fs.readdirSync(handoffDir).filter((f) => (f.startsWith("task-") || f.startsWith("auto-handoff-")) && isHandoffFile(f)).sort((a, b) => {
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
  }
  const daemonStatus = ensureMemoryDaemon();
  if (daemonStatus) {
    console.error(`\u2713 ${daemonStatus}`);
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
  return new Promise((resolve2) => {
    let data = "";
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve2(data));
  });
}
main().catch(console.error);
export {
  buildHandoffDirName,
  extractLedgerSection,
  extractYamlFields,
  findSessionHandoff,
  findSessionHandoffWithUUID,
  parseHandoffDirName
};
