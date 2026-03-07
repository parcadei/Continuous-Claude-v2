/**
 * Arscontexta Data Integrity Tests
 *
 * Validates the structure and completeness of arscontexta entries
 * in skill-rules.json. Pure JSON validation — no code imports.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
// hooks/src/__tests__ → hooks/ → skills/
const RULES_PATH = resolve(__dirname, '..', '..', '..', 'skills', 'skill-rules.json');

interface PromptTriggers {
  keywords?: string[];
  intentPatterns?: string[];
}

interface SkillRule {
  type?: string;
  enforcement?: string;
  priority?: string;
  description?: string;
  promptTriggers?: PromptTriggers;
  prerequisites?: {
    suggest?: string[];
    require?: string[];
  };
  coActivate?: string[];
  coActivateMode?: string;
  loading?: string;
}

interface SkillRulesConfig {
  version?: string;
  skills: Record<string, SkillRule>;
  agents?: Record<string, SkillRule>;
}

describe('Arscontexta Data Integrity', () => {
  let rules: SkillRulesConfig;
  let arsSkills: [string, SkillRule][];
  let pluginSkills: [string, SkillRule][];
  let vaultSkills: [string, SkillRule][];

  beforeAll(() => {
    const rulesPath = RULES_PATH;
    expect(existsSync(rulesPath)).toBe(true);

    const content = readFileSync(rulesPath, 'utf-8');
    rules = JSON.parse(content);

    arsSkills = Object.entries(rules.skills).filter(([k]) =>
      k.startsWith('arscontexta-')
    );

    pluginSkills = arsSkills.filter(
      ([_, r]) => !r.description?.includes('requires vault cwd')
    );

    vaultSkills = arsSkills.filter(([_, r]) =>
      r.description?.includes('requires vault cwd')
    );
  });

  // ── Skill Count & Existence ──────────────────────────────────────

  describe('Skill Count & Existence', () => {
    it('should have exactly 83 skills', () => {
      expect(Object.keys(rules.skills).length).toBe(83);
    });

    it('should have exactly 18 agents', () => {
      expect(Object.keys(rules.agents ?? {}).length).toBe(18);
    });

    it('should have exactly 26 arscontexta skills', () => {
      expect(arsSkills.length).toBe(26);
    });

    it('should have the knowledge-guide agent', () => {
      expect(rules.agents).toBeDefined();
      expect(rules.agents!['knowledge-guide']).toBeDefined();
      expect(rules.agents!['knowledge-guide'].promptTriggers).toBeDefined();
      expect(
        rules.agents!['knowledge-guide'].promptTriggers!.keywords!.length
      ).toBeGreaterThan(0);
    });
  });

  // ── Plugin Skills (10) ───────────────────────────────────────────

  describe('Plugin Skills (10)', () => {
    it('should have exactly 10 plugin skills', () => {
      expect(pluginSkills.length).toBe(10);
    });

    const expectedPluginSkills = [
      'arscontexta-health',
      'arscontexta-setup',
      'arscontexta-architect',
      'arscontexta-ask',
      'arscontexta-help',
      'arscontexta-reseed',
      'arscontexta-tutorial',
      'arscontexta-recommend',
      'arscontexta-upgrade',
      'arscontexta-add-domain',
    ];

    it.each(expectedPluginSkills)(
      '%s exists with promptTriggers and keywords',
      (skillName) => {
        const entry = arsSkills.find(([k]) => k === skillName);
        expect(entry).toBeDefined();
        const [, rule] = entry!;
        expect(rule.promptTriggers).toBeDefined();
        expect(rule.promptTriggers!.keywords).toBeDefined();
        expect(rule.promptTriggers!.keywords!.length).toBeGreaterThan(0);
      }
    );
  });

  // ── Vault Skills (16) ────────────────────────────────────────────

  describe('Vault Skills (16)', () => {
    it('should have exactly 16 vault skills', () => {
      expect(vaultSkills.length).toBe(16);
    });

    const expectedVaultSkills = [
      'arscontexta-document',
      'arscontexta-connect',
      'arscontexta-verify',
      'arscontexta-update',
      'arscontexta-next',
      'arscontexta-seed',
      'arscontexta-retrospect',
      'arscontexta-validate',
      'arscontexta-learn',
      'arscontexta-stats',
      'arscontexta-graph',
      'arscontexta-pipeline',
      'arscontexta-remember',
      'arscontexta-refactor',
      'arscontexta-ralph',
      'arscontexta-tasks',
    ];

    it.each(expectedVaultSkills)(
      '%s exists with promptTriggers and keywords',
      (skillName) => {
        const entry = arsSkills.find(([k]) => k === skillName);
        expect(entry).toBeDefined();
        const [, rule] = entry!;
        expect(rule.promptTriggers).toBeDefined();
        expect(rule.promptTriggers!.keywords).toBeDefined();
        expect(rule.promptTriggers!.keywords!.length).toBeGreaterThan(0);
      }
    );
  });

  // ── Graph Fields (9 skills) ──────────────────────────────────────

  describe('Graph Fields (9 skills)', () => {
    it('arscontexta-health has coActivate: [arscontexta-verify]', () => {
      const rule = rules.skills['arscontexta-health'];
      expect(rule.coActivate).toEqual(['arscontexta-verify']);
      expect(rule.coActivateMode).toBe('any');
    });

    it('arscontexta-architect has prereqs suggest: [health, stats]', () => {
      const rule = rules.skills['arscontexta-architect'];
      expect(rule.prerequisites?.suggest).toEqual(
        expect.arrayContaining(['arscontexta-health', 'arscontexta-stats'])
      );
    });

    it('arscontexta-reseed has prereqs require: [health]', () => {
      const rule = rules.skills['arscontexta-reseed'];
      expect(rule.prerequisites?.require).toEqual(['arscontexta-health']);
    });

    it('arscontexta-document has prereqs suggest: [seed] and coActivate: [connect]', () => {
      const rule = rules.skills['arscontexta-document'];
      expect(rule.prerequisites?.suggest).toEqual(['arscontexta-seed']);
      expect(rule.coActivate).toEqual(['arscontexta-connect']);
    });

    it('arscontexta-connect has prereqs suggest: [document] and coActivate: [verify]', () => {
      const rule = rules.skills['arscontexta-connect'];
      expect(rule.prerequisites?.suggest).toEqual(['arscontexta-document']);
      expect(rule.coActivate).toEqual(['arscontexta-verify']);
    });

    it('arscontexta-verify has prereqs suggest: [document, connect]', () => {
      const rule = rules.skills['arscontexta-verify'];
      expect(rule.prerequisites?.suggest).toEqual(
        expect.arrayContaining([
          'arscontexta-document',
          'arscontexta-connect',
        ])
      );
      expect(rule.coActivate).toBeUndefined();
    });

    it('arscontexta-update has prereqs suggest: [verify] and coActivate: [connect]', () => {
      const rule = rules.skills['arscontexta-update'];
      expect(rule.prerequisites?.suggest).toEqual(['arscontexta-verify']);
      expect(rule.coActivate).toEqual(['arscontexta-connect']);
    });

    it('arscontexta-retrospect has prereqs suggest: [stats]', () => {
      const rule = rules.skills['arscontexta-retrospect'];
      expect(rule.prerequisites?.suggest).toEqual(['arscontexta-stats']);
    });

    it('arscontexta-pipeline has prereqs require: [document], coActivate: [connect, verify], loading: eager-prerequisites', () => {
      const rule = rules.skills['arscontexta-pipeline'];
      expect(rule.prerequisites?.require).toEqual(['arscontexta-document']);
      expect(rule.coActivate).toEqual(
        expect.arrayContaining([
          'arscontexta-connect',
          'arscontexta-verify',
        ])
      );
      expect(rule.coActivateMode).toBe('all');
      expect(rule.loading).toBe('eager-prerequisites');
    });

    it('exactly 9 arscontexta skills have graph fields', () => {
      const graphSkills = arsSkills.filter(
        ([_, r]) => r.prerequisites || r.coActivate || r.loading
      );
      expect(graphSkills.length).toBe(9);
    });
  });

  // ── Intent Pattern Validity ──────────────────────────────────────

  describe('Intent Pattern Validity', () => {
    it('all intentPatterns compile as valid RegExp', () => {
      const failures: string[] = [];
      for (const [name, rule] of arsSkills) {
        const patterns = rule.promptTriggers?.intentPatterns ?? [];
        for (const pattern of patterns) {
          try {
            new RegExp(pattern, 'i');
          } catch {
            failures.push(`${name}: ${pattern}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });

    it('knowledge-guide agent intentPatterns compile as valid RegExp', () => {
      const agent = rules.agents!['knowledge-guide'];
      const patterns = agent.promptTriggers?.intentPatterns ?? [];
      const failures: string[] = [];
      for (const pattern of patterns) {
        try {
          new RegExp(pattern, 'i');
        } catch {
          failures.push(pattern);
        }
      }
      expect(failures).toEqual([]);
    });
  });

  // ── Keyword Uniqueness ───────────────────────────────────────────

  describe('Keyword Uniqueness', () => {
    it('no duplicate keywords across arscontexta skills', () => {
      const kwMap = new Map<string, string[]>();
      for (const [name, rule] of arsSkills) {
        const kws = rule.promptTriggers?.keywords ?? [];
        for (const kw of kws) {
          const key = kw.toLowerCase();
          const existing = kwMap.get(key) ?? [];
          existing.push(name);
          kwMap.set(key, existing);
        }
      }
      const duplicates = Array.from(kwMap.entries()).filter(
        ([_, skills]) => skills.length > 1
      );
      expect(duplicates).toEqual([]);
    });
  });
});
