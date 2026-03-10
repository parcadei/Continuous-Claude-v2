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

import { readFileSync } from 'fs';
import { join } from 'path';
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

  const message = parts.join(' | ');

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
