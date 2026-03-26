/**
 * Tests for linear-branch-context PostToolUse:Bash hook.
 *
 * This hook fires on PostToolUse for Bash. When creating a branch with
 * LIN-XXX in the name, it injects Linear issue context including a link
 * and status update suggestion.
 *
 * Behavior:
 * - Non-Bash tools: exit immediately with {}
 * - Bash without branch creation: exit immediately with {}
 * - Branch creation without LIN-: exit with {}
 * - Branch creation with LIN-XXX: inject Linear issue context
 * - Fails open: any error -> output {}
 */

import { describe, it, expect } from 'vitest';

import {
  extractLinearIssue,
  buildBranchContext,
  handleBranchPostToolUse,
} from '../linear-branch-context.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_SESSION = 'linear-branch-context-session';

// =============================================================================
// Test 1: extractLinearIssue -- extract issue number from branch commands
// =============================================================================

describe('extractLinearIssue', () => {
  it('extracts "42" from "git checkout -b dave/LIN-42-fix-auth"', () => {
    expect(extractLinearIssue('git checkout -b dave/LIN-42-fix-auth')).toBe('42');
  });

  it('extracts from "git switch -c feature/LIN-123-new-feature"', () => {
    expect(extractLinearIssue('git switch -c feature/LIN-123-new-feature')).toBe('123');
  });

  it('extracts from "git checkout -b LIN-7-quick-fix"', () => {
    expect(extractLinearIssue('git checkout -b LIN-7-quick-fix')).toBe('7');
  });

  it('handles case-insensitive "lin-" prefix', () => {
    expect(extractLinearIssue('git checkout -b feature/lin-99-lowercase')).toBe('99');
  });

  it('handles mixed case "Lin-" prefix', () => {
    expect(extractLinearIssue('git checkout -b feature/Lin-55-mixed')).toBe('55');
  });

  it('returns null for "git checkout -b feature/no-issue"', () => {
    expect(extractLinearIssue('git checkout -b feature/no-issue')).toBeNull();
  });

  it('returns null for "git checkout main" (not branch creation)', () => {
    expect(extractLinearIssue('git checkout main')).toBeNull();
  });

  it('returns null for "git switch main" (not branch creation)', () => {
    expect(extractLinearIssue('git switch main')).toBeNull();
  });

  it('returns null for "git branch -d LIN-42" (deletion, not creation)', () => {
    expect(extractLinearIssue('git branch -d LIN-42')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractLinearIssue('')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(extractLinearIssue(undefined as any)).toBeNull();
  });

  it('returns null for null', () => {
    expect(extractLinearIssue(null as any)).toBeNull();
  });

  it('returns null for non-git commands', () => {
    expect(extractLinearIssue('npm test')).toBeNull();
    expect(extractLinearIssue('ls -la')).toBeNull();
  });

  it('extracts from chained commands', () => {
    expect(extractLinearIssue('cd project && git checkout -b fix/LIN-200-auth')).toBe('200');
  });
});

// =============================================================================
// Test 2: buildBranchContext -- context message construction
// =============================================================================

describe('buildBranchContext', () => {
  it('includes Linear header', () => {
    const ctx = buildBranchContext('42');
    expect(ctx).toContain('[Linear]');
  });

  it('includes correct Linear URL with minions-lab workspace', () => {
    const ctx = buildBranchContext('42');
    expect(ctx).toContain('https://linear.app/minions-lab/issue/LIN-42');
  });

  it('includes issue number in status update suggestion', () => {
    const ctx = buildBranchContext('123');
    expect(ctx).toContain('LIN-123');
  });

  it('includes status update command', () => {
    const ctx = buildBranchContext('42');
    expect(ctx).toContain('In Progress');
  });

  it('uses correct issue number in URL for different numbers', () => {
    const ctx = buildBranchContext('999');
    expect(ctx).toContain('https://linear.app/minions-lab/issue/LIN-999');
  });
});

// =============================================================================
// Test 3: handleBranchPostToolUse -- integration
// =============================================================================

describe('handleBranchPostToolUse', () => {
  it('returns null for non-Bash tool', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Read',
      tool_input: { file_path: '/some/file.ts' },
    };
    expect(handleBranchPostToolUse(input)).toBeNull();
  });

  it('returns null for Bash without branch creation', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
    };
    expect(handleBranchPostToolUse(input)).toBeNull();
  });

  it('returns null for branch without LIN- prefix', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git checkout -b feature/my-feature' },
    };
    expect(handleBranchPostToolUse(input)).toBeNull();
  });

  it('returns context for LIN- branch creation', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git checkout -b dave/LIN-42-fix-auth' },
    };
    const result = handleBranchPostToolUse(input);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hookSpecificOutput');
    expect(result!.hookSpecificOutput).toHaveProperty('additionalContext');
    expect(result!.hookSpecificOutput.additionalContext).toContain('[Linear]');
    expect(result!.hookSpecificOutput.additionalContext).toContain('LIN-42');
  });

  it('returns context for git switch -c with LIN-', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git switch -c feature/LIN-123-new-feature' },
    };
    const result = handleBranchPostToolUse(input);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.additionalContext).toContain('LIN-123');
  });

  it('returns hookEventName PostToolUse in output', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git checkout -b LIN-7-quick-fix' },
    };
    const result = handleBranchPostToolUse(input);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.hookEventName).toBe('PostToolUse');
  });

  it('returns null for empty input', () => {
    expect(handleBranchPostToolUse({} as any)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(handleBranchPostToolUse(null as any)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(handleBranchPostToolUse(undefined as any)).toBeNull();
  });

  it('returns null when tool_input is missing', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
    };
    expect(handleBranchPostToolUse(input as any)).toBeNull();
  });

  it('returns null when command is missing from tool_input', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: {},
    };
    expect(handleBranchPostToolUse(input as any)).toBeNull();
  });
});

// =============================================================================
// Test 4: Non-Bash tools are fully ignored
// =============================================================================

describe('non-Bash tools ignored', () => {
  const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task'];

  for (const tool of tools) {
    it(`ignores ${tool} tool`, () => {
      const input = {
        session_id: TEST_SESSION,
        tool_name: tool,
        tool_input: { command: 'git checkout -b LIN-42-test' },
      };
      expect(handleBranchPostToolUse(input)).toBeNull();
    });
  }
});
