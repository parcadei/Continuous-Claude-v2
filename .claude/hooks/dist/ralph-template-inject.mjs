#!/usr/bin/env node

// src/ralph-template-inject.ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
var RALPH_KEYWORDS = [
  "ralph",
  "prd",
  "feature",
  "build",
  "implement",
  "create",
  "autonomous",
  "workflow",
  "develop",
  "tasks"
];
function shouldInjectTemplates(prompt, subagentType) {
  if (subagentType !== "maestro") {
    return false;
  }
  const lowerPrompt = prompt.toLowerCase();
  return RALPH_KEYWORDS.some((kw) => lowerPrompt.includes(kw));
}
function loadTemplate(templatePath) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const fullPath = templatePath.startsWith("~/") ? join(homeDir, templatePath.slice(2)) : templatePath;
  if (existsSync(fullPath)) {
    try {
      return readFileSync(fullPath, "utf-8");
    } catch {
      return null;
    }
  }
  return null;
}
function buildInjectedPrompt(originalPrompt) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const prdTemplatePath = join(homeDir, ".claude", "ai-dev-tasks", "create-prd.md");
  const tasksTemplatePath = join(homeDir, ".claude", "ai-dev-tasks", "generate-tasks.md");
  const prdTemplate = loadTemplate(prdTemplatePath);
  const tasksTemplate = loadTemplate(tasksTemplatePath);
  let injectedContent = "";
  injectedContent += "\u2550".repeat(60) + "\n";
  injectedContent += "\u{1F4CB} RALPH WORKFLOW TEMPLATES (AUTO-INJECTED)\n";
  injectedContent += "\u2550".repeat(60) + "\n\n";
  injectedContent += "You MUST follow these templates exactly.\n";
  injectedContent += "Deviation will be blocked by the prd-task-template-enforcer hook.\n\n";
  if (prdTemplate) {
    injectedContent += "\u2500".repeat(40) + "\n";
    injectedContent += "PRD TEMPLATE (create-prd.md)\n";
    injectedContent += "\u2500".repeat(40) + "\n";
    injectedContent += prdTemplate + "\n\n";
  }
  if (tasksTemplate) {
    injectedContent += "\u2500".repeat(40) + "\n";
    injectedContent += "TASKS TEMPLATE (generate-tasks.md)\n";
    injectedContent += "\u2500".repeat(40) + "\n";
    injectedContent += tasksTemplate + "\n\n";
  }
  injectedContent += "\u2550".repeat(60) + "\n";
  injectedContent += "WORKFLOW REQUIREMENTS:\n";
  injectedContent += "1. Ask clarifying questions BEFORE generating PRD\n";
  injectedContent += "2. ALWAYS ask about UI components (see PRD template)\n";
  injectedContent += "3. Wait for user answers before proceeding\n";
  injectedContent += '4. Generate parent tasks first, wait for "Go"\n';
  injectedContent += "5. Then generate sub-tasks\n";
  injectedContent += "6. Save to /tasks/ directory with correct filenames\n";
  injectedContent += "\n";
  injectedContent += "FRONTEND DESIGN (MANDATORY for UI features):\n";
  injectedContent += '- Include "Frontend Design Stack" section in PRD\n';
  injectedContent += '- Include task 0.5 "Setup frontend design tooling"\n';
  injectedContent += "- Tools: frontend-design plugin, shadcn-create skill, shadcn MCP\n";
  injectedContent += "\u2550".repeat(60) + "\n\n";
  injectedContent += "\u2500".repeat(40) + "\n";
  injectedContent += "ORIGINAL TASK:\n";
  injectedContent += "\u2500".repeat(40) + "\n";
  injectedContent += originalPrompt;
  return injectedContent;
}
function main() {
  try {
    const input = readFileSync(0, "utf-8");
    const data = JSON.parse(input);
    if (data.event !== "PreToolUse" || data.tool_name !== "Agent" && data.tool_name !== "Task") {
      console.log(JSON.stringify({ result: "allow" }));
      return;
    }
    const prompt = data.tool_input?.prompt || "";
    const subagentType = data.tool_input?.subagent_type || "";
    if (!shouldInjectTemplates(prompt, subagentType)) {
      console.log(JSON.stringify({ result: "allow" }));
      return;
    }
    const modifiedPrompt = buildInjectedPrompt(prompt);
    const output = {
      result: "allow",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        modifiedInput: { prompt: modifiedPrompt },
        additionalContext: "Ralph workflow templates injected into Maestro prompt"
      }
    };
    console.log(JSON.stringify(output));
  } catch (error) {
    console.log(JSON.stringify({ result: "allow" }));
  }
}
main();
