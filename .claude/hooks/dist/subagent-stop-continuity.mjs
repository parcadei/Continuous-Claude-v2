// src/subagent-stop-continuity.ts
import * as fs from "fs";
import * as path from "path";
async function main() {
  const input = JSON.parse(await readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (input.stop_hook_active) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  try {
    const agentInfo = parseTranscript(input.transcript_path);
    if (!agentInfo.agentName) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const outputPath = path.join(
      projectDir,
      ".claude",
      "cache",
      "agents",
      agentInfo.agentName,
      "latest-output.md"
    );
    let outputSummary = "";
    if (fs.existsSync(outputPath)) {
      const content = fs.readFileSync(outputPath, "utf-8");
      const summaryMatch = content.match(/## Executive Summary\n([\s\S]*?)(?=\n##|$)/);
      const goalMatch = content.match(/## Goal\n([\s\S]*?)(?=\n##|$)/);
      const symptomMatch = content.match(/## Symptom\n([\s\S]*?)(?=\n##|$)/);
      outputSummary = summaryMatch?.[1]?.trim() || goalMatch?.[1]?.trim() || symptomMatch?.[1]?.trim() || content.slice(0, 300).trim();
    }
    writeAgentLog(projectDir, agentInfo, outputPath);
    appendToLedger(projectDir, agentInfo, outputSummary);
    const message = `[SubagentStop] ${agentInfo.agentName} completed. Report: .claude/cache/agents/${agentInfo.agentName}/latest-output.md`;
    console.log(JSON.stringify({ result: "continue", message }));
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
  }
}
function parseTranscript(transcriptPath) {
  let agentName = null;
  let task = "";
  let agentId = null;
  try {
    if (!fs.existsSync(transcriptPath)) {
      return { agentName: null, task: "", agentId: null };
    }
    const content = fs.readFileSync(transcriptPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.tool_name === "Task" && entry.tool_input) {
          const subagentType = entry.tool_input.subagent_type;
          const prompt = entry.tool_input.prompt;
          if ([
            "research-agent",
            "plan-agent",
            "debug-agent",
            "rp-explorer",
            "codebase-analyzer",
            "codebase-locator",
            "codebase-pattern-finder",
            "explore"
          ].includes(subagentType)) {
            agentName = subagentType;
            task = prompt?.slice(0, 200) || "";
            break;
          }
        }
        if (entry.message?.content) {
          const content2 = typeof entry.message.content === "string" ? entry.message.content : entry.message.content.map((c) => c.text || "").join(" ");
          const agentMatch = content2.match(/\.claude\/agents\/([\w-]+)\.md/);
          if (agentMatch) {
            agentName = agentMatch[1];
          }
        }
      } catch {
      }
    }
  } catch {
  }
  const transcriptName = path.basename(transcriptPath, ".jsonl");
  agentId = `${agentName}-${transcriptName.slice(-8)}`;
  return { agentName, task, agentId };
}
function writeAgentLog(projectDir, agentInfo, outputPath) {
  if (!agentInfo.agentName || !agentInfo.agentId) return;
  const logDir = path.join(projectDir, ".claude", "cache", "agents");
  const logFile = path.join(logDir, "agent-log.jsonl");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logEntry = {
    agentId: agentInfo.agentId,
    type: agentInfo.agentName,
    task: agentInfo.task.slice(0, 500),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    output: outputPath.replace(projectDir, ""),
    status: "completed",
    canResume: true
  };
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
}
function appendToLedger(projectDir, agentInfo, outputSummary) {
  if (!agentInfo.agentName) return;
  const ledgerFiles = fs.readdirSync(projectDir).filter((f) => f.startsWith("CONTINUITY_CLAUDE-") && f.endsWith(".md"));
  if (ledgerFiles.length === 0) return;
  const mostRecent = ledgerFiles.sort((a, b) => {
    const statA = fs.statSync(path.join(projectDir, a));
    const statB = fs.statSync(path.join(projectDir, b));
    return statB.mtime.getTime() - statA.mtime.getTime();
  })[0];
  const ledgerPath = path.join(projectDir, mostRecent);
  let content = fs.readFileSync(ledgerPath, "utf-8");
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const agentReport = `
### ${agentInfo.agentName} (${timestamp})
- Task: ${agentInfo.task.slice(0, 100)}${agentInfo.task.length > 100 ? "..." : ""}
- Summary: ${outputSummary.slice(0, 200)}${outputSummary.length > 200 ? "..." : ""}
- Output: \`.claude/cache/agents/${agentInfo.agentName}/latest-output.md\`
`;
  const agentReportsMatch = content.match(/## Agent Reports\n/);
  if (agentReportsMatch) {
    const insertPos = content.indexOf("## Agent Reports\n") + "## Agent Reports\n".length;
    content = content.slice(0, insertPos) + agentReport + content.slice(insertPos);
  } else {
    const archMatch = content.indexOf("## Architecture Summary");
    const hooksMatch = content.indexOf("## Hooks Summary");
    const insertBefore = archMatch > 0 ? archMatch : hooksMatch > 0 ? hooksMatch : content.length;
    content = content.slice(0, insertBefore) + "\n## Agent Reports\n" + agentReport + "\n" + content.slice(insertBefore);
  }
  fs.writeFileSync(ledgerPath, content);
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
main().catch(console.error);
