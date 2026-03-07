#!/usr/bin/env node

// src/task-router.ts
import { readFileSync } from "fs";
var AGENT_ROUTES = [
  {
    agent: "oracle",
    triggers: /\b(research|docs|documentation|api|external|library|npm|package|web\s*search)\b/i,
    confidence: 0.85,
    description: "External research - docs, APIs, libraries"
  },
  {
    agent: "kraken",
    triggers: /\b(implement|build|create|add|develop)\s+(?:a\s+)?(?:new\s+)?(feature|component|module|service|api|endpoint)/i,
    confidence: 0.8,
    description: "Complex implementation with TDD workflow"
  },
  {
    agent: "spark",
    triggers: /\b(fix|tweak|small|quick|minor|simple)\s+(bug|issue|change|update)/i,
    confidence: 0.75,
    description: "Lightweight fixes and quick tweaks"
  },
  {
    agent: "architect",
    triggers: /\b(plan|design|architecture|structure|organize|diagram)\s+(the\s+)?(system|feature|module)/i,
    confidence: 0.8,
    description: "Feature planning and design"
  },
  {
    agent: "phoenix",
    triggers: /\b(refactor|migrate|upgrade|restructure|rewrite)\s+(the\s+)?(codebase|module|system)/i,
    confidence: 0.8,
    description: "Refactoring and migration planning"
  },
  {
    agent: "debug-agent",
    triggers: /\b(investigate|debug|trace|diagnose)\s+(the\s+)?(error|bug|issue|problem|crash)/i,
    confidence: 0.85,
    description: "Bug investigation using logs and code search"
  },
  {
    agent: "sleuth",
    triggers: /\b(root\s*cause|why\s+is|find\s+the\s+cause|what\'s\s+causing)/i,
    confidence: 0.8,
    description: "Root cause analysis"
  },
  {
    agent: "profiler",
    triggers: /\b(performance|slow|optimize|memory|race\s*condition|bottleneck)/i,
    confidence: 0.8,
    description: "Performance profiling and optimization"
  },
  {
    agent: "arbiter",
    triggers: /\b(run|execute|validate)\s+(tests?|specs?|suite)/i,
    confidence: 0.8,
    description: "Test execution and validation"
  },
  {
    agent: "scribe",
    triggers: /\b(document|write\s+docs|create\s+documentation|handoff|summary)/i,
    confidence: 0.75,
    description: "Documentation and handoffs"
  }
];
function readStdin() {
  return readFileSync(0, "utf-8");
}
function extractPrompt(toolInput) {
  if (typeof toolInput.prompt === "string") {
    return toolInput.prompt;
  }
  if (typeof toolInput.description === "string") {
    return toolInput.description;
  }
  return null;
}
function findBestAgent(prompt) {
  let bestMatch = null;
  let highestConfidence = 0;
  for (const route of AGENT_ROUTES) {
    if (route.triggers.test(prompt)) {
      if (route.antiTriggers && route.antiTriggers.test(prompt)) {
        continue;
      }
      if (route.confidence > highestConfidence) {
        bestMatch = route;
        highestConfidence = route.confidence;
      }
    }
  }
  return bestMatch;
}
var GENERIC_AGENTS = /* @__PURE__ */ new Set([
  "general-purpose",
  "explore"
]);
function makeAllowOutput() {
  return {};
}
function makeSuggestOutput(route, currentAgent) {
  const confidencePct = Math.round(route.confidence * 100);
  const message = [
    "--- AGENT SUGGESTION ---",
    `You're using: ${currentAgent || "general-purpose"}`,
    `Better fit: **${route.agent}** (${confidencePct}% confidence)`,
    `  -> ${route.description}`,
    `Consider using subagent_type: "${route.agent}"`,
    "Proceeding with current agent...",
    "------------------------"
  ].join("\n");
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      additionalContext: message
    }
  };
}
async function main() {
  try {
    const rawInput = readStdin();
    if (!rawInput.trim()) {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }
    let input;
    try {
      input = JSON.parse(rawInput);
    } catch {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }
    if (input.tool_name !== "Agent" && input.tool_name !== "Task") {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }
    const prompt = extractPrompt(input.tool_input);
    if (!prompt) {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }
    const currentAgent = input.tool_input.subagent_type || "general-purpose";
    const bestAgent = findBestAgent(prompt);
    if (bestAgent && GENERIC_AGENTS.has(currentAgent.toLowerCase())) {
      if (currentAgent.toLowerCase() !== bestAgent.agent.toLowerCase()) {
        const output = makeSuggestOutput(bestAgent, currentAgent);
        console.log(JSON.stringify(output));
        return;
      }
    }
    console.log(JSON.stringify(makeAllowOutput()));
  } catch (err) {
    console.log(JSON.stringify(makeAllowOutput()));
  }
}
main();
