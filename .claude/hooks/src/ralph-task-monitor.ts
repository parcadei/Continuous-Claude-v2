#!/usr/bin/env node
/**
 * Ralph Task Monitor Hook
 *
 * PostToolUse hook for Task tool that monitors agent results.
 * When a Task tool agent completes, checks for success/failure patterns
 * and updates the unified Ralph state accordingly.
 *
 * This creates visibility for agents spawned via Task tool,
 * which ralph-monitor.ts (Bash-only) cannot see.
 *
 * Runs on PostToolUse:Task
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createLogger } from './shared/logger.js';
import { readRalphUnifiedState } from './shared/state-schema.js';

const log = createLogger('ralph-task-monitor');

interface HookInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: {
    prompt?: string;
    subagent_type?: string;
    description?: string;
  };
  tool_result?: {
    stdout?: string;
    stderr?: string;
    content?: string;
    text?: string;
  };
}

// ─── Structured status detection (Priority 1) ──────────────
// Agents can output structured JSON for unambiguous status reporting.
// Format: {"ralph_status": {"task_id": "X.Y", "status": "complete", "commit": "abc123"}}
// Optional deploy_status: "preview_success" | "preview_failed" | "skipped" | null
interface RalphStructuredStatus {
  task_id: string;
  status: 'complete' | 'failed' | 'blocked';
  commit?: string;
  error?: string;
  deploy_status?: 'preview_success' | 'preview_failed' | 'skipped' | null;
}

const STRUCTURED_JSON_RE = /\{"ralph_status"\s*:\s*\{[^}]+\}\s*\}/;

// ─── XML status detection (Priority 2) ─────────────────────
// Format: <TASK_COMPLETE task="1.1" commit="abc123"/>
const XML_TASK_COMPLETE_RE = /<TASK_COMPLETE\s+task="(\d+(?:\.\d+)?)"\s*(?:commit="([^"]*)")?\s*\/?>/i;
const XML_TASK_FAIL_RE = /<TASK_FAIL\s+task="(\d+(?:\.\d+)?)"\s*(?:error="([^"]*)")?\s*\/?>/i;

// ─── Pattern matching (Priority 3 — fallback) ──────────────
// Patterns indicating agent success
const SUCCESS_PATTERNS = [
  /task\s+(?:is\s+)?complete/i,
  /implementation\s+(?:is\s+)?complete/i,
  /all\s+tests?\s+pass/i,
  /successfully\s+(?:implemented|completed|created|fixed)/i,
  /changes?\s+(?:have been|were)\s+(?:made|applied|committed)/i,
  /<TASK_COMPLETE\s*\/?>/i,
  /<COMPLETE\s*\/?>/i,
];

// Pattern to extract task ID from agent prompt or output
// Matches: "Task ID: 1.2", "Task: 1.2", "task_id: 1.2", "task 1.2"
const TASK_ID_PATTERN = /(?:task_id|Task ID|Task|task)[:\s_-]*(\d+(?:\.\d+)?)/i;

// Patterns indicating agent failure
const FAILURE_PATTERNS = [
  /(?:test|build|compilation)\s+(?:failed|failing|errors?)/i,
  /could\s+not\s+(?:complete|fix|resolve)/i,
  /blocked\s+(?:by|on|due)/i,
  /<BLOCKED(?:\s+reason="([^"]+)")?\s*\/?>/i,
  /<ERROR(?:\s+reason="([^"]+)")?\s*\/?>/i,
  /unable\s+to\s+(?:complete|resolve|implement)/i,
];

function readStdin(): string {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '{}';
  }
}

/**
 * Priority 1: Try to parse structured JSON status from agent output.
 * Returns null if no structured status found.
 */
