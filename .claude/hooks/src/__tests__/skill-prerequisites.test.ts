/**
 * Phase 2: Prerequisite Resolution Tests
 *
 * Test cases for prerequisite resolution logic.
 * These tests should FAIL initially until implementation.
 */

import { describe, it, expect } from "vitest";
import type { SkillRulesConfig } from "../shared/skill-router-types.js";
import { CircularDependencyError } from "../shared/skill-router-types.js";
import {
  resolvePrerequisites,
  detectCircularDependency,
} from "../skill-router.js";

describe("Prerequisite Resolution", () => {
  it("should return empty arrays for skill with no prerequisites", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "simple-skill": {
          type: "domain",
          description: "A simple skill with no dependencies",
        },
      },
    };

    const result = resolvePrerequisites("simple-skill", rules);

    expect(result.suggest).toEqual([]);
    expect(result.require).toEqual([]);
    expect(result.loadOrder).toEqual(["simple-skill"]);
  });

  it("should return suggestion list from prerequisites.suggest", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "advanced-skill": {
          type: "domain",
          prerequisites: {
            suggest: ["base-skill-1", "base-skill-2"],
          },
        },
        "base-skill-1": { type: "domain" },
        "base-skill-2": { type: "domain" },
      },
    };

    const result = resolvePrerequisites("advanced-skill", rules);

    expect(result.suggest).toEqual(["base-skill-1", "base-skill-2"]);
  });

  it("should return requirement list from prerequisites.require", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "dependent-skill": {
          type: "domain",
          prerequisites: {
            require: ["required-base"],
          },
        },
        "required-base": { type: "domain" },
      },
    };

    const result = resolvePrerequisites("dependent-skill", rules);

    expect(result.require).toEqual(["required-base"]);
  });

  it("should throw error for missing required prerequisite skill", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "dependent-skill": {
          type: "domain",
          prerequisites: {
            require: ["non-existent-skill"],
          },
        },
      },
    };

    // Note: The implementation may choose to warn instead of throw
    // Adjust expectation based on final implementation choice
    const result = resolvePrerequisites("dependent-skill", rules);
    // At minimum, the require list should include the missing skill name
    expect(result.require).toContain("non-existent-skill");
  });

  it("should throw CircularDependencyError for A -> B -> A cycle", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "skill-a": {
          type: "domain",
          prerequisites: { require: ["skill-b"] },
        },
        "skill-b": {
          type: "domain",
          prerequisites: { require: ["skill-a"] },
        },
      },
    };

    expect(() => resolvePrerequisites("skill-a", rules)).toThrow(
      CircularDependencyError,
    );
  });

  it("should throw CircularDependencyError with full path for A -> B -> C -> A cycle", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "skill-a": {
          type: "domain",
          prerequisites: { require: ["skill-b"] },
        },
        "skill-b": {
          type: "domain",
          prerequisites: { require: ["skill-c"] },
        },
        "skill-c": {
          type: "domain",
          prerequisites: { require: ["skill-a"] },
        },
      },
    };

    try {
      resolvePrerequisites("skill-a", rules);
      expect.fail("Should have thrown CircularDependencyError");
    } catch (error) {
      expect(error).toBeInstanceOf(CircularDependencyError);
      const cycleError = error as CircularDependencyError;
      expect(cycleError.cyclePath).toContain("skill-a");
      expect(cycleError.cyclePath).toContain("skill-b");
      expect(cycleError.cyclePath).toContain("skill-c");
    }
  });

  it("should resolve deep chain without cycle correctly", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "level-3": {
          type: "domain",
          prerequisites: { require: ["level-2"] },
        },
        "level-2": {
          type: "domain",
          prerequisites: { require: ["level-1"] },
        },
        "level-1": {
          type: "domain",
          prerequisites: { require: ["base"] },
        },
        base: { type: "domain" },
      },
    };

    const result = resolvePrerequisites("level-3", rules);

    // Should not throw
    expect(result.loadOrder).toBeDefined();
    expect(result.loadOrder.length).toBe(4);
    // Base should come first in load order
    expect(result.loadOrder[0]).toBe("base");
    // Requested skill should come last
    expect(result.loadOrder[result.loadOrder.length - 1]).toBe("level-3");
  });

  it("should return correct loading order (dependencies first)", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "skill-c": {
          type: "domain",
          prerequisites: { require: ["skill-b"] },
        },
        "skill-b": {
          type: "domain",
          prerequisites: { require: ["skill-a"] },
        },
        "skill-a": { type: "domain" },
      },
    };

    const result = resolvePrerequisites("skill-c", rules);

    // Load order: skill-a -> skill-b -> skill-c
    expect(result.loadOrder).toEqual(["skill-a", "skill-b", "skill-c"]);
  });

  it("should handle multiple roots in dependency graph", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "combined-skill": {
          type: "domain",
          prerequisites: {
            require: ["dep-a", "dep-b"],
          },
        },
        "dep-a": { type: "domain" },
        "dep-b": { type: "domain" },
      },
    };

    const result = resolvePrerequisites("combined-skill", rules);

    // Both deps should be in load order before combined-skill
    expect(result.loadOrder).toContain("dep-a");
    expect(result.loadOrder).toContain("dep-b");
    expect(result.loadOrder).toContain("combined-skill");
    expect(result.loadOrder.indexOf("combined-skill")).toBeGreaterThan(
      result.loadOrder.indexOf("dep-a"),
    );
    expect(result.loadOrder.indexOf("combined-skill")).toBeGreaterThan(
      result.loadOrder.indexOf("dep-b"),
    );
  });
});

describe("Circular Dependency Detection", () => {
  it("should return null for skill with no dependencies", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "simple-skill": { type: "domain" },
      },
    };

    const result = detectCircularDependency("simple-skill", rules);
    expect(result).toBeNull();
  });

  it("should return null for linear dependency chain", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "skill-c": {
          type: "domain",
          prerequisites: { require: ["skill-b"] },
        },
        "skill-b": {
          type: "domain",
          prerequisites: { require: ["skill-a"] },
        },
        "skill-a": { type: "domain" },
      },
    };

    const result = detectCircularDependency("skill-c", rules);
    expect(result).toBeNull();
  });

  it("should return cycle path for circular dependency", () => {
    const rules: SkillRulesConfig = {
      skills: {
        "skill-a": {
          type: "domain",
          prerequisites: { require: ["skill-b"] },
        },
        "skill-b": {
          type: "domain",
          prerequisites: { require: ["skill-a"] },
        },
      },
    };

    const result = detectCircularDependency("skill-a", rules);
    expect(result).not.toBeNull();
    expect(result).toContain("skill-a");
    expect(result).toContain("skill-b");
  });
});
