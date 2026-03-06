/**
 * Navigator Validate - Agent Validation Hook (PreToolUse:Task)
 *
 * Validates that spawned agents match the detected task type.
 * Warns on:
 * - Agent mismatch (e.g., spawning kraken for research)
 * - Model = haiku (violates agent-model-selection.md)
 */

import { readFileSync } from 'fs';
import {
  loadState,
  isAgentValidForTask,
  getSuggestedAgents,
  TaskType,
} from './shared/navigator-state.js';
import { outputContinue } from './shared/output.js';

interface PreToolUseInput {
  session_id: string;
  tool_name: string;
  tool_input: {
    subagent_type?: string;
    model?: string;
    prompt?: string;
    description?: string;
  };
}

interface PreToolUseOutput {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
  };
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

/**
 * Build warning message for agent mismatch.
 */
function buildMismatchWarning(
  agentType: string,
  taskType: TaskType,
  suggestedAgents: string[]
): string {
  const suggestions = suggestedAgents.slice(0, 3).join(', ');
  return `
NAVIGATOR WARNING: Agent mismatch detected

Spawning: ${agentType}
Detected Task: ${taskType}
Suggested Agents: ${suggestions}

This agent may not be optimal for ${taskType.toLowerCase()} tasks.
Consider using one of the suggested agents instead.
`.trim();
}

/**
 * Build warning message for haiku model.
 */
function buildHaikuWarning(agentType: string): string {
  return `
NAVIGATOR WARNING: Model violation

Agent: ${agentType}
Model: haiku (NOT RECOMMENDED)

Per agent-model-selection.md, haiku should only be used for
truly mechanical tasks. Most agents need sonnet/opus accuracy.

Remove the model parameter to inherit the parent model.
`.trim();
}

async function main() {
  const input: PreToolUseInput = JSON.parse(readStdin());

  // Only process Agent/Task tool calls
  if (input.tool_name !== 'Agent' && input.tool_name !== 'Task') {
    outputContinue();
    return;
  }

  const agentType = input.tool_input.subagent_type;
  const model = input.tool_input.model;

  if (!agentType) {
    outputContinue();
    return;
  }

  // Load session state to get detected task type
  const state = loadState(input.session_id);
  const taskType = state.detectedTaskType;

  const warnings: string[] = [];

  // Check agent-task match
  if (taskType && taskType !== 'UNKNOWN' && taskType !== 'CASUAL') {
    if (!isAgentValidForTask(agentType, taskType)) {
      const suggestedAgents = getSuggestedAgents(taskType);
      warnings.push(buildMismatchWarning(agentType, taskType, suggestedAgents));
    }
  }

  // Check for haiku model (rule violation)
  if (model?.toLowerCase() === 'haiku') {
    warnings.push(buildHaikuWarning(agentType));
  }

  if (warnings.length > 0) {
    // Output warning but allow (soft enforcement)
    const output: PreToolUseOutput = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: warnings.join('\n\n---\n\n'),
      },
    };
    console.log(JSON.stringify(output));
  } else {
    outputContinue();
  }
}

main().catch(() => {
  outputContinue();
});
