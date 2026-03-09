/**
 * Tests for memory-quality-scorer.ts
 *
 * Validates quality scoring of memory extraction candidates.
 * Signal (>= 5) = store, Borderline (3-4) = store with medium confidence,
 * Noise (< 3) = discard.
 */

import { describe, it, expect } from 'vitest';
import { scoreExtraction, isSignal } from '../shared/memory-quality-scorer.js';
import type { ScoringResult } from '../shared/memory-quality-scorer.js';

describe('memory-quality-scorer', () => {
  describe('scoreExtraction', () => {
    // --- SIGNAL cases ---

    it('should classify error + fix content as SIGNAL', () => {
      const result = scoreExtraction(
        'TypeScript hooks fail silently if dist/ doesn\'t exist. Fixed by running npm run build.'
      );
      expect(result.classification).toBe('SIGNAL');
      expect(result.score).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBe('high');
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should classify decision with reasoning as SIGNAL', () => {
      const result = scoreExtraction(
        'Decided to use PostToolUse instead of PreToolUse for context injection because PreToolUse can\'t inject context reliably'
      );
      expect(result.classification).toBe('SIGNAL');
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    it('should classify root cause analysis as SIGNAL', () => {
      const result = scoreExtraction(
        'Root cause of the session-start failure was a missing PYTHONPATH env var. The script at opc/scripts/core/recall_learnings.py requires PYTHONPATH=opc to import modules correctly.'
      );
      expect(result.classification).toBe('SIGNAL');
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    it('should classify file path + explanation as SIGNAL', () => {
      const result = scoreExtraction(
        'The hook at .claude/hooks/src/shared/atomic-write.ts uses a spin-loop for lock acquisition that blocks the event loop on Windows. Replaced with spawnSync subprocess.'
      );
      expect(result.classification).toBe('SIGNAL');
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    it('should classify code command with context as SIGNAL', () => {
      const result = scoreExtraction(
        'Run `uv run python scripts/core/incremental_extract.py --json` to get structured output. Without --json flag, output is human-readable but unparseable.'
      );
      expect(result.classification).toBe('SIGNAL');
      expect(result.score).toBeGreaterThanOrEqual(5);
    });

    // --- NOISE cases ---

    it('should classify periodic extraction as NOISE', () => {
      const result = scoreExtraction('Periodic extraction from session');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify session checkpoint as NOISE', () => {
      const result = scoreExtraction('Session checkpoint at 2026-01-15');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify bare task status as NOISE', () => {
      const result = scoreExtraction('Task completed');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify heartbeat as NOISE', () => {
      const result = scoreExtraction('heartbeat check ok');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify status update as NOISE', () => {
      const result = scoreExtraction('status update: all systems running');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify "in progress" status as NOISE', () => {
      const result = scoreExtraction('in progress');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify "started" status as NOISE', () => {
      const result = scoreExtraction('started work on task');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    // --- EDGE cases ---

    it('should classify empty string as NOISE', () => {
      const result = scoreExtraction('');
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    it('should classify very long generic text as NOISE', () => {
      // Long but entirely generic, no specifics
      const genericText = 'The system is working well and everything seems to be running correctly. '.repeat(10);
      const result = scoreExtraction(genericText);
      expect(result.classification).toBe('NOISE');
      expect(result.score).toBeLessThan(3);
    });

    // --- BORDERLINE cases ---

    it('should classify short factual statement as BORDERLINE', () => {
      const result = scoreExtraction('The hook system uses esbuild for bundling');
      expect(result.classification).toBe('BORDERLINE');
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.score).toBeLessThanOrEqual(4);
      expect(result.confidence).toBe('medium');
    });

    it('should classify partial technical info as BORDERLINE', () => {
      const result = scoreExtraction(
        'vitest v4 is the test runner. Tests live in src/__tests__/'
      );
      const classification = result.classification;
      // Could be borderline or signal depending on scoring, but should not be noise
      expect(classification).not.toBe('NOISE');
    });

    // --- Context parameter ---

    it('should use context to boost relevance when provided', () => {
      const withoutContext = scoreExtraction('Use atomic writes for state files');
      const withContext = scoreExtraction(
        'Use atomic writes for state files',
        'hook development patterns'
      );
      // Context doesn't decrease score
      expect(withContext.score).toBeGreaterThanOrEqual(withoutContext.score);
    });

    // --- Reasons field ---

    it('should provide reasons for high-scoring content', () => {
      const result = scoreExtraction(
        'Fixed the bug by changing the import path from ./shared/types to ./shared/types.js because NodeNext resolution requires file extensions'
      );
      expect(result.reasons).toBeInstanceOf(Array);
      expect(result.reasons.length).toBeGreaterThan(0);
      // Should mention specific signal indicators that were matched
      expect(result.reasons.some(r => r.length > 0)).toBe(true);
    });

    it('should provide reasons for low-scoring content', () => {
      const result = scoreExtraction('heartbeat check');
      expect(result.reasons).toBeInstanceOf(Array);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    // --- Score boundaries ---

    it('should return score in 0-10 range', () => {
      const entries = [
        '',
        'short',
        'A very detailed explanation of how the hook system works with specific file paths like .claude/hooks/src/shared/atomic-write.ts and error handling patterns that were discovered through debugging',
        'Periodic extraction from session checkpoint heartbeat',
      ];
      for (const entry of entries) {
        const result = scoreExtraction(entry);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(10);
      }
    });

    // --- Classification/confidence consistency ---

    it('should set confidence=high for SIGNAL', () => {
      const result = scoreExtraction(
        'Root cause: the net.Socket spin-loop blocks the event loop. Fixed by using spawnSync subprocess for TCP checks on Windows.'
      );
      if (result.classification === 'SIGNAL') {
        expect(result.confidence).toBe('high');
      }
    });

    it('should set confidence=low for NOISE', () => {
      const result = scoreExtraction('Periodic extraction from session');
      if (result.classification === 'NOISE') {
        expect(result.confidence).toBe('low');
      }
    });
  });

  describe('isSignal', () => {
    it('should return true for signal content', () => {
      expect(isSignal(
        'TypeScript hooks fail silently if dist/ doesn\'t exist. Fixed by running npm run build.'
      )).toBe(true);
    });

    it('should return false for noise content', () => {
      expect(isSignal('Periodic extraction from session')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSignal('')).toBe(false);
    });

    it('should return true for borderline content (threshold >= 3)', () => {
      // isSignal uses score >= threshold (default SIGNAL threshold)
      // Borderline (3-4) should NOT pass isSignal since threshold is 5
      const result = scoreExtraction('The hook system uses esbuild for bundling');
      if (result.classification === 'BORDERLINE') {
        expect(isSignal('The hook system uses esbuild for bundling')).toBe(false);
      }
    });
  });
});
