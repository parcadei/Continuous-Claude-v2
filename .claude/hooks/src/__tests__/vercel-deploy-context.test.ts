/**
 * Tests for vercel-deploy-context PostToolUse hook.
 *
 * This hook fires on PostToolUse for Bash. It detects `git push` commands
 * in Vercel-linked projects (those with .vercel/project.json) and injects
 * Vercel deployment context into the conversation.
 *
 * Behavior:
 * - Non-Bash tools: exit immediately with {}
 * - Bash without git push: exit immediately with {}
 * - git push in non-Vercel project: exit with {}
 * - git push in Vercel-linked project: inject deployment context
 * - Fails open: any error -> output {}
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  isGitPush,
  isVercelProject,
  buildDeployContext,
  handleBashPostToolUse,
} from '../vercel-deploy-context.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_SESSION = 'vercel-deploy-context-session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-deploy-context-test-'));
});

afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

function createVercelProject(dir: string, orgId = 'team_abc123', projectId = 'prj_xyz456'): void {
  const vercelDir = path.join(dir, '.vercel');
  fs.mkdirSync(vercelDir, { recursive: true });
  fs.writeFileSync(
    path.join(vercelDir, 'project.json'),
    JSON.stringify({ orgId, projectId }),
    'utf-8'
  );
}

// =============================================================================
// Test 1: isGitPush -- detect git push commands
// =============================================================================

describe('isGitPush', () => {
  it('detects bare git push', () => {
    expect(isGitPush('git push')).toBe(true);
  });

  it('detects git push origin main', () => {
    expect(isGitPush('git push origin main')).toBe(true);
  });

  it('detects git push -u origin feature/x', () => {
    expect(isGitPush('git push -u origin feature/x')).toBe(true);
  });

  it('detects git push --force', () => {
    expect(isGitPush('git push --force')).toBe(true);
  });

  it('detects git push with --set-upstream', () => {
    expect(isGitPush('git push --set-upstream origin my-branch')).toBe(true);
  });

  it('detects git push preceded by other commands (&&)', () => {
    expect(isGitPush('git add . && git commit -m "msg" && git push')).toBe(true);
  });

  it('returns false for git pull', () => {
    expect(isGitPush('git pull')).toBe(false);
  });

  it('returns false for git status', () => {
    expect(isGitPush('git status')).toBe(false);
  });

  it('returns false for git commit', () => {
    expect(isGitPush('git commit -m "msg"')).toBe(false);
  });

  it('returns false for non-git commands', () => {
    expect(isGitPush('ls -la')).toBe(false);
    expect(isGitPush('npm install')).toBe(false);
    expect(isGitPush('echo "git push"')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isGitPush('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isGitPush(undefined as any)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isGitPush(null as any)).toBe(false);
  });
});

// =============================================================================
// Test 2: isVercelProject -- check for .vercel/project.json
// =============================================================================

describe('isVercelProject', () => {
  it('returns true when .vercel/project.json exists', () => {
    createVercelProject(tempDir);
    expect(isVercelProject(tempDir)).toBe(true);
  });

  it('returns false when .vercel dir does not exist', () => {
    expect(isVercelProject(tempDir)).toBe(false);
  });

  it('returns false when .vercel exists but project.json does not', () => {
    const vercelDir = path.join(tempDir, '.vercel');
    fs.mkdirSync(vercelDir, { recursive: true });
    expect(isVercelProject(tempDir)).toBe(false);
  });

  it('returns false for non-existent directory', () => {
    expect(isVercelProject(path.join(tempDir, 'nonexistent'))).toBe(false);
  });

  it('returns false for empty string path', () => {
    expect(isVercelProject('')).toBe(false);
  });

  it('returns false for undefined path', () => {
    expect(isVercelProject(undefined as any)).toBe(false);
  });
});

// =============================================================================
// Test 3: buildDeployContext -- context message construction
// =============================================================================

describe('buildDeployContext', () => {
  it('returns a string containing Vercel Deploy Context', () => {
    const ctx = buildDeployContext();
    expect(ctx).toContain('Vercel Deploy Context');
  });

  it('mentions deployment monitoring commands', () => {
    const ctx = buildDeployContext();
    expect(ctx).toContain('list_deployments');
  });

  it('mentions build logs', () => {
    const ctx = buildDeployContext();
    expect(ctx).toContain('build_logs');
  });

  it('mentions runtime logs', () => {
    const ctx = buildDeployContext();
    expect(ctx).toContain('runtime_logs');
  });

  it('mentions toolbar threads', () => {
    const ctx = buildDeployContext();
    expect(ctx).toContain('toolbar_threads');
  });

  it('mentions vercel-cli skill', () => {
    const ctx = buildDeployContext();
    expect(ctx).toContain('vercel-cli');
  });
});

// =============================================================================
// Test 4: handleBashPostToolUse -- integration
// =============================================================================

describe('handleBashPostToolUse', () => {
  it('returns null for non-Bash tool', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Read',
      tool_input: { file_path: '/some/file.ts' },
    };
    expect(handleBashPostToolUse(input)).toBeNull();
  });

  it('returns null for Bash without git push', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
    };
    expect(handleBashPostToolUse(input)).toBeNull();
  });

  it('returns null for git push in non-Vercel project', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    };
    // Use tempDir which has no .vercel/project.json
    expect(handleBashPostToolUse(input, tempDir)).toBeNull();
  });

  it('returns context for git push in Vercel-linked project', () => {
    createVercelProject(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
    };
    const result = handleBashPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hookSpecificOutput');
    expect(result!.hookSpecificOutput).toHaveProperty('additionalContext');
    expect(result!.hookSpecificOutput.additionalContext).toContain('Vercel Deploy Context');
  });

  it('returns context for bare git push in Vercel project', () => {
    createVercelProject(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git push' },
    };
    const result = handleBashPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.additionalContext).toContain('Vercel Deploy Context');
  });

  it('returns context for git push -u origin feature/x in Vercel project', () => {
    createVercelProject(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git push -u origin feature/x' },
    };
    const result = handleBashPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
  });

  it('returns hookEventName PostToolUse in output', () => {
    createVercelProject(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git push' },
    };
    const result = handleBashPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.hookEventName).toBe('PostToolUse');
  });

  it('returns null for empty input', () => {
    expect(handleBashPostToolUse({} as any)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(handleBashPostToolUse(null as any)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(handleBashPostToolUse(undefined as any)).toBeNull();
  });

  it('returns null when tool_input is missing', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
    };
    expect(handleBashPostToolUse(input as any)).toBeNull();
  });

  it('returns null when command is missing from tool_input', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: {},
    };
    expect(handleBashPostToolUse(input as any)).toBeNull();
  });

  it('handles chained commands with git push', () => {
    createVercelProject(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git add . && git commit -m "deploy" && git push' },
    };
    const result = handleBashPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
  });
});

// =============================================================================
// Test 5: Non-Bash tools are fully ignored
// =============================================================================

describe('non-Bash tools ignored', () => {
  const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task', 'TaskCreate', 'TaskUpdate'];

  for (const tool of tools) {
    it(`ignores ${tool} tool`, () => {
      const input = {
        session_id: TEST_SESSION,
        tool_name: tool,
        tool_input: { command: 'git push' },
      };
      expect(handleBashPostToolUse(input)).toBeNull();
    });
  }
});
