#!/usr/bin/env node
/**
 * Maestro Enforcer Hook
 *
 * Enforces the Maestro workflow by blocking Task tool until discovery interview is complete.
 *
 * Workflow:
 * 1. User activates Maestro (tracked via temp file)
 * 2. This hook BLOCKS Task tool until interview is marked complete
 * 3. Interview is marked complete when user provides discovery answers
 *
 * Runs on PreToolUse:Task
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { getStatePathWithMigration } from './shared/session-isolation.js';
import { createLogger } from './shared/logger.js';
import { writeStateWithLock, readStateWithLock } from './shared/atomic-write.js';
import { validateMaestroState } from './shared/state-schema.js';
import { logHook } from './shared/session-activity.js';

const log = createLogger('maestro-enforcer');

interface HookInput {
  tool_name: string;
  tool_input: {
    prompt?: string;
    description?: string;
    subagent_type?: string;
  };
  session_id?: string;
}

interface MaestroState {
  active: boolean;
  taskType: 'implementation' | 'research' | 'unknown';
  reconComplete: boolean;
  interviewComplete: boolean;
  planApproved: boolean;
  activatedAt: number;
  lastActivity?: number;
  sessionId?: string;
}

const STATE_BASE_NAME = 'maestro-state';
const STATE_TTL = 4 * 60 * 60 * 1000; // 4 hours (match maestro-state-manager)

function getStateFile(sessionId?: string): string {
  return getStatePathWithMigration(STATE_BASE_NAME, sessionId);
}

function readState(sessionId?: string): MaestroState | null {
  const stateFile = getStateFile(sessionId);
  if (!existsSync(stateFile)) {
    return null;
  }
  try {
    const content = readStateWithLock(stateFile);
    if (!content) return null;
    const state = validateMaestroState(JSON.parse(content), sessionId);
    if (!state) return null;
    const lastTime = state.lastActivity || state.activatedAt;
    if (Date.now() - lastTime > STATE_TTL) {
      unlinkSync(stateFile);
      return null;
    }
    return state;
  } catch (err) {
    log.error('Failed to read maestro state', { error: String(err), sessionId });
    return null;
  }
}

function writeState(state: MaestroState, sessionId?: string): void {
  const stateFile = getStateFile(sessionId);
  try {
    state.lastActivity = Date.now();
    state.sessionId = sessionId;
    writeStateWithLock(stateFile, JSON.stringify(state, null, 2));
  } catch {
    // Ignore write errors
  }
}

function clearState(sessionId?: string): void {
  const stateFile = getStateFile(sessionId);
  try {
    if (existsSync(stateFile)) {
      unlinkSync(stateFile);
    }
  } catch {
    // Ignore
  }
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

function makeBlockOutput(reason: string): void {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  };
  console.log(JSON.stringify(output));
}

function makeAllowOutput(): void {
  console.log(JSON.stringify({}));
}

async function main() {
  try {
    const rawInput = readStdin();
    if (!rawInput.trim()) {
      makeAllowOutput();
      return;
    }

    let input: HookInput;
    try {
      input = JSON.parse(rawInput);
    } catch {
      makeAllowOutput();
      return;
    }

    // Only process Agent/Task tool calls
    if (input.tool_name !== 'Agent' && input.tool_name !== 'Task') {
      makeAllowOutput();
      return;
    }

    const sessionId = input.session_id;
    const state = readState(sessionId);

    // If Maestro not active, allow all Task calls
    if (!state || !state.active) {
      makeAllowOutput();
      return;
    }

    // Maestro is active - log hook activation and check workflow phase and agent type
    try { logHook(sessionId || '', 'maestro-enforcer'); } catch { /* never break */ }
    log.info(`Checking Task tool: phase recon=${state.reconComplete} interview=${state.interviewComplete} plan=${state.planApproved}`, { sessionId });
    const agentType = input.tool_input.subagent_type?.toLowerCase() || 'general-purpose';
    const isScoutAgent = agentType === 'scout' || agentType === 'explore';

    // PHASE 1: Recon (implementation tasks only)
    // Allow scout agents, block everything else
    if (!state.reconComplete) {
      if (isScoutAgent) {
        // Allow scout during recon phase
        makeAllowOutput();
        return;
      } else {
        makeBlockOutput(`
🛑 MAESTRO WORKFLOW: Recon Phase

Currently in **Codebase Recon** phase.

**ALLOWED:** scout agents only (to explore codebase)
**BLOCKED:** ${agentType} agent

**WHY:** Need to understand the codebase before asking informed questions.

**TO PROCEED:**
1. Use scout agents to explore relevant code
2. Say "recon complete" when done
3. Then conduct discovery interview

Current agent "${agentType}" is blocked until recon complete.
`);
        return;
      }
    }

    // PHASE 2: Interview
    // Block all Task tools - must use AskUserQuestion
    if (!state.interviewComplete) {
      makeBlockOutput(`
🛑 MAESTRO WORKFLOW: Interview Phase

Recon complete. Now in **Discovery Interview** phase.

**REQUIRED:** Use AskUserQuestion to ask informed questions:
- Based on recon findings
- About scope, approach, constraints
- To clarify requirements

**BLOCKED:** All agents until interview complete.

**TO PROCEED:**
1. Ask discovery questions using AskUserQuestion
2. Say "interview complete" when done
3. Then propose orchestration plan
`);
      return;
    }

    // PHASE 3: Plan Approval
    // Block all Task tools - must wait for user approval
    if (!state.planApproved) {
      makeBlockOutput(`
🛑 MAESTRO WORKFLOW: Awaiting Approval

Interview complete. Plan presented.

**WAITING FOR:** User to approve the plan.

**BLOCKED:** All agents until user says "yes" or "approve".

**DO NOT spawn agents until explicit approval.**
`);
      return;
    }

    // PHASE 4: Execution - all agents allowed
    makeAllowOutput();

  } catch (err) {
    // Fail open - don't block on errors
    makeAllowOutput();
  }
}

main();
