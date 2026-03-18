/**
 * Ralph Progress Inject -- deploy verification reminder tests
 *
 * Tests the deploy reminder logic that fires when:
 * 1. Ralph is active in a Vercel-linked project (.vercel/project.json exists)
 * 2. A task just completed but has no deploy_status in its verification data
 * 3. The reminder has not already been suggested for this task
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Replicate the deploy reminder logic from ralph-progress-inject.ts
// ---------------------------------------------------------------------------

interface TaskData {
  id: string;
  status: string;
  deploy_status?: string | null;
  [key: string]: unknown;
}

/**
 * Check if a completed task needs a deploy verification reminder.
 *
 * Returns a reminder string if:
 * - The task status is 'complete' or 'completed'
 * - The task has no deploy_status set (undefined, null, or absent)
 * - The task ID is not in the already-reminded set
 *
 * Returns null otherwise.
 */
function getDeployReminder(
  task: TaskData,
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

// =============================================================================
// Test 1: Reminder fires for completed task without deploy_status in Vercel project
// =============================================================================

describe('getDeployReminder -- basic behavior', () => {
  it('returns reminder for completed task without deploy_status', () => {
    const task: TaskData = { id: '1.1', status: 'complete' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).not.toBeNull();
    expect(result).toContain('[DEPLOY]');
    expect(result).toContain('Task 1.1');
    expect(result).toContain('deploy not verified');
  });

  it('returns reminder for "completed" status variant', () => {
    const task: TaskData = { id: '2.1', status: 'completed' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).not.toBeNull();
    expect(result).toContain('Task 2.1');
  });

  it('returns null for non-Vercel project', () => {
    const task: TaskData = { id: '1.1', status: 'complete' };
    const result = getDeployReminder(task, false, new Set());

    expect(result).toBeNull();
  });
});

// =============================================================================
// Test 2: No reminder when deploy_status is already set
// =============================================================================

describe('getDeployReminder -- deploy_status already set', () => {
  it('returns null when deploy_status is preview_success', () => {
    const task: TaskData = { id: '1.1', status: 'complete', deploy_status: 'preview_success' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toBeNull();
  });

  it('returns null when deploy_status is preview_failed', () => {
    const task: TaskData = { id: '1.1', status: 'complete', deploy_status: 'preview_failed' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toBeNull();
  });

  it('returns null when deploy_status is skipped', () => {
    const task: TaskData = { id: '1.1', status: 'complete', deploy_status: 'skipped' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toBeNull();
  });

  it('fires when deploy_status is null (treated as absent)', () => {
    const task: TaskData = { id: '1.1', status: 'complete', deploy_status: null };
    const result = getDeployReminder(task, true, new Set());

    // null deploy_status means it was not verified
    expect(result).not.toBeNull();
  });
});

// =============================================================================
// Test 3: No reminder for non-completed tasks
// =============================================================================

describe('getDeployReminder -- non-completed tasks', () => {
  it('returns null for in_progress task', () => {
    const task: TaskData = { id: '1.1', status: 'in_progress' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toBeNull();
  });

  it('returns null for pending task', () => {
    const task: TaskData = { id: '1.1', status: 'pending' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toBeNull();
  });

  it('returns null for failed task', () => {
    const task: TaskData = { id: '1.1', status: 'failed' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toBeNull();
  });
});

// =============================================================================
// Test 4: Deduplication -- only remind once per task
// =============================================================================

describe('getDeployReminder -- deduplication', () => {
  it('returns null when task ID is in already-reminded set', () => {
    const task: TaskData = { id: '1.1', status: 'complete' };
    const reminded = new Set(['1.1']);
    const result = getDeployReminder(task, true, reminded);

    expect(result).toBeNull();
  });

  it('returns reminder for different task ID not in reminded set', () => {
    const task: TaskData = { id: '2.1', status: 'complete' };
    const reminded = new Set(['1.1']);
    const result = getDeployReminder(task, true, reminded);

    expect(result).not.toBeNull();
    expect(result).toContain('Task 2.1');
  });
});

// =============================================================================
// Test 5: Reminder message format
// =============================================================================

describe('getDeployReminder -- message format', () => {
  it('includes delegation instruction', () => {
    const task: TaskData = { id: '3.2', status: 'complete' };
    const result = getDeployReminder(task, true, new Set());

    expect(result).toContain('Delegate to deployer agent');
    expect(result).toContain('Verify preview deployment for task 3.2');
    expect(result).toContain('check build logs and deploy status');
  });
});
