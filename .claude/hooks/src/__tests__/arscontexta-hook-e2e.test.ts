/**
 * Arscontexta Hook E2E Tests
 *
 * Spawns the built hook as a subprocess, pipes JSON stdin,
 * and validates stdout output for arscontexta prompt matching.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
// hooks/src/__tests__ → hooks/dist/skill-activation-prompt.mjs
const HOOK_PATH = resolve(__dirname, '..', '..', 'dist', 'skill-activation-prompt.mjs');
// Use continuous-claude root (not .claude/) to avoid the ~/.claude guard in the hook
const PROJECT_DIR = resolve(__dirname, '..', '..', '..', '..');

interface HookOutput {
  result: string;
  message?: string;
}

function runHook(prompt: string): HookOutput {
  const input = JSON.stringify({
    session_id: 'e2e-test',
    transcript_path: '',
    cwd: PROJECT_DIR,
    permission_mode: 'default',
    prompt,
  });

  const result = spawnSync('node', [HOOK_PATH], {
    input,
    encoding: 'utf-8',
    timeout: 5000,
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: PROJECT_DIR,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = (result.stdout || '').trim();
  if (!stdout) {
    return { result: 'continue' };
  }

  try {
    return JSON.parse(stdout);
  } catch {
    return { result: 'continue' };
  }
}

describe('Arscontexta Hook E2E', () => {
  beforeAll(() => {
    if (!existsSync(HOOK_PATH)) {
      throw new Error(
        `Built hook not found at ${HOOK_PATH}. Run 'npm run build' first.`
      );
    }
  });

  it('suggests arscontexta-health for vault health prompt', () => {
    const output = runHook('check vault health diagnostics');
    expect(output.message).toBeDefined();
    expect(output.message).toContain('arscontexta-health');
  });

  it('includes Prerequisites line for pipeline prompt', () => {
    const output = runHook('run the full pipeline on the vault');
    expect(output.message).toBeDefined();
    // arscontexta-pipeline has prereqs require: [arscontexta-document]
    expect(output.message).toContain('Prerequisites');
  });

  it('includes Also consider line for document prompt', () => {
    const output = runHook('extract records from this deployment');
    expect(output.message).toBeDefined();
    // arscontexta-document has coActivate: [arscontexta-connect]
    expect(output.message).toContain('Also consider');
  });

  it('does NOT match arscontexta for generic prompts', () => {
    const output = runHook('fix the login bug in auth.ts');
    if (output.message) {
      expect(output.message).not.toContain('arscontexta-');
    }
  });

  it('matches explicit keyword /arscontexta:health', () => {
    const output = runHook('/arscontexta:health');
    expect(output.message).toBeDefined();
    expect(output.message).toContain('arscontexta-health');
  });

  it('handles empty prompt without crashing', () => {
    const output = runHook('');
    expect(output.result).toBe('continue');
  });

  it('handles malformed input without crashing', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: 'not json at all',
      encoding: 'utf-8',
      timeout: 5000,
      env: {
        ...process.env,
        CLAUDE_PROJECT_DIR: PROJECT_DIR,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    expect(result.status).toBe(0);
    const stdout = (result.stdout || '').trim();
    if (stdout) {
      const output = JSON.parse(stdout);
      expect(output.result).toBe('continue');
    }
  });

  it('matches arscontexta-health for multi-topic prompt', () => {
    const output = runHook('check vault health and verify records');
    expect(output.message).toBeDefined();
    expect(output.message).toContain('arscontexta-health');
  });

  it('surfaces knowledge-guide agent for methodology prompt', () => {
    const output = runHook('help with vault methodology and note quality');
    expect(output.message).toBeDefined();
    expect(output.message).toContain('knowledge-guide');
  });

  it('suggests vault skills even when no vault is set up', () => {
    // Vault skills (arscontexta-document, arscontexta-connect, etc.) should still
    // be suggested by the hook regardless of whether a vault exists in the project.
    // The hook matches based on skill-rules.json triggers, not vault existence.
    const output = runHook('extract records from this deployment');
    expect(output.message).toBeDefined();
    expect(output.message).toContain('arscontexta-document');
    // The hook should fire the suggestion — resolution to SKILL.md is a separate concern
  });

  it('includes exact Skill tool invocation syntax in ACTION line', () => {
    const output = runHook('check vault health diagnostics');
    expect(output.message).toBeDefined();
    // Verify the ACTION line includes exact Skill tool syntax, not just generic instruction
    expect(output.message).toMatch(/\{ ?"skill": ?"arscontexta:/);
  });
});
