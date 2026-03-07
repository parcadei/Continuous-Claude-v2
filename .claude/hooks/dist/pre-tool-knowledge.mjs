#!/usr/bin/env node

// src/pre-tool-knowledge.ts
import * as fs from "fs";
import * as path from "path";
var IMPLEMENTATION_TRIGGERS = [
  "implement",
  "create",
  "add",
  "build",
  "write",
  "develop",
  "make",
  "fix",
  "update",
  "refactor",
  "kraken",
  "spark",
  "architect"
];
var TASK_TYPE_PATTERNS = {
  "add_api_endpoint": ["api", "endpoint", "route", "controller", "rest"],
  "add_database_model": ["database", "model", "schema", "migration", "table"],
  "add_component": ["component", "ui", "view", "page", "widget"],
  "add_test": ["test", "spec", "testing", "coverage"],
  "add_hook": ["hook", "hooks"],
  "add_skill": ["skill", "skills"]
};
function isImplementationTask(input) {
  const toolName = input.tool_name.toLowerCase();
  const taskPrompt = String(input.tool_input?.prompt || "").toLowerCase();
  const subagentType = String(input.tool_input?.subagent_type || "").toLowerCase();
  if (toolName !== "agent" && toolName !== "task") return false;
  for (const trigger of IMPLEMENTATION_TRIGGERS) {
    if (taskPrompt.includes(trigger) || subagentType.includes(trigger)) {
      return true;
    }
  }
  return false;
}
function detectTaskType(prompt) {
  const promptLower = prompt.toLowerCase();
  for (const [taskType, keywords] of Object.entries(TASK_TYPE_PATTERNS)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword)) {
        return taskType;
      }
    }
  }
  return null;
}
function loadKnowledgeTree(projectDir) {
  const treePath = path.join(projectDir, ".claude", "knowledge-tree.json");
  if (!fs.existsSync(treePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(treePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function buildFallbackContext(projectDir) {
  const lines = ["## Project Context (no knowledge tree)"];
  lines.push("");
  lines.push("**Note:** No knowledge-tree.json found. Generate one with:");
  lines.push("```");
  lines.push("cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/knowledge_tree.py --project . --verbose");
  lines.push("```");
  lines.push("");
  const pkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      lines.push(`**Project:** ${pkg.name || "unknown"}`);
      if (pkg.description) lines.push(`**Description:** ${pkg.description}`);
      const deps = Object.keys(pkg.dependencies || {}).slice(0, 8);
      const devDeps = Object.keys(pkg.devDependencies || {}).slice(0, 5);
      if (deps.length > 0) lines.push(`**Dependencies:** ${deps.join(", ")}`);
      if (devDeps.length > 0) lines.push(`**Dev deps:** ${devDeps.join(", ")}`);
    } catch {
    }
  }
  const pyprojectPath = path.join(projectDir, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    try {
      const content = fs.readFileSync(pyprojectPath, "utf-8");
      const nameMatch = content.match(/^name\s*=\s*"([^"]+)"/m);
      if (nameMatch) lines.push(`**Project:** ${nameMatch[1]}`);
      const descMatch = content.match(/^description\s*=\s*"([^"]+)"/m);
      if (descMatch) lines.push(`**Description:** ${descMatch[1]}`);
    } catch {
    }
  }
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true }).filter((e) => !e.name.startsWith(".") && !e.name.startsWith("node_modules")).slice(0, 15);
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    if (dirs.length > 0) {
      lines.push("");
      lines.push(`**Directories:** ${dirs.join(", ")}`);
    }
    if (files.length > 0) {
      lines.push(`**Root files:** ${files.join(", ")}`);
    }
  } catch {
  }
  const readmePath = path.join(projectDir, "README.md");
  if (fs.existsSync(readmePath)) {
    try {
      const readme = fs.readFileSync(readmePath, "utf-8");
      const firstLines = readme.split("\n").slice(0, 5).join("\n").trim();
      if (firstLines) {
        lines.push("");
        lines.push("**README excerpt:**");
        lines.push(firstLines);
      }
    } catch {
    }
  }
  return lines.join("\n");
}
function buildContextForTask(tree, taskType) {
  const lines = ["## Project Knowledge Tree Context"];
  lines.push("");
  lines.push(`**Project:** ${tree.project.name} (${tree.project.type})`);
  if (tree.project.description) {
    lines.push(`**Description:** ${tree.project.description}`);
  }
  if (tree.project.stack.length > 0) {
    lines.push(`**Stack:** ${tree.project.stack.join(", ")}`);
  }
  if (tree.goals.current) {
    lines.push("");
    lines.push(`**Current Goal:** ${tree.goals.current.title}`);
    if (tree.goals.current.description) {
      lines.push(`  ${tree.goals.current.description}`);
    }
  }
  if (taskType && tree.navigation.common_tasks[taskType]) {
    lines.push("");
    lines.push(`**Relevant Locations for ${taskType}:**`);
    for (const loc of tree.navigation.common_tasks[taskType]) {
      const dirInfo = tree.structure.directories[loc];
      if (dirInfo) {
        lines.push(`- \`${loc}\`: ${dirInfo.purpose}`);
      } else {
        lines.push(`- \`${loc}\``);
      }
    }
  }
  const relevantComponents = tree.components.slice(0, 3);
  if (relevantComponents.length > 0) {
    lines.push("");
    lines.push("**Key Components:**");
    for (const comp of relevantComponents) {
      lines.push(`- **${comp.name}** (${comp.type}): ${comp.description || "No description"}`);
      if (comp.files.length > 0) {
        lines.push(`  Files: ${comp.files.slice(0, 3).join(", ")}`);
      }
    }
  }
  if (Object.keys(tree.navigation.entry_points).length > 0) {
    lines.push("");
    lines.push("**Entry Points:**");
    for (const [name, loc] of Object.entries(tree.navigation.entry_points)) {
      lines.push(`- ${name}: \`${loc}\``);
    }
  }
  return lines.join("\n");
}
async function main() {
  const input = await readStdin();
  if (!input.trim()) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  if (!isImplementationTask(data)) {
    console.log(JSON.stringify({ result: "continue" }));
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const tree = loadKnowledgeTree(projectDir);
  if (!tree) {
    console.error("\u26A0 Knowledge tree missing \u2014 injecting fallback context");
    const fallback = buildFallbackContext(projectDir);
    const output2 = {
      result: "continue",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: fallback
      }
    };
    console.log(JSON.stringify(output2));
    return;
  }
  const prompt = String(data.tool_input?.prompt || "");
  const taskType = detectTaskType(prompt);
  const context = buildContextForTask(tree, taskType);
  console.error(`\u2713 Knowledge tree context injected for: ${tree.project.name}`);
  const output = {
    result: "continue",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: context
    }
  };
  console.log(JSON.stringify(output));
}
async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => data += chunk);
    process.stdin.on("end", () => resolve(data));
  });
}
main().catch((err) => {
  console.error("pre-tool-knowledge error:", err);
  console.log(JSON.stringify({ result: "continue" }));
});
