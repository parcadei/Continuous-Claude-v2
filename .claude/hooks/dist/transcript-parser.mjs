// src/transcript-parser.ts
import * as fs from "fs";
function parseTranscript(transcriptPath) {
  const summary = {
    lastTodos: [],
    recentToolCalls: [],
    lastAssistantMessage: "",
    filesModified: [],
    errorsEncountered: [],
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
      } else if (
        entry.type === "assistant" &&
        typeof entry.content === "string"
      ) {
        lastAssistant = entry.content;
      }
      if (entry.tool_name || entry.type === "tool_use") {
        const toolName = entry.tool_name || entry.name;
        if (toolName) {
          const toolCall = {
            name: toolName,
            timestamp: entry.timestamp,
            input: entry.tool_input,
            success: true,
            // Will be updated by result
          };
          if (
            toolName === "TodoWrite" ||
            toolName.toLowerCase().includes("todowrite")
          ) {
            const input = entry.tool_input;
            if (input?.todos) {
              lastTodoState = input.todos.map((t, idx) => ({
                id: t.id || `todo-${idx}`,
                content: t.content || "",
                status: t.status || "pending",
              }));
            }
          }
          if (
            toolName === "Edit" ||
            toolName === "Write" ||
            toolName.toLowerCase().includes("edit") ||
            toolName.toLowerCase().includes("write")
          ) {
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
  const timestamp = /* @__PURE__ */ new Date().toISOString();
  const dateOnly = timestamp.split("T")[0];
  const lines = [];
  const inProgress = summary.lastTodos.filter(
    (t) => t.status === "in_progress",
  );
  const pending = summary.lastTodos.filter((t) => t.status === "pending");
  const completed = summary.lastTodos.filter((t) => t.status === "completed");
  const currentTask =
    inProgress[0]?.content ||
    pending[0]?.content ||
    "Continue from auto-compact";
  const goalSummary =
    completed.length > 0
      ? `Completed ${completed.length} task(s) before auto-compact`
      : "Session auto-compacted";
  lines.push("---");
  lines.push(`session: ${sessionName}`);
  lines.push(`date: ${dateOnly}`);
  lines.push("status: partial");
  lines.push("outcome: PARTIAL_PLUS");
  lines.push("---");
  lines.push("");
  lines.push(`goal: ${goalSummary}`);
  lines.push(`now: ${currentTask}`);
  lines.push("test: # No test command captured");
  lines.push("");
  lines.push("done_this_session:");
  if (completed.length > 0) {
    completed.forEach((t) => {
      lines.push(`  - task: "${t.content.replace(/"/g, '\\"')}"`);
      lines.push("    files: []");
    });
  } else {
    lines.push('  - task: "Session started"');
    lines.push("    files: []");
  }
  lines.push("");
  lines.push("blockers:");
  if (summary.errorsEncountered.length > 0) {
    summary.errorsEncountered.slice(0, 3).forEach((e) => {
      const safeError = e.replace(/"/g, '\\"').substring(0, 100);
      lines.push(`  - "${safeError}"`);
    });
  } else {
    lines.push("  []");
  }
  lines.push("");
  lines.push("questions:");
  if (pending.length > 0) {
    pending.slice(0, 3).forEach((t) => {
      lines.push(`  - "Resume: ${t.content.replace(/"/g, '\\"')}"`);
    });
  } else {
    lines.push("  []");
  }
  lines.push("");
  lines.push("decisions:");
  lines.push('  - auto_compact: "Context limit reached, auto-compacted"');
  lines.push("");
  lines.push("findings:");
  lines.push(
    `  - tool_calls: "${summary.recentToolCalls.length} recent tool calls"`,
  );
  lines.push(
    `  - files_modified: "${summary.filesModified.length} files changed"`,
  );
  lines.push("");
  lines.push("worked:");
  const successfulTools = summary.recentToolCalls.filter((t) => t.success);
  if (successfulTools.length > 0) {
    lines.push(
      `  - "${successfulTools.map((t) => t.name).join(", ")} completed successfully"`,
    );
  } else {
    lines.push("  []");
  }
  lines.push("");
  lines.push("failed:");
  const failedTools = summary.recentToolCalls.filter((t) => !t.success);
  if (failedTools.length > 0) {
    lines.push(
      `  - "${failedTools.map((t) => t.name).join(", ")} encountered errors"`,
    );
  } else {
    lines.push("  []");
  }
  lines.push("");
  lines.push("next:");
  if (inProgress.length > 0) {
    lines.push(`  - "Continue: ${inProgress[0].content.replace(/"/g, '\\"')}"`);
  }
  if (pending.length > 0) {
    pending.slice(0, 2).forEach((t) => {
      lines.push(`  - "${t.content.replace(/"/g, '\\"')}"`);
    });
  }
  if (inProgress.length === 0 && pending.length === 0) {
    lines.push('  - "Review session state and continue"');
  }
  lines.push("");
  lines.push("files:");
  lines.push("  created: []");
  lines.push("  modified:");
  if (summary.filesModified.length > 0) {
    summary.filesModified.slice(0, 10).forEach((f) => {
      lines.push(`    - "${f}"`);
    });
  } else {
    lines.push("    []");
  }
  return lines.join("\n");
}
var isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(
      "Usage: npx tsx transcript-parser.ts <transcript-path> [session-name]",
    );
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
export { generateAutoHandoff, parseTranscript };
