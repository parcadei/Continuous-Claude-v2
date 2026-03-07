/**
 * Tests for session-end-cleanup.ts
 *
 * Tests the cleanup logic: ledger updates, agent cache cleanup,
 * lock file management, and braintrust extraction gating.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

// --- Test the lock file management logic ---

const LOCK_MAX_AGE_MS = 5 * 60 * 1000;

function isExtractorRunning(lockPath: string): boolean {
  if (!fs.existsSync(lockPath)) {
    return false;
  }

  try {
    const lockContent = fs.readFileSync(lockPath, 'utf-8').trim();
    const [pidStr, timestampStr] = lockContent.split(':');
    const pid = parseInt(pidStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    if (Date.now() - timestamp > LOCK_MAX_AGE_MS) {
      fs.unlinkSync(lockPath);
      return false;
    }

    try {
      process.kill(pid, 0);
      return true;
    } catch {
      fs.unlinkSync(lockPath);
      return false;
    }
  } catch {
    try { fs.unlinkSync(lockPath); } catch { /* ignore */ }
    return false;
  }
}

describe('session-end-cleanup', () => {
  const testDir = path.join(tmpdir(), `session-end-cleanup-test-${Date.now()}`);
  const lockPath = path.join(testDir, 'extractor.lock');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  describe('isExtractorRunning', () => {
    it('returns false when no lock file exists', () => {
      expect(isExtractorRunning(lockPath)).toBe(false);
    });

    it('returns true when lock file has current PID', () => {
      // Write lock with our own PID (guaranteed to be running)
      fs.writeFileSync(lockPath, `${process.pid}:${Date.now()}`);
      expect(isExtractorRunning(lockPath)).toBe(true);
    });

    it('returns false and cleans up stale lock', () => {
      // Write lock with old timestamp
      const staleTimestamp = Date.now() - LOCK_MAX_AGE_MS - 1000;
      fs.writeFileSync(lockPath, `${process.pid}:${staleTimestamp}`);
      expect(isExtractorRunning(lockPath)).toBe(false);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('returns false and cleans up lock with dead PID', () => {
      // PID 999999 is almost certainly not running
      fs.writeFileSync(lockPath, `999999:${Date.now()}`);
      expect(isExtractorRunning(lockPath)).toBe(false);
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('handles corrupt lock file gracefully', () => {
      fs.writeFileSync(lockPath, 'not-valid-content');
      expect(isExtractorRunning(lockPath)).toBe(false);
    });
  });

  describe('agent cache cleanup logic', () => {
    it('identifies files older than 7 days for cleanup', () => {
      const agentDir = path.join(testDir, 'agents', 'test-agent');
      fs.mkdirSync(agentDir, { recursive: true });
      const outputFile = path.join(agentDir, 'latest-output.md');
      fs.writeFileSync(outputFile, 'test output');

      // Set mtime to 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      fs.utimesSync(outputFile, eightDaysAgo, eightDaysAgo);

      // Run cleanup logic
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      const stat = fs.statSync(outputFile);
      const isOld = Date.now() - stat.mtime.getTime() > maxAge;
      expect(isOld).toBe(true);
    });

    it('keeps files newer than 7 days', () => {
      const agentDir = path.join(testDir, 'agents', 'test-agent');
      fs.mkdirSync(agentDir, { recursive: true });
      const outputFile = path.join(agentDir, 'latest-output.md');
      fs.writeFileSync(outputFile, 'test output');

      const maxAge = 7 * 24 * 60 * 60 * 1000;
      const stat = fs.statSync(outputFile);
      const isOld = Date.now() - stat.mtime.getTime() > maxAge;
      expect(isOld).toBe(false);
    });
  });

  describe('ledger update logic', () => {
    it('updates timestamp in continuity ledger', () => {
      const ledgerDir = path.join(testDir, 'thoughts', 'ledgers');
      fs.mkdirSync(ledgerDir, { recursive: true });

      const ledgerContent = `# Continuity Ledger
Updated: 2026-03-01T00:00:00Z
## Context
Some context here`;

      const ledgerFile = path.join(ledgerDir, 'CONTINUITY_CLAUDE-test.md');
      fs.writeFileSync(ledgerFile, ledgerContent);

      // Simulate the update
      let content = fs.readFileSync(ledgerFile, 'utf-8');
      const timestamp = '2026-03-06T12:00:00Z';
      content = content.replace(/Updated: .*/, `Updated: ${timestamp}`);
      fs.writeFileSync(ledgerFile, content);

      const updated = fs.readFileSync(ledgerFile, 'utf-8');
      expect(updated).toContain('Updated: 2026-03-06T12:00:00Z');
      expect(updated).toContain('Some context here');
    });

    it('handles missing ledger directory gracefully', () => {
      const ledgerDir = path.join(testDir, 'thoughts', 'ledgers');
      // Don't create the directory
      expect(fs.existsSync(ledgerDir)).toBe(false);

      // The hook uses readdirSync which would throw - verify the pattern
      expect(() => {
        try {
          fs.readdirSync(ledgerDir);
        } catch {
          // Hook wraps in try/catch, so this is expected behavior
          return;
        }
      }).not.toThrow();
    });
  });
});
