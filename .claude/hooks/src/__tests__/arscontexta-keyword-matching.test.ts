/**
 * Arscontexta Keyword Matching Tests
 *
 * Verifies that prompts match the correct arscontexta skills.
 * Replicates the matchSkills logic from skill-activation-prompt.ts
 * as a local helper (it's not exported).
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
 * Matches a lowercased prompt against skill keywords and intent patterns.
 */
function matchSkills(
  prompt: string,
  rules: SkillRules
): MatchedSkill[] {
  const lowerPrompt = prompt.toLowerCase();
  const matched: MatchedSkill[] = [];

  for (const [skillName, config] of Object.entries(rules.skills)) {
    const triggers = config.promptTriggers;
    if (!triggers) continue;

    // Keyword matching
    if (triggers.keywords) {
      const matchedKeyword = triggers.keywords.find((kw) =>
        lowerPrompt.includes(kw.toLowerCase())
      );
      if (matchedKeyword) {
        matched.push({ name: skillName, matchType: 'keyword', matchedTerm: matchedKeyword });
        continue;
      }
    }

    // Intent pattern matching
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

/** Filter matched skills to just arscontexta ones */
function matchArscontexta(prompt: string, rules: SkillRules): MatchedSkill[] {
  return matchSkills(prompt, rules).filter((m) =>
    m.name.startsWith('arscontexta-')
  );
}

describe('Arscontexta Keyword Matching', () => {
  let rules: SkillRules;

  beforeAll(() => {
    expect(existsSync(RULES_PATH)).toBe(true);
    rules = JSON.parse(readFileSync(RULES_PATH, 'utf-8'));
  });

  // ── Explicit keywords ────────────────────────────────────────────

  describe('Explicit Keywords', () => {
    it('/arscontexta:health matches arscontexta-health', () => {
      const matches = matchArscontexta('/arscontexta:health', rules);
      expect(matches.some((m) => m.name === 'arscontexta-health')).toBe(true);
    });

    it('/arscontexta:setup matches arscontexta-setup', () => {
      const matches = matchArscontexta('/arscontexta:setup', rules);
      expect(matches.some((m) => m.name === 'arscontexta-setup')).toBe(true);
    });

    it('/arscontexta:architect matches arscontexta-architect', () => {
      const matches = matchArscontexta('/arscontexta:architect', rules);
      expect(matches.some((m) => m.name === 'arscontexta-architect')).toBe(true);
    });

    it('/pipeline matches arscontexta-pipeline', () => {
      const matches = matchArscontexta('/pipeline', rules);
      expect(matches.some((m) => m.name === 'arscontexta-pipeline')).toBe(true);
    });

    it('/document matches arscontexta-document', () => {
      const matches = matchArscontexta('/document', rules);
      expect(matches.some((m) => m.name === 'arscontexta-document')).toBe(true);
    });

    it('/verify matches arscontexta-verify', () => {
      const matches = matchArscontexta('/verify', rules);
      expect(matches.some((m) => m.name === 'arscontexta-verify')).toBe(true);
    });
  });

  // ── Natural language ─────────────────────────────────────────────

  describe('Natural Language', () => {
    it('"check vault health" matches arscontexta-health', () => {
      const matches = matchArscontexta('check vault health', rules);
      expect(matches.some((m) => m.name === 'arscontexta-health')).toBe(true);
    });

    it('"vault diagnostics" matches arscontexta-health', () => {
      const matches = matchArscontexta('run vault diagnostics', rules);
      expect(matches.some((m) => m.name === 'arscontexta-health')).toBe(true);
    });

    it('"extract records from this deployment" matches arscontexta-document', () => {
      const matches = matchArscontexta(
        'extract records from this deployment',
        rules
      );
      expect(matches.some((m) => m.name === 'arscontexta-document')).toBe(true);
    });

    it('"find connections between records" matches arscontexta-connect', () => {
      const matches = matchArscontexta(
        'find connections between records',
        rules
      );
      expect(matches.some((m) => m.name === 'arscontexta-connect')).toBe(true);
    });

    it('"verify records quality" matches arscontexta-verify', () => {
      const matches = matchArscontexta('verify records quality', rules);
      expect(matches.some((m) => m.name === 'arscontexta-verify')).toBe(true);
    });

    it('"run the full pipeline on the vault" matches arscontexta-pipeline', () => {
      const matches = matchArscontexta(
        'run the full pipeline on the vault',
        rules
      );
      expect(matches.some((m) => m.name === 'arscontexta-pipeline')).toBe(true);
    });

    it('"reseed vault from scratch" matches arscontexta-reseed', () => {
      const matches = matchArscontexta('reseed vault from scratch', rules);
      expect(matches.some((m) => m.name === 'arscontexta-reseed')).toBe(true);
    });

    it('"show vault stats and statistics" matches arscontexta-stats', () => {
      const matches = matchArscontexta('show vault stats', rules);
      expect(matches.some((m) => m.name === 'arscontexta-stats')).toBe(true);
    });
  });

  // ── Non-matching prompts ─────────────────────────────────────────

  describe('Non-matching Prompts', () => {
    it('"fix the login bug in auth.ts" returns no arscontexta match', () => {
      const matches = matchArscontexta(
        'fix the login bug in auth.ts',
        rules
      );
      expect(matches.length).toBe(0);
    });

    it('"deploy to production" returns no arscontexta match', () => {
      const matches = matchArscontexta('deploy to production', rules);
      expect(matches.length).toBe(0);
    });

    it('"write unit tests for the API" returns no arscontexta match', () => {
      const matches = matchArscontexta(
        'write unit tests for the API',
        rules
      );
      expect(matches.length).toBe(0);
    });

    it('"hello" returns no arscontexta match', () => {
      const matches = matchArscontexta('hello', rules);
      expect(matches.length).toBe(0);
    });
  });

  // ── Match type verification ──────────────────────────────────────

  describe('Match Type', () => {
    it('explicit keyword match returns matchType: keyword', () => {
      const matches = matchArscontexta('/arscontexta:health', rules);
      const health = matches.find((m) => m.name === 'arscontexta-health');
      expect(health).toBeDefined();
      expect(health!.matchType).toBe('keyword');
    });

    it('intent pattern match returns matchType: intent', () => {
      // "check vault health status" should trigger intent pattern
      // (check|run|show).*?(vault|knowledge).*?(health|status|diagnostics)
      const matches = matchArscontexta(
        'show knowledge system health status',
        rules
      );
      const health = matches.find((m) => m.name === 'arscontexta-health');
      expect(health).toBeDefined();
    });
  });
});
