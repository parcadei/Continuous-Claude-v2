#!/usr/bin/env node
/**
 * Task Router Hook (Simplified)
 *
 * Recommends appropriate agents based on task prompt content.
 * Does NOT block - just adds recommendations to help Claude choose.
 *
 * Agent Routing:
 * - Exploration → scout (existing explore-to-scout handles this)
 * - External research → oracle
 * - Implementation (complex) → kraken
 * - Quick fix → spark
 * - Planning → architect or phoenix
 * - Bug investigation → debug-agent or sleuth
 * - Performance → profiler
 * - Testing → arbiter
 */

import { readFileSync } from 'fs';

interface AgentRoute {
  agent: string;
  triggers: RegExp;
  antiTriggers?: RegExp;
  confidence: number;
  description: string;
}

const AGENT_ROUTES: AgentRoute[] = [
  {
    agent: 'oracle',
    triggers: /\b(research|docs|documentation|api|external|library|npm|package|web\s*search)\b/i,
    confidence: 0.85,
    description: 'External research - docs, APIs, libraries'
  },
  {
    agent: 'kraken',
    triggers: /\b(implement|build|create|add|develop)\s+(?:a\s+)?(?:new\s+)?(feature|component|module|service|api|endpoint)/i,
    confidence: 0.80,
    description: 'Complex implementation with TDD workflow'
  },
  {
    agent: 'spark',
    triggers: /\b(fix|tweak|small|quick|minor|simple)\s+(bug|issue|change|update)/i,
    confidence: 0.75,
    description: 'Lightweight fixes and quick tweaks'
  },
  {
    agent: 'architect',
    triggers: /\b(plan|design|architecture|structure|organize|diagram)\s+(the\s+)?(system|feature|module)/i,
    confidence: 0.80,
    description: 'Feature planning and design'
  },
  {
    agent: 'phoenix',
    triggers: /\b(refactor|migrate|upgrade|restructure|rewrite)\s+(the\s+)?(codebase|module|system)/i,
    confidence: 0.80,
    description: 'Refactoring and migration planning'
  },
  {
    agent: 'debug-agent',
    triggers: /\b(investigate|debug|trace|diagnose)\s+(the\s+)?(error|bug|issue|problem|crash)/i,
    confidence: 0.85,
    description: 'Bug investigation using logs and code search'
  },
  {
    agent: 'sleuth',
    triggers: /\b(root\s*cause|why\s+is|find\s+the\s+cause|what\'s\s+causing)/i,
    confidence: 0.80,
    description: 'Root cause analysis'
  },
  {
    agent: 'profiler',
    triggers: /\b(performance|slow|optimize|memory|race\s*condition|bottleneck)/i,
    confidence: 0.80,
    description: 'Performance profiling and optimization'
  },
  {
    agent: 'arbiter',
    triggers: /\b(run|execute|validate)\s+(tests?|specs?|suite)/i,
    confidence: 0.80,
    description: 'Test execution and validation'
  },
  {
    agent: 'scribe',
    triggers: /\b(document|write\s+docs|create\s+documentation|handoff|summary)/i,
    confidence: 0.75,
    description: 'Documentation and handoffs'
  }
];

interface HookInput {
  tool_name: string;
  tool_input: {
    prompt?: string;
    description?: string;
    subagent_type?: string;
  };
  session_id?: string;
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision: 'allow' | 'deny';
    permissionDecisionReason?: string;
    additionalContext?: string;
  };
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

function extractPrompt(toolInput: HookInput['tool_input']): string | null {
  if (typeof toolInput.prompt === 'string') {
    return toolInput.prompt;
  }
  if (typeof toolInput.description === 'string') {
    return toolInput.description;
  }
  return null;
}

function findBestAgent(prompt: string): AgentRoute | null {
  let bestMatch: AgentRoute | null = null;
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

const GENERIC_AGENTS = new Set([
  'general-purpose',
  'explore',
]);

function makeAllowOutput(): HookOutput {
  return {};
}

function makeSuggestOutput(route: AgentRoute, currentAgent?: string): HookOutput {
  const confidencePct = Math.round(route.confidence * 100);
  const message = [
    '--- AGENT SUGGESTION ---',
    `You're using: ${currentAgent || 'general-purpose'}`,
    `Better fit: **${route.agent}** (${confidencePct}% confidence)`,
    `  -> ${route.description}`,
    `Consider using subagent_type: "${route.agent}"`,
    'Proceeding with current agent...',
    '------------------------'
  ].join('\n');
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
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

    let input: HookInput;
    try {
      input = JSON.parse(rawInput);
    } catch {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }

    if (input.tool_name !== 'Agent' && input.tool_name !== 'Task') {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }

    const prompt = extractPrompt(input.tool_input);
    if (!prompt) {
      console.log(JSON.stringify(makeAllowOutput()));
      return;
    }

    const currentAgent = input.tool_input.subagent_type || 'general-purpose';
    const bestAgent = findBestAgent(prompt);

    if (bestAgent && GENERIC_AGENTS.has(currentAgent.toLowerCase())) {
      if (currentAgent.toLowerCase() !== bestAgent.agent.toLowerCase()) {
        const output = makeSuggestOutput(bestAgent, currentAgent);
        console.log(JSON.stringify(output));
        return;
      }
    }

    // Allow the task to proceed
    console.log(JSON.stringify(makeAllowOutput()));
  } catch (err) {
    console.log(JSON.stringify(makeAllowOutput()));
  }
}

main();
