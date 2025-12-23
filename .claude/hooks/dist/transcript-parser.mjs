// src/transcript-parser.ts
import * as fs from "fs";
function parseTranscript(transcriptPath) {
  const summary = {
    lastTodos: [],
    recentToolCalls: [],
    lastAssistantMessage: "",
    filesModified: [],
    errorsEncountered: []
  };
  if (!fs.existsSync(transcriptPath)) {
    return summary;
  }
  const content = fs.readFileSync(transcriptPath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  const allToolCalls = [];
  const modifiedFiles = /* @__PURE__ */ new Set();
  const errors = [];
  let lastTodoState = [];
  let lastAssistant = "";
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.role === "assistant" && typeof entry.content === "string") {
        lastAssistant = entry.content;
      } else if (entry.type === "assistant" && typeof entry.content === "string") {
        lastAssistant = entry.content;
      }
      if (entry.tool_name || entry.type === "tool_use") {
        const toolName = entry.tool_name || entry.name;
        if (toolName) {
          const toolCall = {
            name: toolName,
            timestamp: entry.timestamp,
            input: entry.tool_input,
            success: true
            // Will be updated by result
          };
          if (toolName === "TodoWrite" || toolName.toLowerCase().includes("todowrite")) {
            const input = entry.tool_input;
            if (input?.todos) {
              lastTodoState = input.todos.map((t, idx) => ({
                id: t.id || `todo-${idx}`,
                content: t.content || "",
                status: t.status || "pending"
              }));
            }
          }
          if (toolName === "Edit" || toolName === "Write" || toolName.toLowerCase().includes("edit") || toolName.toLowerCase().includes("write")) {
            const input = entry.tool_input;
            const filePath = input?.file_path || input?.path;
            if (filePath && typeof filePath === "string") {
              modifiedFiles.add(filePath);
            }
          }
          if (toolName === "Bash" || toolName.toLowerCase().includes("bash")) {
            const input = entry.tool_input;
            if (input?.command) {
              toolCall.input = { command: input.command };
            }
          }
          allToolCalls.push(toolCall);
        }
      }
      if (entry.type === "tool_result" || entry.tool_result !== void 0) {
        const result = entry.tool_result;
        if (result) {
          const exitCode = result.exit_code ?? result.exitCode;
          if (exitCode !== void 0 && exitCode !== 0) {
            if (allToolCalls.length > 0) {
              allToolCalls[allToolCalls.length - 1].success = false;
            }
            const errorMsg = result.stderr || result.error || "Command failed";
            const lastTool = allToolCalls[allToolCalls.length - 1];
            const command = lastTool?.input?.command || "unknown command";
            errors.push(`${command}: ${errorMsg.substring(0, 200)}`);
          }
        }
        if (entry.error) {
          errors.push(entry.error.substring(0, 200));
          if (allToolCalls.length > 0) {
            allToolCalls[allToolCalls.length - 1].success = false;
          }
        }
      }
    } catch {
      continue;
    }
  }
  summary.lastTodos = lastTodoState;
  summary.recentToolCalls = allToolCalls.slice(-5);
  summary.lastAssistantMessage = lastAssistant.substring(0, 500);
  summary.filesModified = Array.from(modifiedFiles);
  summary.errorsEncountered = errors.slice(-5);
  return summary;
}
function generateAutoHandoff(summary, sessionName) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const lines = [];
  lines.push("---");
  lines.push(`date: ${timestamp}`);
  lines.push("type: auto-handoff");
  lines.push("trigger: pre-compact-auto");
  lines.push(`session: ${sessionName}`);
  lines.push("---");
  lines.push("");
  lines.push("# Auto-Handoff (PreCompact)");
  lines.push("");
  lines.push("This handoff was automatically generated before context compaction.");
  lines.push("");
  lines.push("## In Progress");
  lines.push("");
  if (summary.lastTodos.length > 0) {
    const inProgress = summary.lastTodos.filter((t) => t.status === "in_progress");
    const pending = summary.lastTodos.filter((t) => t.status === "pending");
    const completed = summary.lastTodos.filter((t) => t.status === "completed");
    if (inProgress.length > 0) {
      lines.push("**Active:**");
      inProgress.forEach((t) => lines.push(`- [>] ${t.content}`));
      lines.push("");
    }
    if (pending.length > 0) {
      lines.push("**Pending:**");
      pending.forEach((t) => lines.push(`- [ ] ${t.content}`));
      lines.push("");
    }
    if (completed.length > 0) {
      lines.push("**Completed this session:**");
      completed.forEach((t) => lines.push(`- [x] ${t.content}`));
      lines.push("");
    }
  } else {
    lines.push("No TodoWrite state captured.");
    lines.push("");
  }
  lines.push("## Recent Actions");
  lines.push("");
  if (summary.recentToolCalls.length > 0) {
    summary.recentToolCalls.forEach((tc) => {
      const status = tc.success ? "OK" : "FAILED";
      const inputSummary = tc.input ? ` - ${JSON.stringify(tc.input).substring(0, 80)}...` : "";
      lines.push(`- ${tc.name} [${status}]${inputSummary}`);
    });
  } else {
    lines.push("No tool calls recorded.");
  }
  lines.push("");
  lines.push("## Files Modified");
  lines.push("");
  if (summary.filesModified.length > 0) {
    summary.filesModified.forEach((f) => lines.push(`- ${f}`));
  } else {
    lines.push("No files modified.");
  }
  lines.push("");
  if (summary.errorsEncountered.length > 0) {
    lines.push("## Errors Encountered");
    lines.push("");
    summary.errorsEncountered.forEach((e) => {
      lines.push("```");
      lines.push(e);
      lines.push("```");
    });
    lines.push("");
  }
  lines.push("## Last Context");
  lines.push("");
  if (summary.lastAssistantMessage) {
    lines.push("```");
    lines.push(summary.lastAssistantMessage);
    if (summary.lastAssistantMessage.length >= 500) {
      lines.push("[... truncated]");
    }
    lines.push("```");
  } else {
    lines.push("No assistant message captured.");
  }
  lines.push("");
  lines.push("## Suggested Next Steps");
  lines.push("");
  lines.push('1. Review the "In Progress" section for current task state');
  lines.push('2. Check "Errors Encountered" if debugging issues');
  lines.push("3. Read modified files to understand recent changes");
  lines.push("4. Continue from where session left off");
  lines.push("");
  return lines.join("\n");
}
var isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: npx tsx transcript-parser.ts <transcript-path> [session-name]");
    process.exit(1);
  }
  const transcriptPath = args[0];
  const sessionName = args[1] || "test-session";
  console.log(`Parsing transcript: ${transcriptPath}`);
  const summary = parseTranscript(transcriptPath);
  console.log("\n--- Summary ---");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n--- Auto-Handoff ---");
  console.log(generateAutoHandoff(summary, sessionName));
}
export {
  generateAutoHandoff,
  parseTranscript
};
