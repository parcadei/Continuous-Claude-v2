/**
 * Phase 6: Integration Tests
 *
 * Full flow tests verifying complete prerequisite resolution.
 * These tests should FAIL initially until implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  SkillRulesConfig,
  SkillLookupResult,
} from "../shared/skill-router-types.js";
import {
  resolvePrerequisites,
  resolveCoActivation,
  getLoadingMode,
  buildEnhancedLookupResult,
} from "../skill-router.js";

describe("Integration: Full Flow", () => {
  const testRules: SkillRulesConfig = {
    skills: {
      "lean4-limits": {
        type: "domain",
        priority: "high",
        prerequisites: {
          suggest: ["lean4", "lean4-nat-trans"],
          require: ["lean4-functors"],
        },
        promptTriggers: {
          keywords: ["limits", "colimits"],
        },
      },
      "lean4-functors": {
        type: "domain",
        priority: "medium",
        prerequisites: {
          require: ["lean4"],
        },
      },
      "lean4-nat-trans": {
        type: "domain",
        priority: "medium",
        prerequisites: {
          require: ["lean4"],
        },
      },
      lean4: {
        type: "domain",
        priority: "high",
        promptTriggers: {
          keywords: ["lean4", "lean 4", "theorem prover"],
        },
      },
      "math-mode": {
        type: "domain",
        coActivate: ["sympy-compute", "z3-solve"],
        coActivateMode: "any",
        promptTriggers: {
          keywords: ["math mode", "mathematics"],
        },
      },
      "sympy-compute": { type: "domain" },
      "z3-solve": { type: "domain" },
      implement_plan: {
        type: "workflow",
        loading: "eager",
        promptTriggers: {
          keywords: ["implement the plan", "follow the plan"],
        },
      },
    },
  };

  describe("Prerequisite Resolution Flow", () => {
    it("should resolve full prerequisite chain for lean4-limits", () => {
      const result = resolvePrerequisites("lean4-limits", testRules);

      // Should have suggestions
      expect(result.suggest).toContain("lean4");
      expect(result.suggest).toContain("lean4-nat-trans");

      // Should have requirements
      expect(result.require).toContain("lean4-functors");

      // Load order should start with lean4 (base) and end with lean4-limits
      expect(result.loadOrder[0]).toBe("lean4");
      expect(result.loadOrder[result.loadOrder.length - 1]).toBe(
        "lean4-limits",
      );
    });

    it("should include transitive dependencies in load order", () => {
      const result = resolvePrerequisites("lean4-limits", testRules);

      // lean4-functors requires lean4
      // lean4-nat-trans requires lean4
      // lean4-limits requires lean4-functors
      // So load order should be: lean4 -> lean4-nat-trans (or lean4-functors) -> lean4-functors (or lean4-nat-trans) -> lean4-limits
      expect(result.loadOrder).toContain("lean4");
      expect(result.loadOrder).toContain("lean4-functors");
      expect(result.loadOrder).toContain("lean4-limits");

      // lean4 must come before lean4-functors
      expect(result.loadOrder.indexOf("lean4")).toBeLessThan(
        result.loadOrder.indexOf("lean4-functors"),
      );
    });
  });

  describe("Co-activation Flow", () => {
    it("should resolve co-activation peers for math-mode", () => {
      const result = resolveCoActivation("math-mode", testRules);

      expect(result.peers).toContain("sympy-compute");
      expect(result.peers).toContain("z3-solve");
      expect(result.mode).toBe("any");
    });
  });

  describe("Loading Mode Flow", () => {
    it("should return eager for implement_plan", () => {
      const mode = getLoadingMode("implement_plan", testRules);

      expect(mode).toBe("eager");
    });

    it("should return lazy for skill without loading mode", () => {
      const mode = getLoadingMode("lean4", testRules);

      expect(mode).toBe("lazy");
    });
  });

  describe("Enhanced Lookup Result", () => {
    it("should build complete result with prerequisites", () => {
      const baseMatch = {
        skillName: "lean4-limits",
        source: "keyword" as const,
        priorityValue: 3,
      };

      const result = buildEnhancedLookupResult(baseMatch, testRules);

      expect(result.found).toBe(true);
      expect(result.skillName).toBe("lean4-limits");
      expect(result.prerequisites).toBeDefined();
      expect(result.prerequisites!.suggest).toContain("lean4");
      expect(result.prerequisites!.require).toContain("lean4-functors");
      expect(result.prerequisites!.loadOrder).toBeDefined();
    });

    it("should build complete result with co-activation", () => {
      const baseMatch = {
        skillName: "math-mode",
        source: "keyword" as const,
        priorityValue: 2,
      };

      const result = buildEnhancedLookupResult(baseMatch, testRules);

      expect(result.found).toBe(true);
      expect(result.coActivation).toBeDefined();
      expect(result.coActivation!.peers).toContain("sympy-compute");
      expect(result.coActivation!.peers).toContain("z3-solve");
      expect(result.coActivation!.mode).toBe("any");
    });

    it("should build complete result with loading mode", () => {
      const baseMatch = {
        skillName: "implement_plan",
        source: "keyword" as const,
        priorityValue: 2,
      };

      const result = buildEnhancedLookupResult(baseMatch, testRules);

      expect(result.found).toBe(true);
      expect(result.loading).toBe("eager");
    });

    it("should handle skill with no enhanced fields gracefully", () => {
      const baseMatch = {
        skillName: "lean4",
        source: "keyword" as const,
        priorityValue: 3,
      };

      const result = buildEnhancedLookupResult(baseMatch, testRules);

      expect(result.found).toBe(true);
      // Should have empty/default values
      expect(result.prerequisites?.suggest).toEqual([]);
      expect(result.prerequisites?.require).toEqual([]);
      expect(result.coActivation?.peers).toEqual([]);
      expect(result.loading).toBe("lazy");
    });
  });

  describe("Full Integration with Real skill-rules.json", () => {
    it("should work with existing skill-rules.json", async () => {
      // This test verifies backward compatibility with real config
      const { readFileSync, existsSync } = await import("fs");
      const { join } = await import("path");

      const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
      const rulesPath = join(
        projectDir,
        ".claude",
        "skills",
        "skill-rules.json",
      );

      if (!existsSync(rulesPath)) {
        // Skip if no real config exists
        expect(true).toBe(true);
        return;
      }

      const content = readFileSync(rulesPath, "utf-8");
      const realRules = JSON.parse(content) as SkillRulesConfig;

      // Should not throw for any existing skill
      const skillNames = Object.keys(realRules.skills);
      for (const skillName of skillNames.slice(0, 10)) {
        // Test first 10 skills
        expect(() => resolvePrerequisites(skillName, realRules)).not.toThrow();
        expect(() => resolveCoActivation(skillName, realRules)).not.toThrow();
        expect(() => getLoadingMode(skillName, realRules)).not.toThrow();
      }
    });
  });
});
