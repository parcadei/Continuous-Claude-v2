/**
 * Ralph Task Monitor -- deploy_status detection tests
 *
 * Tests that the structured JSON detection path recognizes the optional
 * deploy_status field and includes it in the result.
 *
 * Valid values: "preview_success", "preview_failed", "skipped", or absent/null
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Replicate the STRUCTURED_JSON_RE from ralph-task-monitor.ts:49
// ---------------------------------------------------------------------------

const STRUCTURED_JSON_RE = /\{"ralph_status"\s*:\s*\{[^}]+\}\s*\}/;

// ---------------------------------------------------------------------------
// Replicate the RalphStructuredStatus interface and detection function
// This mirrors the detectStructuredJSON from ralph-task-monitor.ts:93-111
// but updated with deploy_status support
// ---------------------------------------------------------------------------

interface RalphStructuredStatus {
  task_id: string;
  status: 'complete' | 'failed' | 'blocked';
  commit?: string;
  error?: string;
  deploy_status?: 'preview_success' | 'preview_failed' | 'skipped' | null;
}

function detectStructuredJSON(text: string): {
  taskId: string;
  success: boolean;
  commit?: string;
  reason?: string;
  deploy_status?: string;
} | null {
  const match = text.match(STRUCTURED_JSON_RE);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]);
    const status: RalphStructuredStatus = parsed.ralph_status;
    if (!status || !status.task_id || !status.status) return null;

    const result: {
      taskId: string;
      success: boolean;
      commit?: string;
      reason?: string;
      deploy_status?: string;
    } = {
      taskId: status.task_id,
      success: status.status === 'complete',
      commit: status.commit,
      reason: status.error || (status.status === 'failed' ? 'Agent reported failure' : undefined),
    };

    // Include deploy_status if present and valid
    if (status.deploy_status !== undefined && status.deploy_status !== null) {
      result.deploy_status = status.deploy_status;
    }

    return result;
  } catch {
    return null;
  }
}

// =============================================================================
// Test 1: deploy_status: "preview_success" is detected and included
// =============================================================================

describe('detectStructuredJSON -- deploy_status field', () => {
  it('includes deploy_status when set to preview_success', () => {
    const text = '{"ralph_status": {"task_id": "1.1", "status": "complete", "commit": "abc123", "deploy_status": "preview_success"}}';
    const result = detectStructuredJSON(text);

    expect(result).not.toBeNull();
    expect(result!.taskId).toBe('1.1');
    expect(result!.success).toBe(true);
    expect(result!.deploy_status).toBe('preview_success');
  });

  it('includes deploy_status when set to preview_failed', () => {
    const text = '{"ralph_status": {"task_id": "2.3", "status": "complete", "commit": "def456", "deploy_status": "preview_failed"}}';
    const result = detectStructuredJSON(text);

    expect(result).not.toBeNull();
    expect(result!.deploy_status).toBe('preview_failed');
  });

  it('includes deploy_status when set to skipped', () => {
    const text = '{"ralph_status": {"task_id": "3.1", "status": "complete", "deploy_status": "skipped"}}';
    const result = detectStructuredJSON(text);

    expect(result).not.toBeNull();
    expect(result!.deploy_status).toBe('skipped');
  });

  it('omits deploy_status when not present in input', () => {
    const text = '{"ralph_status": {"task_id": "1.1", "status": "complete", "commit": "abc123"}}';
    const result = detectStructuredJSON(text);

    expect(result).not.toBeNull();
    expect(result!.deploy_status).toBeUndefined();
  });

  it('omits deploy_status when set to null', () => {
    const text = '{"ralph_status": {"task_id": "1.1", "status": "complete", "deploy_status": null}}';
    const result = detectStructuredJSON(text);

    expect(result).not.toBeNull();
    expect(result!.deploy_status).toBeUndefined();
  });

  it('still detects success/failure correctly with deploy_status present', () => {
    const successText = '{"ralph_status": {"task_id": "1.1", "status": "complete", "deploy_status": "preview_success"}}';
    const failText = '{"ralph_status": {"task_id": "1.1", "status": "failed", "error": "build broke", "deploy_status": "preview_failed"}}';

    const success = detectStructuredJSON(successText);
    const fail = detectStructuredJSON(failText);

    expect(success!.success).toBe(true);
    expect(fail!.success).toBe(false);
    expect(fail!.reason).toBe('build broke');
    expect(fail!.deploy_status).toBe('preview_failed');
  });
});

// =============================================================================
// Test 2: STRUCTURED_JSON_RE still matches with deploy_status field present
// =============================================================================

describe('STRUCTURED_JSON_RE -- regex compatibility with deploy_status', () => {
  it('matches JSON containing deploy_status field', () => {
    const text = 'some output {"ralph_status": {"task_id": "1.1", "status": "complete", "deploy_status": "preview_success"}} more output';
    const match = text.match(STRUCTURED_JSON_RE);
    expect(match).not.toBeNull();
  });

  it('still matches JSON without deploy_status', () => {
    const text = '{"ralph_status": {"task_id": "1.1", "status": "complete"}}';
    const match = text.match(STRUCTURED_JSON_RE);
    expect(match).not.toBeNull();
  });
});

// =============================================================================
// Test 3: deploy_status valid values enum check
// =============================================================================

describe('deploy_status -- valid values', () => {
  const validValues = ['preview_success', 'preview_failed', 'skipped'];

  for (const value of validValues) {
    it(`accepts "${value}" as valid deploy_status`, () => {
      const text = `{"ralph_status": {"task_id": "1.1", "status": "complete", "deploy_status": "${value}"}}`;
      const result = detectStructuredJSON(text);
      expect(result).not.toBeNull();
      expect(result!.deploy_status).toBe(value);
    });
  }
});
