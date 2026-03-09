/**
 * Tests for hook-health-monitor.ts
 *
 * Tests the SessionStart hook that validates all registered hooks are healthy:
 * - All dist files exist on disk
 * - No stale builds (src newer than dist)
 * - Graceful handling of missing settings, malformed JSON, non-file commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

// Import the testable functions from the hook module
import {
  parseHookCommands,
  checkHookHealth,
  formatHealthReport,
  type HookFileInfo,
  type HookHealthResult,
} from '../hook-health-monitor.js';

describe('hook-health-monitor', () => {
  const testDir = path.join(tmpdir(), `hook-health-test-${Date.now()}`);
  const distDir = path.join(testDir, 'dist');
  const srcDir = path.join(testDir, 'src');

  beforeEach(() => {
    fs.mkdirSync(distDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  // ============================================
  // parseHookCommands
  // ============================================
  describe('parseHookCommands', () => {
    it('extracts dist file paths from settings hooks', () => {
      const settings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/hooks/dist/session-start.mjs',
                },
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/hooks/dist/init-check.mjs',
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: 'Edit|Write',
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/hooks/dist/validator.mjs',
                },
              ],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      expect(result).toHaveLength(3);
      expect(result[0].distPath).toBe('C:/Users/test/.claude/hooks/dist/session-start.mjs');
      expect(result[1].distPath).toBe('C:/Users/test/.claude/hooks/dist/init-check.mjs');
      expect(result[2].distPath).toBe('C:/Users/test/.claude/hooks/dist/validator.mjs');
    });

    it('extracts corresponding src path for each dist file', () => {
      const settings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/hooks/dist/my-hook.mjs',
                },
              ],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      expect(result).toHaveLength(1);
      expect(result[0].srcPath).toBe('C:/Users/test/.claude/hooks/src/my-hook.ts');
    });

    it('skips non-file commands (python, inline scripts)', () => {
      const settings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'python C:/hooks/braintrust_hooks.py session_start',
                },
                {
                  type: 'command',
                  command: 'node -e "console.log(1)"',
                },
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/hooks/dist/real-hook.mjs',
                },
              ],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      // Only the .mjs dist file should be extracted
      expect(result).toHaveLength(1);
      expect(result[0].distPath).toContain('real-hook.mjs');
    });

    it('handles empty hooks object', () => {
      const settings = { hooks: {} };
      const result = parseHookCommands(settings);
      expect(result).toHaveLength(0);
    });

    it('handles settings with no hooks key', () => {
      const settings = { env: {}, mcpServers: {} };
      const result = parseHookCommands(settings);
      expect(result).toHaveLength(0);
    });

    it('records hook event type and matcher', () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Agent',
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/hooks/dist/agent-validate.mjs',
                },
              ],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      expect(result).toHaveLength(1);
      expect(result[0].hookEvent).toBe('PreToolUse');
      expect(result[0].matcher).toBe('Agent');
    });

    it('deduplicates dist paths referenced from multiple hook entries', () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Agent',
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/hooks/dist/shared.mjs',
                },
              ],
            },
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/hooks/dist/shared.mjs',
                },
              ],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      expect(result).toHaveLength(1);
    });

    it('handles statusLine command references (non-hook format)', () => {
      const settings = {
        hooks: {},
        statusLine: {
          type: 'command',
          command: 'node C:/Users/test/.claude/plugins/cache/hud/index.js',
        },
      };

      const result = parseHookCommands(settings);
      // statusLine is not a hook, should not be parsed
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // checkHookHealth
  // ============================================
  describe('checkHookHealth', () => {
    it('reports healthy when dist file exists and is newer than src', () => {
      const distFile = path.join(distDir, 'healthy-hook.mjs');
      const srcFile = path.join(srcDir, 'healthy-hook.ts');

      // Create src first, then dist (dist is newer)
      fs.writeFileSync(srcFile, '// src');
      // Ensure different mtime
      const srcStat = fs.statSync(srcFile);
      const futureTime = new Date(srcStat.mtime.getTime() + 2000);
      fs.writeFileSync(distFile, '// dist');
      fs.utimesSync(distFile, futureTime, futureTime);

      const hookInfo: HookFileInfo = {
        distPath: distFile,
        srcPath: srcFile,
        hookEvent: 'SessionStart',
        hookName: 'healthy-hook',
      };

      const result = checkHookHealth(hookInfo);
      expect(result.status).toBe('healthy');
      expect(result.hookName).toBe('healthy-hook');
    });

    it('reports missing when dist file does not exist', () => {
      const hookInfo: HookFileInfo = {
        distPath: path.join(distDir, 'missing-hook.mjs'),
        srcPath: path.join(srcDir, 'missing-hook.ts'),
        hookEvent: 'PreToolUse',
        hookName: 'missing-hook',
      };

      const result = checkHookHealth(hookInfo);
      expect(result.status).toBe('missing');
    });

    it('reports stale when src file is newer than dist file', () => {
      const distFile = path.join(distDir, 'stale-hook.mjs');
      const srcFile = path.join(srcDir, 'stale-hook.ts');

      // Create dist first, then src (src is newer = stale build)
      fs.writeFileSync(distFile, '// dist');
      const distStat = fs.statSync(distFile);
      const futureTime = new Date(distStat.mtime.getTime() + 2000);
      fs.writeFileSync(srcFile, '// src updated');
      fs.utimesSync(srcFile, futureTime, futureTime);

      const hookInfo: HookFileInfo = {
        distPath: distFile,
        srcPath: srcFile,
        hookEvent: 'PostToolUse',
        hookName: 'stale-hook',
      };

      const result = checkHookHealth(hookInfo);
      expect(result.status).toBe('stale');
    });

    it('reports healthy when dist exists but src does not (no src to compare)', () => {
      const distFile = path.join(distDir, 'dist-only-hook.mjs');
      fs.writeFileSync(distFile, '// dist only');

      const hookInfo: HookFileInfo = {
        distPath: distFile,
        srcPath: path.join(srcDir, 'dist-only-hook.ts'),
        hookEvent: 'SessionStart',
        hookName: 'dist-only-hook',
      };

      const result = checkHookHealth(hookInfo);
      // If dist exists but no src, it's still runnable (might be from a plugin)
      expect(result.status).toBe('healthy');
    });
  });

  // ============================================
  // formatHealthReport
  // ============================================
  describe('formatHealthReport', () => {
    it('reports all hooks healthy when no issues', () => {
      const results: HookHealthResult[] = [
        { hookName: 'hook-a', status: 'healthy', hookEvent: 'SessionStart' },
        { hookName: 'hook-b', status: 'healthy', hookEvent: 'PreToolUse' },
        { hookName: 'hook-c', status: 'healthy', hookEvent: 'PostToolUse' },
      ];

      const report = formatHealthReport(results);
      expect(report).toBe('Hook Health: All 3 hooks healthy');
    });

    it('lists missing hooks with fix command', () => {
      const results: HookHealthResult[] = [
        { hookName: 'hook-a', status: 'healthy', hookEvent: 'SessionStart' },
        { hookName: 'broken-hook', status: 'missing', hookEvent: 'PreToolUse' },
      ];

      const report = formatHealthReport(results);
      expect(report).toContain('Hook Health: 1/2 healthy, 1 issue');
      expect(report).toContain('MISSING: broken-hook.mjs');
      expect(report).toContain('npm run build');
    });

    it('lists stale hooks with fix command', () => {
      const results: HookHealthResult[] = [
        { hookName: 'stale-hook', status: 'stale', hookEvent: 'PostToolUse' },
        { hookName: 'good-hook', status: 'healthy', hookEvent: 'SessionStart' },
      ];

      const report = formatHealthReport(results);
      expect(report).toContain('Hook Health: 1/2 healthy, 1 issue');
      expect(report).toContain('STALE: stale-hook.mjs');
      expect(report).toContain('src newer than dist');
      expect(report).toContain('npm run build');
    });

    it('reports multiple issues together', () => {
      const results: HookHealthResult[] = [
        { hookName: 'ok', status: 'healthy', hookEvent: 'SessionStart' },
        { hookName: 'gone', status: 'missing', hookEvent: 'PreToolUse' },
        { hookName: 'old', status: 'stale', hookEvent: 'PostToolUse' },
      ];

      const report = formatHealthReport(results);
      expect(report).toContain('1/3 healthy, 2 issues');
      expect(report).toContain('MISSING: gone.mjs');
      expect(report).toContain('STALE: old.mjs');
    });

    it('handles empty results list', () => {
      const results: HookHealthResult[] = [];
      const report = formatHealthReport(results);
      expect(report).toBe('Hook Health: No hooks registered');
    });
  });

  // ============================================
  // Integration: settings.json parsing edge cases
  // ============================================
  describe('settings.json edge cases', () => {
    it('handles hook groups with empty hooks array', () => {
      const settings = {
        hooks: {
          PreToolUse: [
            {
              matcher: 'Skill',
              hooks: [],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      expect(result).toHaveLength(0);
    });

    it('handles hooks with timeout and type fields only', () => {
      const settings = {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/hooks/dist/valid.mjs',
                  timeout: 5000,
                },
              ],
            },
          ],
        },
      };

      const result = parseHookCommands(settings);
      expect(result).toHaveLength(1);
    });

    it('handles plugin-style command paths (not in hooks/dist/)', () => {
      const settings = {
        hooks: {
          PostToolUse: [
            {
              hooks: [
                {
                  type: 'command',
                  command: 'node C:/Users/test/.claude/plugins/cache/plugin/index.js',
                },
              ],
            },
          ],
        },
      };

      // Plugin commands that aren't in hooks/dist/ should be skipped
      const result = parseHookCommands(settings);
      expect(result).toHaveLength(0);
    });
  });
});
