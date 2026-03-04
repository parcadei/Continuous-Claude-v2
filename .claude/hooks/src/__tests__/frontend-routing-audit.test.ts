/**
 * Frontend Routing Audit Tests
 *
 * 50-prompt test matrix validating skill routing for React/Next.js development,
 * Vercel-CLI deployment, and frontend design skills.
 *
 * Categories:
 *   A (15): Pure React/Next.js dev -> must trigger react-perf/shadcn/ui-audit, NOT vercel-cli
 *   B (10): Pure deployment -> vercel-cli only for Vercel-specific, NONE for Railway/generic
 *   C (10): Mixed prompts -> correct multi-skill activation
 *   D (10): Edge cases (dark mode, responsive, lazy loading) -> ui-ux-pro-max/react-perf
 *   E (5):  Negative tests -> must NOT trigger any frontend skill
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
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
  coActivate?: string[];
}

interface SkillRules {
  skills: Record<string, SkillRule>;
  agents?: Record<string, SkillRule>;
}

interface MatchResult {
  name: string;
  source: 'skill' | 'agent';
  matchType: 'keyword' | 'intent';
  matchedTerm?: string;
}

let rules: SkillRules;

/** Match both skills and agents, returning unified results */
function matchAll(prompt: string, rules: SkillRules): MatchResult[] {
  const lowerPrompt = prompt.toLowerCase();
  const matched: MatchResult[] = [];

  // Match skills
  for (const [skillName, config] of Object.entries(rules.skills)) {
    const triggers = config.promptTriggers;
    if (!triggers) continue;

    if (triggers.keywords) {
      const matchedKeyword = triggers.keywords.find((kw) =>
        lowerPrompt.includes(kw.toLowerCase())
      );
      if (matchedKeyword) {
        matched.push({ name: skillName, source: 'skill', matchType: 'keyword', matchedTerm: matchedKeyword });
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
        matched.push({ name: skillName, source: 'skill', matchType: 'intent' });
      }
    }
  }

  // Match agents
  if (rules.agents) {
    for (const [agentName, config] of Object.entries(rules.agents)) {
      const triggers = config.promptTriggers;
      if (!triggers) continue;

      if (triggers.keywords) {
        const matchedKeyword = triggers.keywords.find((kw) =>
          lowerPrompt.includes(kw.toLowerCase())
        );
        if (matchedKeyword) {
          matched.push({ name: agentName, source: 'agent', matchType: 'keyword', matchedTerm: matchedKeyword });
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
          matched.push({ name: agentName, source: 'agent', matchType: 'intent' });
        }
      }
    }
  }

  return matched;
}

function matchNames(prompt: string): string[] {
  return matchAll(prompt, rules).map(m => m.name);
}

const FRONTEND_SKILLS = [
  'react-perf', 'ui-audit', 'ui-ux-pro-max', 'frontend-design',
  'shadcn-create', 'vercel-cli',
];

beforeAll(() => {
  rules = JSON.parse(readFileSync(RULES_PATH, 'utf-8'));
});

