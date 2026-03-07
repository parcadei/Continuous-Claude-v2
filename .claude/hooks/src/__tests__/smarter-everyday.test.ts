/**
 * Tests for smarter-everyday.ts state machine transitions
 *
 * Tests the state machine: IDLE → ATTEMPTING → TESTING → CANDIDATE → VICTORY
 * All victory learning storage is mocked (no subprocess calls).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// We test by importing the module's exported pieces indirectly.
// Since smarter-everyday.ts doesn't export its functions, we need to
// test via the main() stdin/stdout interface or extract testable functions.
//
// For now, we test the core logic by reconstructing the state machine
// transitions using the module's internal patterns.

// --- Test helpers that mirror the module's internal functions ---

const TEST_COMMANDS = [
  /\b(npm|yarn|pnpm)\s+(run\s+)?test/i,
  /\bpytest\b/i,
  /\bcargo\s+test\b/i,
  /\bgo\s+test\b/i,
  /\bjest\b/i,
  /\bvitest\b/i,
  /\bmocha\b/i,
  /\bmake\s+test\b/i,
  /\bnpm\s+run\s+check/i,
  /\btsc\s+--noEmit/i,
];

const SUCCESS_PATTERNS = [
  /\bpassed\b/i,
  /\bpassing\b/i,
  /\b0\s+(failures?|errors?)\b/i,
  /[\u2713\u2714\u221A]/,
  /All tests passed/i,
  /PASS\s/,
  /Tests:\s+\d+\s+passed/i,
  /OK\s*\(/i,
];

const FAILURE_PATTERNS = [
  /\bfailed\b/i,
  /\bfailing\b/i,
  /\berror\b/i,
  /\bexception\b/i,
  /\b[1-9]\d*\s+(failures?|errors?)\b/i,
  /[\u2717\u2718\u00D7]/,
  /FAILED/,
  /Tests:\s+\d+\s+failed/i,
];

function isTestCommand(command: string): boolean {
  return TEST_COMMANDS.some(pattern => pattern.test(command));
}

function isTestSuccess(output: string): boolean {
  const hasSuccess = SUCCESS_PATTERNS.some(p => p.test(output));
  const hasFailure = FAILURE_PATTERNS.some(p => p.test(output));
  return hasSuccess && !hasFailure;
}

function isTestFailure(output: string): boolean {
  return FAILURE_PATTERNS.some(p => p.test(output));
}

// --- Tests ---

describe('smarter-everyday', () => {
  describe('isTestCommand', () => {
    it('detects npm test', () => {
      expect(isTestCommand('npm test')).toBe(true);
      expect(isTestCommand('npm run test')).toBe(true);
    });

    it('detects pytest', () => {
      expect(isTestCommand('pytest src/')).toBe(true);
      expect(isTestCommand('python -m pytest')).toBe(true); // \bpytest\b matches
    });

    it('detects vitest', () => {
      expect(isTestCommand('vitest run')).toBe(true);
      expect(isTestCommand('npx vitest')).toBe(true);
    });

    it('detects jest', () => {
      expect(isTestCommand('jest --watch')).toBe(true);
    });

    it('detects tsc --noEmit', () => {
      expect(isTestCommand('tsc --noEmit')).toBe(true);
    });

    it('rejects non-test commands', () => {
      expect(isTestCommand('npm install')).toBe(false);
      expect(isTestCommand('git commit')).toBe(false);
      expect(isTestCommand('echo hello')).toBe(false);
    });
  });

  describe('isTestSuccess', () => {
    it('detects passing tests', () => {
      expect(isTestSuccess('Tests: 5 passed, 5 total')).toBe(true);
      expect(isTestSuccess('All tests passed')).toBe(true);
      expect(isTestSuccess('PASS src/test.ts')).toBe(true);
      expect(isTestSuccess('12 passing (3s)')).toBe(true);
    });

    it('rejects when failures are present', () => {
      expect(isTestSuccess('Tests: 3 passed, 2 failed')).toBe(false);
      expect(isTestSuccess('5 passing, 1 failing')).toBe(false);
    });

    it('rejects output with no success indicators', () => {
      expect(isTestSuccess('compiling...')).toBe(false);
    });
  });

  describe('isTestFailure', () => {
    it('detects failing tests', () => {
      expect(isTestFailure('Tests: 2 failed')).toBe(true);
      expect(isTestFailure('FAILED src/test.ts')).toBe(true);
      expect(isTestFailure('1 error found')).toBe(true);
    });

    it('rejects clean output', () => {
      expect(isTestFailure('compiling... done')).toBe(false);
      expect(isTestFailure('0 failures')).toBe(false);
    });
  });

  describe('state machine transitions', () => {
    // Simulate the state machine logic from processTransition
    type State = 'IDLE' | 'ATTEMPTING' | 'TESTING' | 'CANDIDATE' | 'VICTORY';

    interface SimpleState {
      state: State;
      tracked_file: string | null;
      attempts: number;
      candidate_turn: number | null;
      current_turn: number;
    }

    function transition(
      st: SimpleState,
      toolName: string,
      filePath?: string,
      testOutput?: string
    ): SimpleState {
      const s = { ...st, current_turn: st.current_turn + 1 };

      if (toolName === 'Edit' || toolName === 'Write') {
        if (s.state === 'IDLE') {
          s.state = 'ATTEMPTING';
          s.tracked_file = filePath || null;
          s.attempts = 1;
        } else if (s.state === 'CANDIDATE' && filePath === s.tracked_file) {
          s.state = 'ATTEMPTING';
          s.attempts += 1;
          s.candidate_turn = null;
        } else if (s.state === 'ATTEMPTING' && filePath === s.tracked_file) {
          s.attempts += 1;
        }
      }

      if (toolName === 'Bash' && testOutput !== undefined) {
        if (s.state === 'ATTEMPTING') {
          if (isTestSuccess(testOutput)) {
            s.state = 'CANDIDATE';
            s.candidate_turn = s.current_turn;
          }
        }
      }

      // Time-based victory
      if (s.state === 'CANDIDATE' && s.candidate_turn) {
        const turnsSince = s.current_turn - s.candidate_turn;
        if (turnsSince >= 3 && s.attempts >= 2) {
          s.state = 'VICTORY';
        }
      }

      return s;
    }

    it('IDLE → ATTEMPTING on first Edit', () => {
      const s = transition(
        { state: 'IDLE', tracked_file: null, attempts: 0, candidate_turn: null, current_turn: 0 },
        'Edit', '/src/foo.ts'
      );
      expect(s.state).toBe('ATTEMPTING');
      expect(s.tracked_file).toBe('/src/foo.ts');
      expect(s.attempts).toBe(1);
    });

    it('ATTEMPTING → CANDIDATE on test success', () => {
      const s = transition(
        { state: 'ATTEMPTING', tracked_file: '/src/foo.ts', attempts: 1, candidate_turn: null, current_turn: 1 },
        'Bash', undefined, 'Tests: 5 passed, 5 total'
      );
      expect(s.state).toBe('CANDIDATE');
      expect(s.candidate_turn).toBe(2);
    });

    it('ATTEMPTING stays ATTEMPTING on test failure', () => {
      const s = transition(
        { state: 'ATTEMPTING', tracked_file: '/src/foo.ts', attempts: 1, candidate_turn: null, current_turn: 1 },
        'Bash', undefined, 'Tests: 2 failed'
      );
      expect(s.state).toBe('ATTEMPTING');
    });

    it('CANDIDATE → ATTEMPTING on re-edit of same file', () => {
      const s = transition(
        { state: 'CANDIDATE', tracked_file: '/src/foo.ts', attempts: 2, candidate_turn: 3, current_turn: 4 },
        'Edit', '/src/foo.ts'
      );
      expect(s.state).toBe('ATTEMPTING');
      expect(s.candidate_turn).toBeNull();
      expect(s.attempts).toBe(3);
    });

    it('CANDIDATE → VICTORY after 3 turns without re-editing (with 2+ attempts)', () => {
      let s: SimpleState = {
        state: 'CANDIDATE', tracked_file: '/src/foo.ts', attempts: 2, candidate_turn: 3, current_turn: 3
      };
      // 3 turns of non-edit activity
      s = transition(s, 'Bash', undefined, undefined); // turn 4
      s = transition(s, 'Bash', undefined, undefined); // turn 5
      s = transition(s, 'Bash', undefined, undefined); // turn 6 → victory!
      expect(s.state).toBe('VICTORY');
    });

    it('CANDIDATE does NOT become VICTORY with only 1 attempt', () => {
      let s: SimpleState = {
        state: 'CANDIDATE', tracked_file: '/src/foo.ts', attempts: 1, candidate_turn: 3, current_turn: 3
      };
      s = transition(s, 'Bash', undefined, undefined);
      s = transition(s, 'Bash', undefined, undefined);
      s = transition(s, 'Bash', undefined, undefined);
      // Only 1 attempt = not a "struggle" worth capturing
      expect(s.state).toBe('CANDIDATE');
    });

    it('full cycle: IDLE → ATTEMPTING → CANDIDATE → VICTORY', () => {
      let s: SimpleState = { state: 'IDLE', tracked_file: null, attempts: 0, candidate_turn: null, current_turn: 0 };

      // First edit
      s = transition(s, 'Edit', '/src/bug.ts');
      expect(s.state).toBe('ATTEMPTING');

      // Test fails
      s = transition(s, 'Bash', undefined, '2 errors found');
      expect(s.state).toBe('ATTEMPTING');

      // Second edit (same file)
      s = transition(s, 'Edit', '/src/bug.ts');
      expect(s.state).toBe('ATTEMPTING');
      expect(s.attempts).toBe(2);

      // Test passes
      s = transition(s, 'Bash', undefined, 'All tests passed');
      expect(s.state).toBe('CANDIDATE');

      // 3 more non-edit turns
      s = transition(s, 'Bash', undefined, undefined);
      s = transition(s, 'Bash', undefined, undefined);
      s = transition(s, 'Bash', undefined, undefined);
      expect(s.state).toBe('VICTORY');
    });
  });
});
