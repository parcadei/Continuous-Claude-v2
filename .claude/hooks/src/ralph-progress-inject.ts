#!/usr/bin/env node
/**
 * Ralph Progress Injection Hook
 *
 * UserPromptSubmit hook that injects a compact progress bar
 * when Ralph is active. One line, minimal tokens, fast.
 *
 * Format: RALPH: STORY-001 [==========----------] 47/100 (47%) | retry: 1 | last commit: 2m ago
 *
 * Runs on UserPromptSubmit
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { createLogger } from './shared/logger.js';
import { readRalphUnifiedState } from './shared/state-schema.js';

const log = createLogger('ralph-progress');

interface HookInput {
  session_id?: string;
  prompt?: string;
}

function readStdin(): string {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '{}';
  }
}

function makeProgressBar(done: number, total: number, width: number = 20): string {
  if (total === 0) return '[' + '-'.repeat(width) + ']';
  const filled = Math.round((done / total) * width);
  const empty = width - filled;
  return '[' + '='.repeat(filled) + '-'.repeat(empty) + ']';
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return 'never';
  const elapsed = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(elapsed / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

// ─── Deploy verification reminder ─────────────────────────
// Tracks which tasks have already been reminded via a temp file

function getDeployRemindedPath(sessionId: string): string {
  return join(tmpdir(), `claude-deploy-reminded-${sessionId}.json`);
}

function readDeployReminded(sessionId: string): Set<string> {
  try {
    const path = getDeployRemindedPath(sessionId);
    if (!existsSync(path)) return new Set();
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return new Set(Array.isArray(data) ? data : []);
  } catch {
    return new Set();
  }
}

function writeDeployReminded(sessionId: string, reminded: Set<string>): void {
  try {
    writeFileSync(getDeployRemindedPath(sessionId), JSON.stringify([...reminded]));
  } catch {
    // Non-critical -- fail silently
  }
}

function getDeployReminder(
  task: { id: string; status: string; deploy_status?: string | null; [key: string]: unknown },
  isVercelProject: boolean,
  alreadyReminded: Set<string>
): string | null {
  if (!isVercelProject) return null;

  const isComplete = task.status === 'complete' || task.status === 'completed';
  if (!isComplete) return null;

  // Already has deploy verification -- no reminder needed
  if (task.deploy_status) return null;

  // Already reminded for this task
  if (alreadyReminded.has(task.id)) return null;

  return `[DEPLOY] Task ${task.id} completed but deploy not verified. Delegate to deployer agent:\n"Verify preview deployment for task ${task.id} -- check build logs and deploy status"`;
}

async function main() {
  const start = Date.now();
  let input: HookInput = {};
  try {
    input = JSON.parse(readStdin());
  } catch {
    // Continue
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Check if Ralph is active with unified state
  const unified = readRalphUnifiedState(projectDir);
  if (!unified?.session?.active) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  // Count tasks
  const tasks = Array.isArray(unified.tasks) ? unified.tasks : Object.values(unified.tasks || {});
  const total = tasks.length;
  const completed = (tasks as any[]).filter(t => t.status === 'complete' || t.status === 'completed').length;
  const inProgress = (tasks as any[]).filter(t => t.status === 'in_progress').length;
  const failed = (tasks as any[]).filter(t => t.status === 'failed').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Detect stale in_progress tasks (>30 min)
  const STALE_THRESHOLD_MS = 30 * 60 * 1000;
  const now = Date.now();
  const staleCount = (tasks as any[]).filter(t => {
    if (t.status !== 'in_progress' || !t.started_at) return false;
    try {
      const started = new Date(t.started_at).getTime();
      return (now - started) > STALE_THRESHOLD_MS;
    } catch { return false; }
  }).length;

  // Retry queue
  const retryCount = (unified.retry_queue || []).length;

  // Last checkpoint
  const checkpoints = unified.checkpoints || [];
  const lastCheckpoint = checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;
  const lastCommitTime = lastCheckpoint ? timeAgo((lastCheckpoint as any).timestamp || null) : 'none';

  // Build compact progress line
  const bar = makeProgressBar(completed, total);
  const parts = [
    `RALPH: ${unified.story_id} ${bar} ${completed}/${total} (${pct}%)`,
  ];

  if (inProgress > 0) parts.push(`active: ${inProgress}`);
  if (staleCount > 0) parts.push(`STALE: ${staleCount}`);
  if (failed > 0) parts.push(`failed: ${failed}`);
  if (retryCount > 0) parts.push(`retry: ${retryCount}`);
  parts.push(`commit: ${lastCommitTime}`);

  let message = parts.join(' | ');

  // ─── Deploy verification reminder ───────────────────────
  // Only check when there are completed tasks (avoid unnecessary file I/O)
  if (completed > 0) {
    const vercelProjectPath = join(projectDir, '.vercel', 'project.json');
    const isVercelProject = existsSync(vercelProjectPath);

    if (isVercelProject) {
      const sessionId = input.session_id || 'default';
      const reminded = readDeployReminded(sessionId);
      const reminders: string[] = [];

      for (const task of tasks as any[]) {
        const reminder = getDeployReminder(task, true, reminded);
        if (reminder) {
          reminders.push(reminder);
          reminded.add(task.id);
        }
      }

      if (reminders.length > 0) {
        writeDeployReminded(sessionId, reminded);
        message += '\n' + reminders.join('\n');
      }
    }
  }

  // Ensure < 100ms execution
  const elapsed = Date.now() - start;
  if (elapsed > 100) {
    log.warn('Progress injection slow', { elapsed });
  }

  console.log(JSON.stringify({ result: 'continue', message }));
}

main().catch(() => {
  console.log(JSON.stringify({ result: 'continue' }));
});
