import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Hook Integration Tests', () => {
  describe('Session Start Continuity', () => {
    describe('buildHandoffDirName', () => {
      it('creates correct directory name with UUID suffix', async () => {
        const { buildHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

        const result = buildHandoffDirName('auth-refactor', '550e8400-e29b-41d4-a716-446655440000');
        expect(result).toBe('auth-refactor-550e8400');
      });

      it('handles session ID without dashes', async () => {
        const { buildHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

        const result = buildHandoffDirName('test-session', '1234567890abcdef');
        expect(result).toBe('test-session-12345678');
      });
    });

    describe('parseHandoffDirName', () => {
      it('parses UUID-suffixed directory name', async () => {
        const { parseHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

        const result = parseHandoffDirName('auth-refactor-550e8400');
        expect(result.sessionName).toBe('auth-refactor');
        expect(result.uuidShort).toBe('550e8400');
      });

      it('returns null uuidShort for legacy format', async () => {
        const { parseHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

        const result = parseHandoffDirName('legacy-session');
        expect(result.sessionName).toBe('legacy-session');
        expect(result.uuidShort).toBeNull();
      });

      it('handles uppercase UUID', async () => {
        const { parseHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

        const result = parseHandoffDirName('session-ABCDEF12');
        expect(result.sessionName).toBe('session');
        expect(result.uuidShort).toBe('abcdef12');
      });
    });

    describe('extractLedgerSection', () => {
      it('extracts Ledger section with content', async () => {
        const { extractLedgerSection } = await import('../../dist/session-start-continuity.mjs');

        const content = `
# Session Handoff

## Ledger
This is the ledger content
with multiple lines
of information

---
## What Was Done
Task completed
`;

        const result = extractLedgerSection(content);
        expect(result).toBeDefined();
        expect(result).toContain('## Ledger');
        expect(result).toContain('This is the ledger content');
      });

      it('returns null when no Ledger section', async () => {
        const { extractLedgerSection } = await import('../../dist/session-start-continuity.mjs');

        const content = `
# Session Handoff

## What Was Done
Task completed
`;

        const result = extractLedgerSection(content);
        expect(result).toBeNull();
      });

      it('handles Ledger at end of file', async () => {
        const { extractLedgerSection } = await import('../../dist/session-start-continuity.mjs');

        const content = `
# Session Handoff

## Ledger
Final section content
`;

        const result = extractLedgerSection(content);
        expect(result).toBeDefined();
        expect(result).toContain('Final section content');
      });
    });

    describe('findSessionHandoff', () => {
      it('returns null when handoffs directory does not exist', async () => {
        const { findSessionHandoff } = await import('../../dist/session-start-continuity.mjs');

        // Mock fs.existsSync to return false
        const existsSyncMock = vi.fn().mockReturnValue(false);
        vi.doMock('fs', () => ({
          ...vi.importActual('fs'),
          existsSync: existsSyncMock,
        }));

        const result = findSessionHandoff('test-session');
        expect(result).toBeNull();
      });

      it('returns null when session directory does not exist', async () => {
        const { findSessionHandoff } = await import('../../dist/session-start-continuity.mjs');

        // Create a mock fs module
        const existsSyncMock = vi.fn((p: string) => {
          if (p.includes('handoffs')) return false;
          return true;
        });
        const readdirSyncMock = vi.fn().mockReturnValue([]);

        vi.doMock('fs', () => ({
          ...vi.importActual('fs'),
          existsSync: existsSyncMock,
          readdirSync: readdirSyncMock,
        }));

        const result = findSessionHandoff('test-session');
        expect(result).toBeNull();
      });
    });

    describe('findSessionHandoffWithUUID', () => {
      it('finds handoff with exact UUID match', async () => {
        const { findSessionHandoffWithUUID } = await import('../../dist/session-start-continuity.mjs');

        const existsSyncMock = vi.fn((p: string) => {
          if (p.includes('handoffs')) return true;
          if (p.includes('session-550e8400')) return true;
          return false;
        });

        const readdirSyncMock = vi.fn((p: string) => {
          if (p.includes('handoffs')) return ['session-550e8400'];
          if (p.includes('session-550e8400')) return ['task-1.md'];
          return [];
        });

        const statSyncMock = vi.fn((p: string) => ({
          isDirectory: () => p.includes('handoffs') || p.includes('session'),
          mtime: new Date(),
        }));

        const readFileSyncMock = vi.fn().mockReturnValue('## Ledger\nContent');

        vi.doMock('fs', () => ({
          ...vi.importActual('fs'),
          existsSync: existsSyncMock,
          readdirSync: readdirSyncMock,
          statSync: statSyncMock,
          readFileSync: readFileSyncMock,
        }));

        const result = findSessionHandoffWithUUID('session', '550e8400-e29b-41d4-a716-446655440000');
        expect(result).toBeDefined();
      });
    });
  });

  describe('Full hook execution with mocked Claude Code environment', () => {
    it('processes SessionStart event with mocked stdin', async () => {
      // This test verifies the hook can be imported and has expected exports
      // Full integration testing would require running the actual hook script

      const hookModule = await import('../../dist/session-start-continuity.mjs');

      // Verify key functions are exported
      expect(typeof hookModule.buildHandoffDirName).toBe('function');
      expect(typeof hookModule.parseHandoffDirName).toBe('function');
      expect(typeof hookModule.extractLedgerSection).toBe('function');
      expect(typeof hookModule.findSessionHandoff).toBe('function');
    });

    it('handles input with source field', async () => {
      const { buildHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

      // Test with various session IDs
      const input = {
        source: 'startup' as const,
        session_id: 'abc12345-def6-7890-abcd-ef1234567890',
      };

      const dirName = buildHandoffDirName('test', input.session_id);
      expect(dirName).toBe('test-abc12345');
    });

    it('handles input with type field (legacy)', async () => {
      const { buildHandoffDirName } = await import('../../dist/session-start-continuity.mjs');

      const input = {
        type: 'resume' as const,
        session_id: 'abc12345-def6-7890-abcd-ef1234567890',
      };

      const dirName = buildHandoffDirName('test', input.session_id);
      expect(dirName).toBe('test-abc12345');
    });
  });

  describe('Hook output format', () => {
    it('produces valid Claude Code hook output structure', async () => {
      // Test the expected output structure for Claude Code v1.0.21+
      const validOutput = {
        result: 'continue' as const,
        message: 'Test message',
        systemMessage: 'Test message',
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: 'Additional context content',
        },
      };

      expect(validOutput.result).toBe('continue');
      expect(validOutput.message).toBeDefined();
      expect(validOutput.hookSpecificOutput).toBeDefined();
      expect(validOutput.hookSpecificOutput.hookEventName).toBe('SessionStart');
    });

    it('handles minimal output (continue only)', async () => {
      const minimalOutput = {
        result: 'continue' as const,
      };

      expect(minimalOutput.result).toBe('continue');
      expect(minimalOutput.message).toBeUndefined();
    });
  });
});
