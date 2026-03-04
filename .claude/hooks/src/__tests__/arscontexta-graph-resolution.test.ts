/**
 * Arscontexta Graph Resolution Tests
 *
 * Tests graph functions (resolvePrerequisites, resolveCoActivation,
 * getLoadingMode, buildEnhancedLookupResult) against real arscontexta data.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { SkillRulesConfig } from '../shared/skill-router-types.js';
import {
  resolvePrerequisites,
  resolveCoActivation,
  getLoadingMode,
  buildEnhancedLookupResult,
} from '../skill-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const RULES_PATH = resolve(__dirname, '..', '..', '..', 'skills', 'skill-rules.json');

describe('Arscontexta Graph Resolution', () => {
  let rules: SkillRulesConfig;

  beforeAll(() => {
    expect(existsSync(RULES_PATH)).toBe(true);
    const content = readFileSync(RULES_PATH, 'utf-8');
    rules = JSON.parse(content) as SkillRulesConfig;
  });

  // ── arscontexta-document ─────────────────────────────────────────

  describe('arscontexta-document', () => {
    it('prereqs suggest includes arscontexta-seed', () => {
      const result = resolvePrerequisites('arscontexta-document', rules);
      expect(result.suggest).toContain('arscontexta-seed');
    });

    it('prereqs require is empty', () => {
      const result = resolvePrerequisites('arscontexta-document', rules);
      expect(result.require).toEqual([]);
    });

    it('coActivate includes arscontexta-connect', () => {
      const result = resolveCoActivation('arscontexta-document', rules);
      expect(result.peers).toContain('arscontexta-connect');
    });
  });

  // ── arscontexta-connect ──────────────────────────────────────────

  describe('arscontexta-connect', () => {
    it('prereqs suggest includes arscontexta-document', () => {
      const result = resolvePrerequisites('arscontexta-connect', rules);
      expect(result.suggest).toContain('arscontexta-document');
    });

    it('coActivate includes arscontexta-verify', () => {
      const result = resolveCoActivation('arscontexta-connect', rules);
      expect(result.peers).toContain('arscontexta-verify');
    });
  });

  // ── arscontexta-verify ───────────────────────────────────────────

  describe('arscontexta-verify', () => {
    it('prereqs suggest includes document and connect', () => {
      const result = resolvePrerequisites('arscontexta-verify', rules);
      expect(result.suggest).toContain('arscontexta-document');
      expect(result.suggest).toContain('arscontexta-connect');
    });

    it('has no co-activation peers', () => {
      const result = resolveCoActivation('arscontexta-verify', rules);
      expect(result.peers).toEqual([]);
    });
  });

  // ── arscontexta-pipeline ─────────────────────────────────────────

  describe('arscontexta-pipeline', () => {
    it('prereqs require includes arscontexta-document', () => {
      const result = resolvePrerequisites('arscontexta-pipeline', rules);
      expect(result.require).toContain('arscontexta-document');
    });

    it('coActivate includes connect and verify', () => {
      const result = resolveCoActivation('arscontexta-pipeline', rules);
      expect(result.peers).toContain('arscontexta-connect');
      expect(result.peers).toContain('arscontexta-verify');
    });

    it('loading mode is eager-prerequisites', () => {
      const mode = getLoadingMode('arscontexta-pipeline', rules);
      expect(mode).toBe('eager-prerequisites');
    });

    it('loadOrder puts seed before document before pipeline', () => {
      const result = resolvePrerequisites('arscontexta-pipeline', rules);
      const seedIdx = result.loadOrder.indexOf('arscontexta-seed');
      const docIdx = result.loadOrder.indexOf('arscontexta-document');
      const pipeIdx = result.loadOrder.indexOf('arscontexta-pipeline');

      // seed and document should appear before pipeline
      expect(docIdx).toBeLessThan(pipeIdx);
      // seed is a suggested prereq of document, so it should appear first
      if (seedIdx !== -1) {
        expect(seedIdx).toBeLessThan(docIdx);
      }
    });
  });

  // ── arscontexta-health ───────────────────────────────────────────

  describe('arscontexta-health', () => {
    it('coActivate includes arscontexta-verify', () => {
      const result = resolveCoActivation('arscontexta-health', rules);
      expect(result.peers).toContain('arscontexta-verify');
      expect(result.mode).toBe('any');
    });

    it('has no prerequisites', () => {
      const result = resolvePrerequisites('arscontexta-health', rules);
      expect(result.suggest).toEqual([]);
      expect(result.require).toEqual([]);
    });
  });

  // ── arscontexta-architect ────────────────────────────────────────

  describe('arscontexta-architect', () => {
    it('prereqs suggest includes health and stats', () => {
      const result = resolvePrerequisites('arscontexta-architect', rules);
      expect(result.suggest).toContain('arscontexta-health');
      expect(result.suggest).toContain('arscontexta-stats');
    });
  });

  // ── arscontexta-reseed ───────────────────────────────────────────

  describe('arscontexta-reseed', () => {
    it('prereqs require includes arscontexta-health', () => {
      const result = resolvePrerequisites('arscontexta-reseed', rules);
      expect(result.require).toContain('arscontexta-health');
    });
  });

  // ── arscontexta-update ───────────────────────────────────────────

  describe('arscontexta-update', () => {
    it('prereqs suggest includes arscontexta-verify', () => {
      const result = resolvePrerequisites('arscontexta-update', rules);
      expect(result.suggest).toContain('arscontexta-verify');
    });

    it('coActivate includes arscontexta-connect', () => {
      const result = resolveCoActivation('arscontexta-update', rules);
      expect(result.peers).toContain('arscontexta-connect');
    });
  });

  // ── arscontexta-retrospect ───────────────────────────────────────

  describe('arscontexta-retrospect', () => {
    it('prereqs suggest includes arscontexta-stats', () => {
      const result = resolvePrerequisites('arscontexta-retrospect', rules);
      expect(result.suggest).toContain('arscontexta-stats');
    });
  });

  // ── Circular dependency check ────────────────────────────────────

  describe('Circular Dependencies', () => {
    it('no circular dependencies in any of the 9 graph skills', () => {
      const graphSkillNames = [
        'arscontexta-health',
        'arscontexta-architect',
        'arscontexta-reseed',
        'arscontexta-document',
        'arscontexta-connect',
        'arscontexta-verify',
        'arscontexta-update',
        'arscontexta-retrospect',
        'arscontexta-pipeline',
      ];

      for (const skillName of graphSkillNames) {
        expect(() => resolvePrerequisites(skillName, rules)).not.toThrow();
      }
    });
  });

  // ── buildEnhancedLookupResult ────────────────────────────────────

  describe('buildEnhancedLookupResult', () => {
    it('returns full result for arscontexta-pipeline', () => {
      const result = buildEnhancedLookupResult(
        { skillName: 'arscontexta-pipeline', source: 'keyword', priorityValue: 2 },
        rules
      );

      expect(result.found).toBe(true);
      expect(result.skillName).toBe('arscontexta-pipeline');
      expect(result.prerequisites).toBeDefined();
      expect(result.prerequisites!.require).toContain('arscontexta-document');
      expect(result.coActivation).toBeDefined();
      expect(result.coActivation!.peers).toContain('arscontexta-connect');
      expect(result.coActivation!.peers).toContain('arscontexta-verify');
      expect(result.loading).toBe('eager-prerequisites');
    });

    it('returns empty graph fields for non-graph arscontexta skill', () => {
      const result = buildEnhancedLookupResult(
        { skillName: 'arscontexta-help', source: 'keyword', priorityValue: 1 },
        rules
      );

      expect(result.found).toBe(true);
      expect(result.prerequisites?.suggest).toEqual([]);
      expect(result.prerequisites?.require).toEqual([]);
      expect(result.coActivation?.peers).toEqual([]);
      expect(result.loading).toBe('lazy');
    });

    it('returns full result for arscontexta-document with prereqs and co-activation', () => {
      const result = buildEnhancedLookupResult(
        { skillName: 'arscontexta-document', source: 'keyword', priorityValue: 2 },
        rules
      );

      expect(result.found).toBe(true);
      expect(result.prerequisites!.suggest).toContain('arscontexta-seed');
      expect(result.coActivation!.peers).toContain('arscontexta-connect');
    });

    it('returns full result for arscontexta-health with co-activation only', () => {
      const result = buildEnhancedLookupResult(
        { skillName: 'arscontexta-health', source: 'keyword', priorityValue: 2 },
        rules
      );

      expect(result.found).toBe(true);
      expect(result.prerequisites!.suggest).toEqual([]);
      expect(result.prerequisites!.require).toEqual([]);
      expect(result.coActivation!.peers).toContain('arscontexta-verify');
    });
  });

  // ── Loading mode defaults ────────────────────────────────────────

  describe('Loading Mode', () => {
    it('returns lazy for skills without loading field', () => {
      const nonLoadingSkills = [
        'arscontexta-health',
        'arscontexta-document',
        'arscontexta-connect',
        'arscontexta-verify',
        'arscontexta-update',
      ];
      for (const skillName of nonLoadingSkills) {
        expect(getLoadingMode(skillName, rules)).toBe('lazy');
      }
    });

    it('returns eager-prerequisites only for arscontexta-pipeline', () => {
      expect(getLoadingMode('arscontexta-pipeline', rules)).toBe('eager-prerequisites');
    });
  });
});
