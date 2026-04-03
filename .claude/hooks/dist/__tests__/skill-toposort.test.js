/**
 * Phase 5: Topological Sort Tests
 *
 * Test cases for dependency ordering using Kahn's algorithm.
 * These tests should FAIL initially until implementation.
 */
import { describe, it, expect } from "vitest";
import { CircularDependencyError } from "../shared/skill-router-types.js";
import { topologicalSort } from "../skill-router.js";
describe("Topological Sort", () => {
  it("should return empty array for empty graph", () => {
    const rules = {
      skills: {},
    };
    // For a non-existent skill, should return just that skill
    const result = topologicalSort("non-existent", rules);
    expect(result).toEqual(["non-existent"]);
  });
  it("should return single-element array for skill with no dependencies", () => {
    const rules = {
      skills: {
        "single-skill": {
          type: "domain",
        },
      },
    };
    const result = topologicalSort("single-skill", rules);
    expect(result).toEqual(["single-skill"]);
  });
  it("should return correct order for linear chain A -> B -> C", () => {
    const rules = {
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
    const result = topologicalSort("skill-c", rules);
    // Dependencies first, then dependents
    expect(result).toEqual(["skill-a", "skill-b", "skill-c"]);
  });
  it("should handle diamond dependency pattern", () => {
    // A -> B, A -> C, B -> D, C -> D
    const rules = {
      skills: {
        "skill-a": {
          type: "domain",
          prerequisites: { require: ["skill-b", "skill-c"] },
        },
        "skill-b": {
          type: "domain",
          prerequisites: { require: ["skill-d"] },
        },
        "skill-c": {
          type: "domain",
          prerequisites: { require: ["skill-d"] },
        },
        "skill-d": { type: "domain" },
      },
    };
    const result = topologicalSort("skill-a", rules);
    // D must come first, then B and C (in some order), then A
    expect(result[0]).toBe("skill-d");
    expect(result[result.length - 1]).toBe("skill-a");
    expect(result).toContain("skill-b");
    expect(result).toContain("skill-c");
    // B and C must come after D but before A
    expect(result.indexOf("skill-b")).toBeGreaterThan(0);
    expect(result.indexOf("skill-c")).toBeGreaterThan(0);
    expect(result.indexOf("skill-b")).toBeLessThan(result.length - 1);
    expect(result.indexOf("skill-c")).toBeLessThan(result.length - 1);
  });
  it("should handle multiple disconnected components", () => {
    // Skill A depends on B, but C is independent
    const rules = {
      skills: {
        "skill-a": {
          type: "domain",
          prerequisites: { require: ["skill-b", "skill-c"] },
        },
        "skill-b": { type: "domain" },
        "skill-c": { type: "domain" }, // Independent root
      },
    };
    const result = topologicalSort("skill-a", rules);
    // B and C should come before A
    expect(result.indexOf("skill-b")).toBeLessThan(result.indexOf("skill-a"));
    expect(result.indexOf("skill-c")).toBeLessThan(result.indexOf("skill-a"));
  });
  it("should throw CircularDependencyError for cycle in graph", () => {
    const rules = {
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
    expect(() => topologicalSort("skill-a", rules)).toThrow(
      CircularDependencyError,
    );
  });
  it("should include both suggest and require dependencies in order", () => {
    const rules = {
      skills: {
        "main-skill": {
          type: "domain",
          prerequisites: {
            suggest: ["suggested-dep"],
            require: ["required-dep"],
          },
        },
        "suggested-dep": { type: "domain" },
        "required-dep": { type: "domain" },
      },
    };
    const result = topologicalSort("main-skill", rules);
    // Both deps should come before main skill
    expect(result.indexOf("suggested-dep")).toBeLessThan(
      result.indexOf("main-skill"),
    );
    expect(result.indexOf("required-dep")).toBeLessThan(
      result.indexOf("main-skill"),
    );
  });
  it("should handle deeply nested dependencies", () => {
    const rules = {
      skills: {
        "level-5": {
          type: "domain",
          prerequisites: { require: ["level-4"] },
        },
        "level-4": {
          type: "domain",
          prerequisites: { require: ["level-3"] },
        },
        "level-3": {
          type: "domain",
          prerequisites: { require: ["level-2"] },
        },
        "level-2": {
          type: "domain",
          prerequisites: { require: ["level-1"] },
        },
        "level-1": { type: "domain" },
      },
    };
    const result = topologicalSort("level-5", rules);
    // Should be in order from level-1 to level-5
    expect(result).toEqual([
      "level-1",
      "level-2",
      "level-3",
      "level-4",
      "level-5",
    ]);
  });
});
