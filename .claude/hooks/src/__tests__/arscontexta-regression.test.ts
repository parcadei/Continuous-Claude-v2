/**
 * Arscontexta Regression Tests
 *
 * Verifies that arscontexta additions don't break existing skill matching,
 * workflow triggers, or cause cross-contamination.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
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
}

interface SkillRules {
  skills: Record<string, SkillRule>;
  agents?: Record<string, SkillRule>;
}

interface MatchedSkill {
  name: string;
  matchType: 'keyword' | 'intent';
  matchedTerm?: string;
}

/**
 * Replicated matchSkills logic from skill-activation-prompt.ts.
 */
function matchSkills(prompt: string, rules: SkillRules): MatchedSkill[] {
  const lowerPrompt = prompt.toLowerCase();
  const matched: MatchedSkill[] = [];

  for (const [skillName, config] of Object.entries(rules.skills)) {
    const triggers = config.promptTriggers;
    if (!triggers) continue;

    if (triggers.keywords) {
      const matchedKeyword = triggers.keywords.find((kw) =>
        lowerPrompt.includes(kw.toLowerCase())
      );
      if (matchedKeyword) {
        matched.push({ name: skillName, matchType: 'keyword', matchedTerm: matchedKeyword });
        continue;
      }
    }

    if (triggers.intentPatterns) {
      const intentMatch = triggers.intentPatterns.some((pattern) => {
        try {
          return new RegExp(pattern, 'i').test(lowerPrompt);
        } catch {
          return false;
        }
      });
      if (intentMatch) {
        matched.push({ name: skillName, matchType: 'intent' });
      }
    }
  }

  return matched;
}

/** Replicated WORKFLOW_TRIGGERS from skill-activation-prompt.ts */
const WORKFLOW_TRIGGERS = [
  {
    skill: 'fix',
    pattern: /\b(fix|debug|broken|failing)\s+(the\s+)?(bug|error|issue|problem)/i,
    antiPattern: /\b(don't|do\s+not|no\s+need\s+to)\s+fix/i,
  },
  {
    skill: 'build',
    pattern: /\b(build|create|implement)\s+(?:a\s+)?(?:new\s+)?(feature|component|page|module|api|endpoint)/i,
    antiPattern: /\b(don't|do\s+not)\s+(build|create|implement)/i,
  },
  {
    skill: 'commit',
    pattern: /\b(commit|save)\s+(these\s+|the\s+|my\s+)?changes/i,
    antiPattern: /\b(don't|do\s+not|before\s+you)\s+commit/i,
  },
  {
    skill: 'ralph',
    pattern: /\b(start|run|launch|use)\s+ralph/i,
  },
];

function checkWorkflowTrigger(prompt: string): string | null {
  for (const trigger of WORKFLOW_TRIGGERS) {
    if (trigger.pattern.test(prompt)) {
      if (trigger.antiPattern && trigger.antiPattern.test(prompt)) continue;
      return trigger.skill;
    }
  }
  return null;
}

describe('Arscontexta Regression', () => {
  let rules: SkillRules;

  beforeAll(() => {
    expect(existsSync(RULES_PATH)).toBe(true);
    rules = JSON.parse(readFileSync(RULES_PATH, 'utf-8'));
  });

  // ── Existing skills still match ──────────────────────────────────

  describe('Existing Skills Match', () => {
    it('"fix the bug in auth" still matches systematic-debugging', () => {
      const matches = matchSkills('fix the bug in auth', rules);
      const debugMatch = matches.find(
        (m) => m.name === 'systematic-debugging'
      );
      expect(debugMatch).toBeDefined();
    });

    it('"commit these changes" still matches commit skill', () => {
      const matches = matchSkills('commit these changes', rules);
      const commitMatch = matches.find((m) => m.name === 'commit');
      expect(commitMatch).toBeDefined();
    });

    it('"ralph mode" still matches ralph skill', () => {
      const matches = matchSkills('ralph mode', rules);
      const ralphMatch = matches.find((m) => m.name === 'ralph');
      expect(ralphMatch).toBeDefined();
    });

    it('"health check" still matches mot', () => {
      const matches = matchSkills('health check', rules);
      const motMatch = matches.find((m) => m.name === 'mot');
      expect(motMatch).toBeDefined();
    });
  });

  // ── Workflow triggers unchanged ──────────────────────────────────

  describe('Workflow Triggers Unchanged', () => {
    it('"fix the bug in login" triggers fix workflow', () => {
      expect(checkWorkflowTrigger('fix the bug in login')).toBe('fix');
    });

    it('"build a new feature" triggers build workflow', () => {
      expect(checkWorkflowTrigger('build a new feature')).toBe('build');
    });

    it('"commit these changes" triggers commit workflow', () => {
      expect(checkWorkflowTrigger('commit these changes')).toBe('commit');
    });

    it('"start ralph" triggers ralph workflow', () => {
      expect(checkWorkflowTrigger('start ralph')).toBe('ralph');
    });
  });

  // ── No cross-contamination ──────────────────────────────────────

  describe('No Cross-Contamination', () => {
    it('"refactor the auth module" does NOT match arscontexta-refactor', () => {
      const matches = matchSkills('refactor the auth module', rules);
      const arsRefactor = matches.find(
        (m) => m.name === 'arscontexta-refactor'
      );
      // arscontexta-refactor requires "/refactor vault" or "reorganize records" —
      // generic "refactor" should not trigger it
      expect(arsRefactor).toBeUndefined();
    });

    it('"update the database schema" does NOT match arscontexta-update', () => {
      const matches = matchSkills('update the database schema', rules);
      const arsUpdate = matches.find(
        (m) => m.name === 'arscontexta-update'
      );
      // arscontexta-update requires "/update" or "update record" —
      // generic "update" in a database context should not trigger
      expect(arsUpdate).toBeUndefined();
    });

    it('"validate the form inputs" does NOT match arscontexta-validate', () => {
      const matches = matchSkills('validate the form inputs', rules);
      const arsValidate = matches.find(
        (m) => m.name === 'arscontexta-validate'
      );
      // arscontexta-validate requires "/validate" or "validate schema"
      expect(arsValidate).toBeUndefined();
    });

    it('"add more unit tests for the login page" does NOT match arscontexta skills', () => {
      const matches = matchSkills('add more unit tests for the login page', rules);
      const arsMatch = matches.find((m) =>
        m.name.startsWith('arscontexta-')
      );
      expect(arsMatch).toBeUndefined();
    });
  });

  // ── Count stability ──────────────────────────────────────────────

  describe('Count Stability', () => {
    it('exactly 95 skills total', () => {
      expect(Object.keys(rules.skills).length).toBe(95);
    });

    it('exactly 18 agents total', () => {
      expect(Object.keys(rules.agents ?? {}).length).toBe(18);
    });
  });
});
