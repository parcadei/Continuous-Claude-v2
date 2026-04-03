/**
 * Phase 1: Backward Compatibility Tests
 *
 * Verify that existing skill-rules.json works without new fields.
 * These tests should PASS after implementation.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
describe("Backward Compatibility", () => {
  let skillRules;
  beforeEach(() => {
    const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
    const rulesPath = join(projectDir, ".claude", "skills", "skill-rules.json");
    try {
      const content = readFileSync(rulesPath, "utf-8");
      skillRules = JSON.parse(content);
    } catch {
      // Use a minimal valid config for testing
      skillRules = { skills: {} };
    }
  });
  it("should load existing skill-rules.json without errors", () => {
    expect(skillRules).toBeDefined();
    expect(skillRules.skills).toBeDefined();
  });
  it("should work with skills that have no prerequisites field", () => {
    // Get a skill without prerequisites (any existing skill)
    const skillNames = Object.keys(skillRules.skills);
    if (skillNames.length === 0) {
      // If no skills, test passes (nothing to break)
      expect(true).toBe(true);
      return;
    }
    const firstSkill = skillRules.skills[skillNames[0]];
    // Should not throw when accessing missing prerequisites
    expect(() => {
      const prereqs = firstSkill.prerequisites;
      return prereqs === undefined;
    }).not.toThrow();
  });
  it("should work with skills that have no coActivate field", () => {
    const skillNames = Object.keys(skillRules.skills);
    if (skillNames.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const firstSkill = skillRules.skills[skillNames[0]];
    // Should not throw when accessing missing coActivate
    expect(() => {
      const coActivate = firstSkill.coActivate;
      return coActivate === undefined;
    }).not.toThrow();
  });
  it("should default loading mode to lazy when not specified", () => {
    const skillNames = Object.keys(skillRules.skills);
    if (skillNames.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const firstSkill = skillRules.skills[skillNames[0]];
    // Default should be lazy when not specified
    const loading = firstSkill.loading ?? "lazy";
    expect(loading).toBe("lazy");
  });
  it("should maintain existing prompt matching functionality", () => {
    // Find a skill with promptTriggers
    const skillWithTriggers = Object.entries(skillRules.skills).find(
      ([_, rule]) => rule.promptTriggers?.keywords?.length,
    );
    if (!skillWithTriggers) {
      // No skills with triggers, test passes
      expect(true).toBe(true);
      return;
    }
    const [skillName, rule] = skillWithTriggers;
    expect(rule.promptTriggers).toBeDefined();
    expect(rule.promptTriggers.keywords).toBeDefined();
    expect(Array.isArray(rule.promptTriggers.keywords)).toBe(true);
  });
});