describe('Frontend Routing Audit', () => {
  // ===== Category A: Pure React/Next.js Development (15 prompts) =====
  describe('A: React/Next.js dev prompts', () => {
    it('A01: "optimize this React component for performance"', () => {
      const names = matchNames('optimize this React component for performance');
      expect(names).toContain('react-perf');
      expect(names).not.toContain('vercel-cli');
    });

    it('A02: "fix the hydration error in my Next.js app"', () => {
      const names = matchNames('fix the hydration error in my Next.js app');
      expect(names).toContain('react-perf');
      expect(names).not.toContain('vercel-cli');
    });

    it('A03: "add shadcn button component"', () => {
      const names = matchNames('add shadcn button component');
      expect(names).toContain('shadcn-create');
      expect(names).not.toContain('vercel-cli');
    });

    it('A04: "reduce bundle size for the dashboard page"', () => {
      const names = matchNames('reduce bundle size for the dashboard page');
      expect(names).toContain('react-perf');
      expect(names).not.toContain('vercel-cli');
    });

    it('A05: "implement code splitting with React.lazy"', () => {
      const names = matchNames('implement code splitting with React.lazy');
      expect(names).toContain('react-perf');
      expect(names).not.toContain('vercel-cli');
    });

    it('A06: "add server component to the user profile page"', () => {
      const names = matchNames('add server component to the user profile page');
      expect(names).toContain('react-perf');
    });

    it('A07: "setup shadcn/ui with tailwind"', () => {
      const names = matchNames('setup shadcn/ui with tailwind');
      expect(names).toContain('shadcn-create');
    });

    it('A08: "check accessibility of the login form"', () => {
      const names = matchNames('check accessibility of the login form');
      expect(names).toContain('ui-audit');
    });

    it('A09: "add aria labels to the navigation"', () => {
      const names = matchNames('add aria labels to the navigation');
      expect(names).toContain('ui-audit');
    });

    it('A10: "fix re-render issue in the data table"', () => {
      const names = matchNames('fix re-render issue in the data table');
      expect(names).toContain('react-perf');
    });

    it('A11: "add React Suspense boundary for the dashboard"', () => {
      const names = matchNames('add React Suspense boundary for the dashboard');
      expect(names).toContain('react-perf');
    });

    it('A12: "optimize with useMemo and useCallback"', () => {
      const names = matchNames('optimize with useMemo and useCallback');
      expect(names).toContain('react-perf');
    });

    it('A13: "add error boundary to the checkout flow"', () => {
      const names = matchNames('add error boundary to the checkout flow');
      expect(names).toContain('react-perf');
    });

    it('A14: "audit the UI for wcag compliance"', () => {
      const names = matchNames('audit the UI for wcag compliance');
      expect(names).toContain('ui-audit');
    });

    it('A15: "add keyboard navigation to the dropdown menu"', () => {
      const names = matchNames('add keyboard navigation to the dropdown menu');
      expect(names).toContain('ui-audit');
    });
  });

  // ===== Category B: Pure Deployment (10 prompts) =====
  describe('B: Deployment prompts', () => {
    it('B01: "deploy to production" should NOT trigger vercel-cli', () => {
      const names = matchNames('deploy to production');
      expect(names).not.toContain('vercel-cli');
    });

    it('B02: "push to production" should NOT trigger vercel-cli', () => {
      const names = matchNames('push to production');
      expect(names).not.toContain('vercel-cli');
    });

    it('B03: "ship to preview" should NOT trigger vercel-cli', () => {
      const names = matchNames('ship to preview');
      expect(names).not.toContain('vercel-cli');
    });

    it('B04: "deploy to Railway" should NOT trigger vercel-cli', () => {
      const names = matchNames('deploy to Railway');
      expect(names).not.toContain('vercel-cli');
    });

    it('B05: "deploy to vercel" SHOULD trigger vercel-cli', () => {
      const names = matchNames('deploy to vercel');
      expect(names).toContain('vercel-cli');
    });

    it('B06: "push the latest build to vercel" SHOULD trigger', () => {
      const names = matchNames('push the latest build to vercel');
      expect(names).toContain('vercel-cli');
    });

    it('B07: "setup vercel project" SHOULD trigger', () => {
      const names = matchNames('setup vercel project');
      expect(names).toContain('vercel-cli');
    });

    it('B08: "configure vercel environment variables" SHOULD trigger', () => {
      const names = matchNames('configure vercel environment variables');
      expect(names).toContain('vercel-cli');
    });

    it('B09: "deploy to fly.io" should NOT trigger vercel-cli', () => {
      const names = matchNames('deploy to fly.io');
      expect(names).not.toContain('vercel-cli');
    });

    it('B10: "ship this to vercel preview" SHOULD trigger', () => {
      const names = matchNames('ship this to vercel preview');
      expect(names).toContain('vercel-cli');
    });
  });

  // ===== Category C: Mixed Prompts (10 prompts) =====
  describe('C: Mixed multi-skill prompts', () => {
    it('C01: "optimize React component and check accessibility"', () => {
      const names = matchNames('optimize React component and check accessibility');
      expect(names).toContain('react-perf');
      expect(names).toContain('ui-audit');
    });

    it('C02: "add shadcn components and optimize bundle"', () => {
      const names = matchNames('add shadcn components and optimize bundle size');
      expect(names).toContain('shadcn-create');
      expect(names).toContain('react-perf');
    });

    it('C03: "design a landing page with dark mode"', () => {
      const names = matchNames('design a landing page with dark mode');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('C04: "build a responsive dashboard with shadcn"', () => {
      const names = matchNames('build a responsive design dashboard with shadcn');
      expect(names).toContain('shadcn-create');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('C05: "deploy to vercel and optimize performance"', () => {
      const names = matchNames('deploy to vercel and optimize react performance');
      expect(names).toContain('vercel-cli');
      expect(names).toContain('react-perf');
    });

    it('C06: "check a11y and add focus states"', () => {
      const names = matchNames('check a11y and add focus states');
      expect(names).toContain('ui-audit');
    });

    it('C07: "design bold UI with creative frontend approach"', () => {
      const names = matchNames('design bold UI with creative frontend approach');
      expect(names).toContain('frontend-design');
    });

    it('C08: "build a hero page with distinctive design"', () => {
      const names = matchNames('build a hero page with distinctive design');
      expect(names).toContain('frontend-design');
    });

    it('C09: "improve the UI look and style of the settings page"', () => {
      const names = matchNames('improve the UI look and style of the settings page');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('C10: "audit UI compliance and screen reader support"', () => {
      const names = matchNames('audit UI compliance and screen reader support');
      expect(names).toContain('ui-audit');
    });
  });

  // ===== Category D: Edge Cases (10 prompts) =====
  describe('D: Edge cases - design/perf keywords', () => {
    it('D01: "add dark mode toggle"', () => {
      const names = matchNames('add dark mode toggle');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('D02: "pick a color palette for the app"', () => {
      const names = matchNames('pick a color palette for the app');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('D03: "implement lazy loading for images"', () => {
      const names = matchNames('implement lazy loading for images');
      expect(names).toContain('react-perf');
    });

    it('D04: "add responsive design for mobile"', () => {
      const names = matchNames('add responsive design for mobile');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('D05: "setup ISR for the blog pages"', () => {
      const names = matchNames('setup ISR for the blog pages');
      expect(names).toContain('react-perf');
    });

    it('D06: "add SSG to the marketing pages"', () => {
      const names = matchNames('add SSG to the marketing pages');
      expect(names).toContain('react-perf');
    });

    it('D07: "fix SSR hydration mismatch"', () => {
      const names = matchNames('fix SSR hydration mismatch');
      expect(names).toContain('react-perf');
    });

    it('D08: "add glassmorphism effect to the card"', () => {
      const names = matchNames('add glassmorphism effect to the card');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('D09: "choose typography and font pairing"', () => {
      const names = matchNames('choose typography and font pairing');
      expect(names).toContain('ui-ux-pro-max');
    });

    it('D10: "build aesthetic visual direction for the brand"', () => {
      const names = matchNames('build aesthetic visual direction for the brand');
      expect(names).toContain('frontend-design');
    });
  });

  // ===== Category E: Negative Tests (5 prompts) =====
  describe('E: Negative tests - no frontend skill should trigger', () => {
    it('E01: "write a Python script to parse CSV files"', () => {
      const names = matchNames('write a Python script to parse CSV files');
      const frontendMatches = names.filter(n => FRONTEND_SKILLS.includes(n));
      expect(frontendMatches).toHaveLength(0);
    });

    it('E02: "fix the database migration for PostgreSQL"', () => {
      const names = matchNames('fix the database migration for PostgreSQL');
      const frontendMatches = names.filter(n => FRONTEND_SKILLS.includes(n));
      expect(frontendMatches).toHaveLength(0);
    });

    it('E03: "add unit tests for the auth service"', () => {
      const names = matchNames('add unit tests for the auth service');
      const frontendMatches = names.filter(n => FRONTEND_SKILLS.includes(n));
      expect(frontendMatches).toHaveLength(0);
    });

    it('E04: "refactor the backend API routes"', () => {
      const names = matchNames('refactor the backend API routes');
      const frontendMatches = names.filter(n => FRONTEND_SKILLS.includes(n));
      expect(frontendMatches).toHaveLength(0);
    });

    it('E05: "update the Docker compose configuration"', () => {
      const names = matchNames('update the Docker compose configuration');
      const frontendMatches = names.filter(n => FRONTEND_SKILLS.includes(n));
      expect(frontendMatches).toHaveLength(0);
    });
  });

  // ===== Co-activation Tests =====
  describe('Co-activation graph edges', () => {
    it('shadcn-create should co-activate react-perf', () => {
      const config = rules.skills['shadcn-create'];
      expect(config.coActivate).toContain('react-perf');
    });

    it('react-perf (agent) should co-activate ui-audit', () => {
      const config = rules.agents!['react-perf'];
      expect(config.coActivate).toContain('ui-audit');
    });

    it('ui-audit (agent) should co-activate react-perf', () => {
      const config = rules.agents!['ui-audit'];
      expect(config.coActivate).toContain('react-perf');
    });
  });
});