function detectStructuredJSON(text: string): { taskId: string; success: boolean; commit?: string; reason?: string; deploy_status?: string } | null {
  const match = text.match(STRUCTURED_JSON_RE);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    const status: RalphStructuredStatus = parsed.ralph_status;
    if (!status || !status.task_id || !status.status) return null;

    const result: { taskId: string; success: boolean; commit?: string; reason?: string; deploy_status?: string } = {
      taskId: status.task_id,
      success: status.status === 'complete',
      commit: status.commit,
      reason: status.error || (status.status === 'failed' ? 'Agent reported failure' : undefined),
    };

    // Include deploy_status if present and non-null
    if (status.deploy_status !== undefined && status.deploy_status !== null) {
      result.deploy_status = status.deploy_status;
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Priority 2: Try to parse XML task status tags.
 * Returns null if no XML status found.
 */
function detectXMLStatus(text: string): { taskId: string; success: boolean; commit?: string; reason?: string } | null {
  const completeMatch = text.match(XML_TASK_COMPLETE_RE);
  if (completeMatch) {
    return {
      taskId: completeMatch[1],
      success: true,
      commit: completeMatch[2] || undefined,
    };
  }

  const failMatch = text.match(XML_TASK_FAIL_RE);
  if (failMatch) {
    return {
      taskId: failMatch[1],
      success: false,
      reason: failMatch[2] || 'Agent reported failure',
    };
  }

  return null;
}

/**
 * Priority 3: Fallback pattern matching (original behavior).
 */
function detectOutcome(text: string): { success: boolean; reason?: string } | null {
  // Check failure first (more specific)
  for (const pattern of FAILURE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { success: false, reason: match[1] || match[0] };
    }
  }

  // Check success
  for (const pattern of SUCCESS_PATTERNS) {
    if (pattern.test(text)) {
      return { success: true };
    }
  }

  return null;
}

function getV2ScriptPath(): string | null {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const v2Script = join(homeDir, '.claude', 'scripts', 'ralph', 'ralph-state-v2.py');
  return existsSync(v2Script) ? v2Script : null;
}

async function main() {
  let input: HookInput = {};
  try {
    input = JSON.parse(readStdin());
  } catch {
    return;
  }

  // Only process Agent/Task tool results
  if (input.tool_name !== 'Agent' && input.tool_name !== 'Task') return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Check if Ralph is active with unified state
  const unified = readRalphUnifiedState(projectDir);
  if (!unified?.session?.active) return;

  const v2Script = getV2ScriptPath();
  if (!v2Script) return;

  // Get the agent result text
  const resultText = input.tool_result?.stdout
    || input.tool_result?.content
    || input.tool_result?.text
    || '';

  if (!resultText) return;

  const agentType = input.tool_input?.subagent_type || 'unknown';
  const description = input.tool_input?.description || '';
  const agentPrompt = String(input.tool_input?.prompt || '');

  // ─── Priority 1: Structured JSON status ───────────────────
  const structuredResult = detectStructuredJSON(resultText);
  if (structuredResult) {
    log.info(`Structured status detected for task ${structuredResult.taskId}`, { agentType, method: 'json' });
    const commitArgs = structuredResult.commit ? ['--commit', structuredResult.commit] : [];
    if (structuredResult.success) {
      spawnSync('python', [
        v2Script, '-p', projectDir, 'task-complete', '--id', structuredResult.taskId, ...commitArgs
      ], { encoding: 'utf-8', timeout: 5000 });
    } else {
      spawnSync('python', [
        v2Script, '-p', projectDir, 'task-fail', '--id', structuredResult.taskId,
        '--error', structuredResult.reason || 'Agent reported failure'
      ], { encoding: 'utf-8', timeout: 5000 });
    }

    const marker = structuredResult.success ? 'complete' : `failed: ${structuredResult.reason || 'unknown'}`;
    const deployInfo = structuredResult.deploy_status ? ` [deploy: ${structuredResult.deploy_status}]` : '';
    const message = `\nRALPH TASK MONITOR: ${agentType} -> task ${structuredResult.taskId} ${marker}${deployInfo} (structured JSON)\n`;
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message } }));
    return;
  }

  // ─── Priority 1.5: Generic agent JSON success format ──────
  // Handles common agent output: {"status": "success", ...} or {"status": "complete", ...}
  // Only fires when there is exactly 1 in-progress task (no ambiguity).
  {
    let parsed: any = null;
    try {
      // Try to find a JSON object in the output (may have surrounding text)
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // not valid JSON, skip
    }

    if (parsed && (parsed.status === 'success' || parsed.status === 'complete')) {
      // Fetch current task list to check for unambiguous single in-progress task
      const listResult = spawnSync('python', [
        v2Script, '-p', projectDir, 'task-list'
      ], { encoding: 'utf-8', timeout: 5000 });

      if (listResult.status === 0) {
        let allTasks: any[] = [];
        try {
          allTasks = JSON.parse(listResult.stdout).tasks || [];
        } catch { /* ignore */ }

        const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress');

        if (inProgressTasks.length === 1) {
          const task = inProgressTasks[0];
          const taskId = String(task.id);
          log.info(`Generic JSON success detected, auto-completing single in-progress task ${taskId}`, { agentType, method: 'json-fallback' });
          spawnSync('python', [
            v2Script, '-p', projectDir, 'task-complete', '--id', taskId
          ], { encoding: 'utf-8', timeout: 5000 });
          const message = `\nRALPH TASK MONITOR: ${agentType} -> task ${taskId} complete (generic JSON status)\n`;
          console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message } }));
          return;
        } else if (inProgressTasks.length > 1) {
          log.info(`Generic JSON success found but ${inProgressTasks.length} in-progress tasks — skipping (ambiguous)`, { agentType });
        }
      }
    }
  }

  // ─── Priority 2: XML status tags ──────────────────────────
  const xmlResult = detectXMLStatus(resultText);
  if (xmlResult) {
    log.info(`XML status detected for task ${xmlResult.taskId}`, { agentType, method: 'xml' });
    const commitArgs = xmlResult.commit ? ['--commit', xmlResult.commit] : [];
    if (xmlResult.success) {
      spawnSync('python', [
        v2Script, '-p', projectDir, 'task-complete', '--id', xmlResult.taskId, ...commitArgs
      ], { encoding: 'utf-8', timeout: 5000 });
    } else {
      spawnSync('python', [
        v2Script, '-p', projectDir, 'task-fail', '--id', xmlResult.taskId,
        '--error', xmlResult.reason || 'Agent reported failure'
      ], { encoding: 'utf-8', timeout: 5000 });
    }

    const marker = xmlResult.success ? 'complete' : `failed: ${xmlResult.reason || 'unknown'}`;
    const message = `\nRALPH TASK MONITOR: ${agentType} -> task ${xmlResult.taskId} ${marker} (XML tag)\n`;
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message } }));
    return;
  }

  // ─── Priority 3: Pattern matching (original fallback) ─────
  const outcome = detectOutcome(resultText);

  if (!outcome) {
    log.info('No clear outcome detected from agent', { agentType, description });
    return;
  }

  // Find in-progress tasks to update
  const listResult = spawnSync('python', [
    v2Script, '-p', projectDir, 'task-list'
  ], { encoding: 'utf-8', timeout: 5000 });

  if (listResult.status !== 0) return;

  let allTasks: any[] = [];
  try {
    const parsed = JSON.parse(listResult.stdout);
    allTasks = parsed.tasks || [];
  } catch {
    return;
  }

  const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress');

  if (inProgressTasks.length === 0) {
    log.info('No in-progress tasks to update', { agentType });
    return;
  }

  // Try to extract task ID from agent prompt for disambiguation
  const taskIdMatch = agentPrompt.match(TASK_ID_PATTERN);
  const extractedTaskId = taskIdMatch ? taskIdMatch[1] : null;

  let tasksToUpdate: any[];

  if (extractedTaskId) {
    const matched = inProgressTasks.filter((t: any) => String(t.id) === extractedTaskId);
    if (matched.length > 0) {
      tasksToUpdate = matched;
      log.info(`Matched agent to task ${extractedTaskId} via prompt`, { agentType });
    } else {
      log.warn(`Task ID ${extractedTaskId} from prompt not found in in_progress tasks`, { agentType });
      return;
    }
  } else if (inProgressTasks.length === 1) {
    tasksToUpdate = inProgressTasks;
  } else {
    const byAgent = inProgressTasks.filter((t: any) => t.agent === agentType);
    if (byAgent.length === 1) {
      tasksToUpdate = byAgent;
      log.info(`Matched task ${byAgent[0].id} via agent type fallback`, { agentType });
    } else {
      log.warn(`Ambiguous: ${inProgressTasks.length} in_progress tasks, no task ID in prompt. Skipping update.`, { agentType });
      return;
    }
  }

  for (const task of tasksToUpdate) {
    const taskId = String(task.id);
    if (outcome.success) {
      log.info(`Agent completed task ${taskId}`, { agentType, taskName: task.name });
      spawnSync('python', [
        v2Script, '-p', projectDir, 'task-complete', '--id', taskId
      ], { encoding: 'utf-8', timeout: 5000 });
    } else {
      log.warn(`Agent failed task ${taskId}`, { agentType, reason: outcome.reason, taskName: task.name });
      spawnSync('python', [
        v2Script, '-p', projectDir, 'task-fail', '--id', taskId,
        '--error', outcome.reason || 'Agent reported failure'
      ], { encoding: 'utf-8', timeout: 5000 });
    }
  }

  const statusLines = [
    '',
    '-'.repeat(40),
    `RALPH TASK MONITOR: ${agentType} agent ${outcome.success ? 'completed' : 'failed'} (pattern match)`,
    '-'.repeat(40),
  ];

  for (const task of tasksToUpdate) {
    const taskId = String(task.id);
    if (outcome.success) {
      statusLines.push(`  Task ${taskId} marked complete`);
    } else {
      statusLines.push(`  Task ${taskId} marked failed: ${outcome.reason || 'unknown'}`);
    }
  }

  statusLines.push('-'.repeat(40));
  const message = statusLines.join('\n');
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message } }));
}

main().catch(() => {
  // Fail silently — monitoring is non-critical
});
