#!/usr/bin/env node

// src/failure-detection.ts
import { readFileSync } from "fs";
var TASK_ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bexception\b/i,
  /\bcrash(ed)?\b/i,
  /\btimeout\b/i,
  /\babort(ed)?\b/i,
  /\bpanic\b/i,
  /\bfatal\b/i,
];
var ERROR_CONTEXT_PATTERNS = [
  /ModuleNotFoundError:\s*No module named\s*['"]?(\w+)['"]?/i,
  /ImportError:\s*(.+)/i,
  /TypeError:\s*(.+)/i,
  /ValueError:\s*(.+)/i,
  /AttributeError:\s*(.+)/i,
  /NameError:\s*(.+)/i,
  /SyntaxError:\s*(.+)/i,
  /RuntimeError:\s*(.+)/i,
  /KeyError:\s*(.+)/i,
  /FileNotFoundError:\s*(.+)/i,
  /PermissionError:\s*(.+)/i,
  /ConnectionError:\s*(.+)/i,
  /OSError:\s*(.+)/i,
  /Error:\s*(.+)/i,
  /error:\s*(.+)/i,
  /failed:\s*(.+)/i,
  /FAILED:\s*(.+)/i,
];
function isBashFailure(response) {
  if (typeof response === "object" && response !== null) {
    const bashResponse = response;
    if (
      typeof bashResponse.exit_code === "number" &&
      bashResponse.exit_code !== 0
    ) {
      const stderr = bashResponse.stderr || "";
      const stdout = bashResponse.stdout || "";
      return {
        failed: true,
        errorText: stderr || stdout,
      };
    }
  }
  return { failed: false, errorText: "" };
}
function isTaskFailure(response) {
  let text = "";
  if (typeof response === "string") {
    text = response;
  } else if (typeof response === "object" && response !== null) {
    text = JSON.stringify(response);
  }
  for (const pattern of TASK_ERROR_PATTERNS) {
    if (pattern.test(text)) {
      return { failed: true, errorText: text };
    }
  }
  return { failed: false, errorText: "" };
}
function extractErrorContext(errorText, toolInput) {
  for (const pattern of ERROR_CONTEXT_PATTERNS) {
    const match = pattern.exec(errorText);
    if (match) {
      const context = match[1] || match[0];
      return context.substring(0, 100).trim();
    }
  }
  const firstLine = errorText.split("\n")[0] || "";
  if (firstLine.length > 100) {
    return firstLine.substring(0, 100).trim();
  }
  if (toolInput.command && typeof toolInput.command === "string") {
    return `command failed: ${toolInput.command.substring(0, 50)}`;
  }
  return "execution failed";
}
function buildNiaSearchCommand(errorContext) {
  const escapedContext = errorContext
    .replace(/'/g, "'\\''")
    .replace(/"/g, '\\"');
  return `uv run python -m runtime.harness scripts/nia_docs.py search universal "${escapedContext}" --limit 5`;
}
async function main() {
  let input;
  try {
    const rawInput = readFileSync(0, "utf-8");
    input = JSON.parse(rawInput);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (input.tool_name !== "Bash" && input.tool_name !== "Task") {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let failed = false;
  let errorText = "";
  if (input.tool_name === "Bash") {
    const result = isBashFailure(input.tool_response);
    failed = result.failed;
    errorText = result.errorText;
  } else if (input.tool_name === "Task") {
    const result = isTaskFailure(input.tool_response);
    failed = result.failed;
    errorText = result.errorText;
  }
  if (!failed) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const errorContext = extractErrorContext(errorText, input.tool_input);
  const niaCommand = buildNiaSearchCommand(errorContext);
  const output = {
    result: "continue",
    message: `
---
**Build/Execution Failure Detected**

Consider searching documentation for help:
\`\`\`bash
${niaCommand}
\`\`\`

Error context: ${errorContext.substring(0, 200)}
---`,
  };
  console.log(JSON.stringify(output));
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
});
