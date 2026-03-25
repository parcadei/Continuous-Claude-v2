/**
 * Tests for sentry-deploy-release PostToolUse:Bash hook.
 *
 * This hook fires on PostToolUse for Bash. It detects deploy commands
 * (vercel deploy, railway up, etc.) in projects that use Sentry, and
 * injects context reminding to create a Sentry release.
 *
 * Behavior:
 * - Non-Bash tools: exit immediately with {}
 * - Bash without deploy command: exit immediately with {}
 * - Deploy in non-Sentry project: exit with {}
 * - Deploy in Sentry project: inject release context
 * - Fails open: any error -> output {}
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
  isDeployCommand,
  hasSentryInProject,
  buildReleaseContext,
  handleDeployPostToolUse,
} from '../sentry-deploy-release.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_SESSION = 'sentry-deploy-release-session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sentry-deploy-release-test-'));
});

afterEach(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

function createPackageJsonWithSentry(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@sentry/nextjs': '^7.0.0',
        'react': '^18.0.0',
      },
    }),
    'utf-8'
  );
}

function createPackageJsonWithoutSentry(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      dependencies: {
        'react': '^18.0.0',
        'next': '^14.0.0',
      },
    }),
    'utf-8'
  );
}

function createPyprojectWithSentry(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'pyproject.toml'),
    '[project]\ndependencies = [\n  "sentry-sdk>=1.0.0",\n  "flask>=2.0.0",\n]\n',
    'utf-8'
  );
}

function createRequirementsTxtWithSentry(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'requirements.txt'),
    'flask>=2.0.0\nsentry-sdk>=1.0.0\nrequests>=2.28.0\n',
    'utf-8'
  );
}

// =============================================================================
// Test 1: isDeployCommand -- detect deploy commands
// =============================================================================

describe('isDeployCommand', () => {
  it('detects "vercel --prod"', () => {
    expect(isDeployCommand('vercel --prod')).toBe(true);
  });

  it('detects "vercel deploy"', () => {
    expect(isDeployCommand('vercel deploy')).toBe(true);
  });

  it('detects "vercel promote"', () => {
    expect(isDeployCommand('vercel promote')).toBe(true);
  });

  it('detects "railway up"', () => {
    expect(isDeployCommand('railway up')).toBe(true);
  });

  it('detects "railway redeploy"', () => {
    expect(isDeployCommand('railway redeploy')).toBe(true);
  });

  it('detects deploy in chained commands', () => {
    expect(isDeployCommand('git push && vercel --prod')).toBe(true);
  });

  it('returns false for git push', () => {
    expect(isDeployCommand('git push origin main')).toBe(false);
  });

  it('returns false for npm test', () => {
    expect(isDeployCommand('npm test')).toBe(false);
  });

  it('returns false for vercel status (non-deploy)', () => {
    expect(isDeployCommand('vercel status')).toBe(false);
  });

  it('returns false for railway logs (non-deploy)', () => {
    expect(isDeployCommand('railway logs')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDeployCommand('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDeployCommand(undefined as any)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isDeployCommand(null as any)).toBe(false);
  });
});

// =============================================================================
// Test 2: hasSentryInProject -- check for Sentry SDK
// =============================================================================

describe('hasSentryInProject', () => {
  it('returns true when @sentry/* in package.json dependencies', () => {
    createPackageJsonWithSentry(tempDir);
    expect(hasSentryInProject(tempDir)).toBe(true);
  });

  it('returns true when @sentry/* in package.json devDependencies', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@sentry/node': '^7.0.0',
        },
      }),
      'utf-8'
    );
    expect(hasSentryInProject(tempDir)).toBe(true);
  });

  it('returns false when package.json has no Sentry', () => {
    createPackageJsonWithoutSentry(tempDir);
    expect(hasSentryInProject(tempDir)).toBe(false);
  });

  it('returns true when sentry-sdk in requirements.txt', () => {
    createRequirementsTxtWithSentry(tempDir);
    expect(hasSentryInProject(tempDir)).toBe(true);
  });

  it('returns true when sentry-sdk in pyproject.toml', () => {
    createPyprojectWithSentry(tempDir);
    expect(hasSentryInProject(tempDir)).toBe(true);
  });

  it('returns false when no dependency files exist', () => {
    expect(hasSentryInProject(tempDir)).toBe(false);
  });

  it('returns false for non-existent directory', () => {
    expect(hasSentryInProject(path.join(tempDir, 'nonexistent'))).toBe(false);
  });

  it('returns false for empty string path', () => {
    expect(hasSentryInProject('')).toBe(false);
  });

  it('returns false for undefined path', () => {
    expect(hasSentryInProject(undefined as any)).toBe(false);
  });
});

// =============================================================================
// Test 3: buildReleaseContext -- context message construction
// =============================================================================

describe('buildReleaseContext', () => {
  it('includes Sentry Release header', () => {
    const ctx = buildReleaseContext();
    expect(ctx).toContain('[Sentry Release]');
  });

  it('includes sentry-cli releases new command', () => {
    const ctx = buildReleaseContext();
    expect(ctx).toContain('sentry-cli releases new');
  });

  it('includes sentry-cli set-commits command', () => {
    const ctx = buildReleaseContext();
    expect(ctx).toContain('sentry-cli releases set-commits');
  });

  it('includes sentry-cli deploys new command', () => {
    const ctx = buildReleaseContext();
    expect(ctx).toContain('sentry-cli deploys new');
  });

  it('includes sentry-cli releases finalize command', () => {
    const ctx = buildReleaseContext();
    expect(ctx).toContain('sentry-cli releases finalize');
  });

  it('includes post-deploy error check command', () => {
    const ctx = buildReleaseContext();
    expect(ctx).toContain('sentry-cli issues list');
  });
});

// =============================================================================
// Test 4: handleDeployPostToolUse -- integration
// =============================================================================

describe('handleDeployPostToolUse', () => {
  it('returns null for non-Bash tool', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Read',
      tool_input: { file_path: '/some/file.ts' },
    };
    expect(handleDeployPostToolUse(input)).toBeNull();
  });

  it('returns null for Bash without deploy command', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'git status' },
    };
    expect(handleDeployPostToolUse(input)).toBeNull();
  });

  it('returns null for deploy in non-Sentry project', () => {
    createPackageJsonWithoutSentry(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'vercel --prod' },
    };
    expect(handleDeployPostToolUse(input, tempDir)).toBeNull();
  });

  it('returns context for deploy in Sentry project', () => {
    createPackageJsonWithSentry(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'vercel --prod' },
    };
    const result = handleDeployPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hookSpecificOutput');
    expect(result!.hookSpecificOutput).toHaveProperty('additionalContext');
    expect(result!.hookSpecificOutput.additionalContext).toContain('[Sentry Release]');
  });

  it('returns context for railway up in Sentry project', () => {
    createPackageJsonWithSentry(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'railway up' },
    };
    const result = handleDeployPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.additionalContext).toContain('[Sentry Release]');
  });

  it('returns hookEventName PostToolUse in output', () => {
    createPackageJsonWithSentry(tempDir);
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: { command: 'vercel deploy' },
    };
    const result = handleDeployPostToolUse(input, tempDir);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.hookEventName).toBe('PostToolUse');
  });

  it('returns null for empty input', () => {
    expect(handleDeployPostToolUse({} as any)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(handleDeployPostToolUse(null as any)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(handleDeployPostToolUse(undefined as any)).toBeNull();
  });

  it('returns null when tool_input is missing', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
    };
    expect(handleDeployPostToolUse(input as any)).toBeNull();
  });

  it('returns null when command is missing from tool_input', () => {
    const input = {
      session_id: TEST_SESSION,
      tool_name: 'Bash',
      tool_input: {},
    };
    expect(handleDeployPostToolUse(input as any)).toBeNull();
  });
});

// =============================================================================
// Test 5: Non-Bash tools are fully ignored
// =============================================================================

describe('non-Bash tools ignored', () => {
  const tools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task'];

  for (const tool of tools) {
    it(`ignores ${tool} tool`, () => {
      const input = {
        session_id: TEST_SESSION,
        tool_name: tool,
        tool_input: { command: 'vercel --prod' },
      };
      expect(handleDeployPostToolUse(input)).toBeNull();
    });
  }
});
