#!/usr/bin/env node
/**
 * Ralph Watchdog Hook
 *
 * Monitors active Ralph/Maestro workflows for staleness.
 * Fires on UserPromptSubmit — checks lastActivity timestamp.
 * If a workflow has been idle >30 minutes, warns the user.
 *
 * This catches hung agents, forgotten workflows, and stuck pipelines.
 */

import { readFileSync } from 'fs';
import { createLogger } from './shared/logger.js';
import { readRalphUnifiedState } from './shared/state-schema.js';

const log = createLogger('ralph-watchdog');

interface HookInput {
  session_id?: string;
  prompt?: string;
}

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function readStdin(): string {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '{}';
  }
}

async function main() {
  let input: HookInput = {};
  try {
    input = JSON.parse(readStdin());
  } catch {
    // Continue
  }

  const sessionId = input.session_id;
  const staleWorkflows: string[] = [];

  // Check unified Ralph state
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const unified = readRalphUnifiedState(projectDir);
  if (unified?.session?.active) {
    const lastHeartbeat = unified.session.last_activity || 0;
    const elapsed = Date.now() - lastHeartbeat;
    if (elapsed >= STALE_THRESHOLD_MS) {
      const minutes = Math.round(elapsed / 60000);
      log.warn('Stale unified Ralph workflow detected', { minutes, storyId: unified.story_id, sessionId });
      const details = unified.story_id || '';
      staleWorkflows.push(`**Ralph**${details ? ` (${details})` : ''} — idle for ${minutes} minutes`);
    }
  }

  if (staleWorkflows.length === 0) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  const message = [
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '⚠️ STALE WORKFLOW DETECTED',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    ...staleWorkflows.map(w => `  ${w}`),
    '',
    '**Actions:**',
    '  - Check for blocked/hung agents',
    '  - Say "cancel ralph" or "cancel maestro" to stop',
    '  - Or continue working (workflow may need manual intervention)',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');

  console.log(JSON.stringify({ result: 'continue', message }));
}

main().catch(() => {
  console.log(JSON.stringify({ result: 'continue' }));
});
