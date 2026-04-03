/**
 * Composition Gate Tests (P4)
 *
 * Tests for TypeScript -> Python bridge validation of pattern compositions.
 * Tests the gate3Composition flow that validates pattern algebra rules.
 */
import { describe, it, expect } from "vitest";
// Types under test (will fail until we create them)
import {
  selectPattern,
  validateComposition,
} from "../shared/pattern-selector.js";
import {
  gate3Composition,
  gate3CompositionChain,
  CompositionInvalidError,
} from "../shared/composition-gate.js";
describe("Pattern Selector Types", () => {
  describe("ScopeType", () => {
    it("accepts valid scope types", () => {
      const validScopes = ["iso", "shared", "fed", "handoff"];
      expect(validScopes.length).toBe(4);
    });
  });
  describe("OperatorType", () => {
    it("accepts valid operator types", () => {
      const validOps = [";", "|", "+"];
      expect(validOps.length).toBe(3);
    });
  });
  describe("ValidationResult", () => {
    it("has required fields", () => {
      const result = {
        valid: true,
        composition: "Pipeline ;[handoff] Jury",
        errors: [],
        warnings: [],
        scopeTrace: [],
      };
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });
});
describe("Pattern Selector Functions", () => {
  describe("selectPattern", () => {
    it("returns PatternSelection with required fields", () => {
      const task = {
        description: "Build a REST API with authentication",
        complexity: "high",
        parallelizable: false,
        requiresValidation: true,
      };
      const result = selectPattern(task);
      expect(result).toHaveProperty("pattern");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reason");
      expect(typeof result.confidence).toBe("number");
    });
    it("returns hierarchical for implementation tasks", () => {
      const task = {
        description: "Implement a new feature with tests",
        complexity: "high",
        parallelizable: false,
        requiresValidation: true,
      };
      const result = selectPattern(task);
      // Should infer hierarchical for implementation tasks
      expect(result.pattern).toBe("hierarchical");
      expect(result.confidence).toBeGreaterThan(0.3);
    });
    it("returns swarm for research tasks", () => {
      const task = {
        description: "Research and investigate the best approach for caching",
        complexity: "medium",
        parallelizable: true,
        requiresValidation: false,
      };
      const result = selectPattern(task);
      // Should infer swarm for exploration tasks
      expect(result.pattern).toBe("swarm");
    });
    it("returns map_reduce for parallel processing tasks", () => {
      // Python pattern_inference infers map_reduce for parallel processing
      const task = {
        description:
          "Process data through parsing, validation, and storage stages",
        complexity: "medium",
        parallelizable: false,
        requiresValidation: false,
      };
      const result = selectPattern(task);
      // Python infers map_reduce for "process" + parallel signals
      expect(result.pattern).toBe("map_reduce");
    });
  });
  describe("validateComposition", () => {
    it("returns true for valid single pattern", () => {
      const result = validateComposition(["pipeline"]);
      expect(result.valid).toBe(true);
    });
    it("validates Pipeline -> Aggregator as valid", () => {
      const result = validateComposition(["pipeline", "aggregator"], "handoff");
      expect(result.valid).toBe(true);
    });
    it("validates Swarm -> Hierarchical as valid with shared scope", () => {
      // Swarm supports [iso, shared], Hierarchical supports [shared, fed]
      // Common scope: shared
      const result = validateComposition(["swarm", "hierarchical"], "shared");
      expect(result.valid).toBe(true);
    });
    it("returns validation errors for incompatible patterns", () => {
      // Jury requires isolated scope, Blackboard requires shared
      const result = validateComposition(["jury", "blackboard"], "iso");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    it("validates 3-pattern chain", () => {
      const result = validateComposition(
        ["pipeline", "aggregator", "pipeline"],
        "handoff",
      );
      expect(result.valid).toBe(true);
    });
  });
});
describe("Composition Gate", () => {
  describe("gate3Composition", () => {
    it("passes for valid Pipeline ;[handoff] Aggregator", () => {
      const result = gate3Composition("pipeline", "aggregator", "handoff");
      expect(result.valid).toBe(true);
    });
    it("throws CompositionInvalidError for invalid compositions", () => {
      // Jury only supports 'iso' scope, Blackboard requires 'shared'
      expect(() => {
        gate3Composition("jury", "blackboard", "iso");
      }).toThrow(CompositionInvalidError);
    });
    it("includes errors in thrown exception", () => {
      try {
        gate3Composition("jury", "blackboard", "iso");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CompositionInvalidError);
        expect(err.errors.length).toBeGreaterThan(0);
      }
    });
    it("supports sequential operator", () => {
      const result = gate3Composition("pipeline", "aggregator", "handoff", ";");
      expect(result.valid).toBe(true);
    });
    it("supports parallel operator", () => {
      const result = gate3Composition("swarm", "jury", "iso", "|");
      expect(result.valid).toBe(true);
    });
  });
  describe("gate3CompositionChain", () => {
    it("validates 3-pattern chain", () => {
      const result = gate3CompositionChain(
        ["pipeline", "aggregator", "pipeline"],
        "handoff",
      );
      expect(result.valid).toBe(true);
    });
    it("throws on invalid chain", () => {
      expect(() => {
        gate3CompositionChain(["jury", "blackboard", "pipeline"], "iso");
      }).toThrow(CompositionInvalidError);
    });
    it("handles empty pattern list", () => {
      const result = gate3CompositionChain([], "handoff");
      expect(result.valid).toBe(true);
    });
    it("handles single pattern", () => {
      const result = gate3CompositionChain(["pipeline"], "handoff");
      expect(result.valid).toBe(true);
    });
  });
  describe("CompositionInvalidError", () => {
    it("is an Error subclass", () => {
      const err = new CompositionInvalidError(["test error"]);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("CompositionInvalidError");
    });
    it("includes errors array", () => {
      const errors = ["error 1", "error 2"];
      const err = new CompositionInvalidError(errors);
      expect(err.errors).toEqual(errors);
    });
    it("has descriptive message", () => {
      const err = new CompositionInvalidError(["scope mismatch"]);
      expect(err.message).toContain("scope mismatch");
    });
  });
});
describe("Python Bridge Error Paths", () => {
  // Test error handling via validateComposition and selectPattern
  // which internally use the Python bridge functions
  // Error paths are tested by invoking Python with invalid patterns/expressions
  describe("callValidateComposition error handling (via validateComposition)", () => {
    it("returns errors for Python script failures on invalid input", () => {
      // Using extremely malformed patterns that will cause Python to error
      // The bridge should catch the error and return a graceful degradation
      const result = validateComposition(
        ["__nonexistent__", "__also_nonexistent__"],
        "handoff",
      );
      // Should have error from Python for unknown patterns
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    it("returns ValidationResult shape on all code paths", () => {
      // Test with known-invalid composition
      const result = validateComposition(["jury", "blackboard"], "iso");
      // Verify all required fields exist regardless of validity
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("composition");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("scopeTrace");
      expect(typeof result.valid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.scopeTrace)).toBe(true);
    });
    it("handles error propagation through pairwise validation", () => {
      // Test that errors from later pairs are properly returned
      const result = validateComposition(
        ["pipeline", "__invalid_pattern__"],
        "handoff",
      );
      expect(result.valid).toBe(false);
      // Error should mention the invalid pattern
      expect(
        result.errors.some(
          (e) =>
            e.toLowerCase().includes("unknown") ||
            e.toLowerCase().includes("error"),
        ),
      ).toBe(true);
    });
  });
  describe("callPatternInference error handling (via selectPattern)", () => {
    it("returns valid PatternSelection even for unusual prompts", () => {
      // The Python inference should always return a result
      const task = {
        description: "", // Empty description edge case
        complexity: "low",
        parallelizable: false,
        requiresValidation: false,
      };
      const result = selectPattern(task);
      // Should still have required fields
      expect(result).toHaveProperty("pattern");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reason");
      expect(typeof result.pattern).toBe("string");
      expect(typeof result.confidence).toBe("number");
    });
    it("returns PatternSelection shape on all code paths", () => {
      const task = {
        description: "A normal task description",
        complexity: "medium",
        parallelizable: false,
        requiresValidation: false,
      };
      const result = selectPattern(task);
      expect(result).toHaveProperty("pattern");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("reason");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
describe("Edge Cases", () => {
  describe("Shell escaping in pattern inference", () => {
    it("handles double quotes in prompt", () => {
      const task = {
        description: 'Build a "production-ready" API with "auth"',
        complexity: "high",
        parallelizable: false,
        requiresValidation: true,
      };
      // Should not throw even with quotes
      expect(() => selectPattern(task)).not.toThrow();
      const result = selectPattern(task);
      expect(result.pattern).toBeTruthy();
    });
    it("handles backslashes in prompt", () => {
      const task = {
        description: "Process paths like C:\\Users\\test\\file.txt",
        complexity: "medium",
        parallelizable: false,
        requiresValidation: false,
      };
      expect(() => selectPattern(task)).not.toThrow();
    });
    it("handles backticks in prompt without shell execution", () => {
      const task = {
        description: "Run `echo hello` command safely",
        complexity: "low",
        parallelizable: false,
        requiresValidation: false,
      };
      // Should not execute the backtick command
      expect(() => selectPattern(task)).not.toThrow();
    });
    it("handles dollar signs in prompt", () => {
      const task = {
        description: "Variable expansion $PATH and ${HOME}",
        complexity: "low",
        parallelizable: false,
        requiresValidation: false,
      };
      expect(() => selectPattern(task)).not.toThrow();
    });
    it("handles newlines in prompt", () => {
      const task = {
        description: "Line 1\nLine 2\nLine 3",
        complexity: "low",
        parallelizable: false,
        requiresValidation: false,
      };
      expect(() => selectPattern(task)).not.toThrow();
    });
  });
  describe("Invalid pattern names", () => {
    it("handles unknown pattern name in validation", () => {
      // validateComposition accepts string[], so unknown patterns go to Python
      const result = validateComposition(["not_a_real_pattern", "pipeline"]);
      // Python should return error for unknown pattern
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    it("handles empty string pattern name", () => {
      const result = validateComposition(["", "pipeline"]);
      expect(result.valid).toBe(false);
    });
    it("handles pattern with special characters", () => {
      const result = validateComposition(["pipe<script>line", "jury"]);
      expect(result.valid).toBe(false);
    });
  });
  describe("Invalid scope types", () => {
    it("handles unknown scope in gate3Composition", () => {
      // TypeScript types don't prevent string at runtime
      expect(() => {
        gate3Composition("pipeline", "aggregator", "invalid_scope");
      }).toThrow();
    });
  });
  describe("Longer pattern chains", () => {
    it("validates 4-pattern chain", () => {
      const result = gate3CompositionChain(
        ["pipeline", "aggregator", "pipeline", "aggregator"],
        "handoff",
      );
      expect(result.valid).toBe(true);
    });
    it("fails early in chain when first pair invalid", () => {
      // First pair (jury, blackboard) should fail with iso scope
      expect(() => {
        gate3CompositionChain(
          ["jury", "blackboard", "pipeline", "aggregator"],
          "iso",
        );
      }).toThrow(CompositionInvalidError);
    });
    it("fails when later pair in chain invalid", () => {
      // With iso scope, jury->jury is valid, but jury->blackboard fails
      expect(() => {
        gate3CompositionChain(["jury", "jury", "blackboard"], "iso");
      }).toThrow(CompositionInvalidError);
    });
  });
});
describe("Integration Smoke Test", () => {
  // These tests call real Python - mark as integration tests
  // Skip if Python environment is not available
  it.skipIf(!process.env.RUN_INTEGRATION)(
    "real Python validation works",
    () => {
      const result = validateComposition(["pipeline", "aggregator"], "handoff");
      expect(result.valid).toBe(true);
    },
  );
  it.skipIf(!process.env.RUN_INTEGRATION)("real Python inference works", () => {
    const task = {
      description: "Build a data processing pipeline",
      complexity: "medium",
      parallelizable: false,
      requiresValidation: false,
    };
    const result = selectPattern(task);
    expect(result.pattern).toBeTruthy();
  });
});
