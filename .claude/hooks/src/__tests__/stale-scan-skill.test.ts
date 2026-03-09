/**
 * Structural validation tests for the stale-scan skill.
 *
 * Validates that SKILL.md follows v5 Hybrid format, contains all required
 * sections, references correct archived items, and stays under 404 lines.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SKILL_PATH = resolve(__dirname, '../../../skills/stale-scan/SKILL.md');

describe('stale-scan skill', () => {
  let content: string;
  let lines: string[];

  beforeAll(() => {
    expect(existsSync(SKILL_PATH)).toBe(true);
    content = readFileSync(SKILL_PATH, 'utf-8');
    lines = content.split('\n');
  });

  describe('v5 Hybrid format compliance', () => {
    it('should start with YAML front matter', () => {
      expect(lines[0]).toBe('---');
      const closingIdx = lines.indexOf('---', 1);
      expect(closingIdx).toBeGreaterThan(1);
    });

    it('should have required front matter fields', () => {
      const frontMatterEnd = lines.indexOf('---', 1);
      const frontMatter = lines.slice(1, frontMatterEnd).join('\n');
      expect(frontMatter).toContain('name:');
      expect(frontMatter).toContain('description:');
    });

    it('should have name: stale-scan', () => {
      const frontMatterEnd = lines.indexOf('---', 1);
      const frontMatter = lines.slice(1, frontMatterEnd).join('\n');
      expect(frontMatter).toMatch(/name:\s*stale-scan/);
    });

    it('should be under 404 lines', () => {
      expect(lines.length).toBeLessThanOrEqual(404);
    });
  });

  describe('trigger keywords', () => {
    it('should contain "stale scan" trigger', () => {
      expect(content.toLowerCase()).toContain('stale scan');
    });

    it('should contain "stale references" trigger', () => {
      expect(content.toLowerCase()).toContain('stale references');
    });

    it('should contain "dead references" trigger', () => {
      expect(content.toLowerCase()).toContain('dead references');
    });

    it('should contain "stale check" trigger', () => {
      expect(content.toLowerCase()).toContain('stale check');
    });
  });

  describe('known archived items', () => {
    it('should reference Sentinel as archived', () => {
      expect(content).toContain('Sentinel');
    });

    it('should reference Warden as archived', () => {
      expect(content).toContain('Warden');
    });

    it('should reference sync-test-1769821789 stale rule', () => {
      expect(content).toContain('sync-test-1769821789');
    });

    it('should reference sync-v2-1769821904 stale rule', () => {
      expect(content).toContain('sync-v2-1769821904');
    });

    it('should reference sync-v3-1769821990 stale rule', () => {
      expect(content).toContain('sync-v3-1769821990');
    });
  });

  describe('scan targets', () => {
    it('should specify CLAUDE.md as scan target', () => {
      expect(content).toContain('CLAUDE.md');
    });

    it('should specify RULES.md as scan target', () => {
      expect(content).toContain('RULES.md');
    });

    it('should specify rules/*.md as scan target', () => {
      expect(content).toMatch(/rules\/\*\.md|rules\//);
    });

    it('should specify skills/*/SKILL.md as scan target', () => {
      expect(content).toMatch(/skills\/\*\/SKILL\.md|skills\//);
    });

    it('should specify agents/*.yml as scan target', () => {
      expect(content).toMatch(/agents\/\*\.yml|agents\//);
    });
  });

  describe('dynamic archive detection', () => {
    it('should include command to list archived agents', () => {
      expect(content).toMatch(/agents\/archive/);
    });

    it('should include dynamic detection instructions', () => {
      // Should describe how to dynamically find archived items
      expect(content.toLowerCase()).toContain('dynamic');
    });
  });

  describe('output format', () => {
    it('should define a report table format', () => {
      // Must include table headers for the report
      expect(content).toContain('File');
      expect(content).toContain('Line');
      expect(content).toContain('Reference');
    });

    it('should include Suggested Fix column', () => {
      expect(content).toContain('Suggested Fix');
    });
  });

  describe('auto-fix safety', () => {
    it('should require user confirmation before fixes', () => {
      expect(content.toLowerCase()).toMatch(/confirm|approval|ask.*before|user.*confirm/);
    });

    it('should not auto-fix without asking', () => {
      expect(content.toLowerCase()).toMatch(/never.*auto.?fix|do not.*auto|require.*confirm/);
    });
  });

  describe('scan method', () => {
    it('should include grep-based search instructions', () => {
      expect(content).toMatch(/grep|Grep/);
    });

    it('should search across both ~/.claude and continuous-claude paths', () => {
      expect(content).toMatch(/~\/\.claude|HOME/);
      expect(content).toMatch(/continuous-claude/);
    });
  });
});
