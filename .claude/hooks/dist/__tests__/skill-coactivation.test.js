/**
 * Phase 3: Co-activation Resolution Tests
 *
 * Test cases for co-activation logic.
 * These tests should FAIL initially until implementation.
 */
import { describe, it, expect, vi } from "vitest";
import { resolveCoActivation } from "../skill-router.js";
describe("Co-activation Resolution", () => {
  it("should return empty array for skill with no coActivate field", () => {
    const rules = {
      skills: {
        "simple-skill": {
          type: "domain",
          description: "A skill without co-activation",
        },
      },
    };
    const result = resolveCoActivation("simple-skill", rules);
    expect(result.peers).toEqual([]);
    expect(result.mode).toBe("any"); // default mode
  });
  it('should return all peers as required when coActivateMode is "all"', () => {
    const rules = {
      skills: {
        "main-skill": {
          type: "domain",
          coActivate: ["peer-1", "peer-2"],
          coActivateMode: "all",
        },
        "peer-1": { type: "domain" },
        "peer-2": { type: "domain" },
      },
    };
    const result = resolveCoActivation("main-skill", rules);
    expect(result.peers).toEqual(["peer-1", "peer-2"]);
    expect(result.mode).toBe("all");
  });
  it('should return peers as suggestions when coActivateMode is "any"', () => {
    const rules = {
      skills: {
        "main-skill": {
          type: "domain",
          coActivate: ["optional-peer-1", "optional-peer-2"],
          coActivateMode: "any",
        },
        "optional-peer-1": { type: "domain" },
        "optional-peer-2": { type: "domain" },
      },
    };
    const result = resolveCoActivation("main-skill", rules);
    expect(result.peers).toEqual(["optional-peer-1", "optional-peer-2"]);
    expect(result.mode).toBe("any");
  });
  it('should default to "any" mode when coActivateMode is not specified', () => {
    const rules = {
      skills: {
        "main-skill": {
          type: "domain",
          coActivate: ["peer-1"],
          // No coActivateMode specified
        },
        "peer-1": { type: "domain" },
      },
    };
    const result = resolveCoActivation("main-skill", rules);
    expect(result.mode).toBe("any");
  });
  it("should filter out self-reference in coActivate list", () => {
    const rules = {
      skills: {
        "self-referencing": {
          type: "domain",
          coActivate: ["self-referencing", "other-peer"],
        },
        "other-peer": { type: "domain" },
      },
    };
    const result = resolveCoActivation("self-referencing", rules);
    expect(result.peers).not.toContain("self-referencing");
    expect(result.peers).toContain("other-peer");
    expect(result.peers).toHaveLength(1);
  });
  it("should warn about non-existent peer in coActivate list", () => {
    const rules = {
      skills: {
        "main-skill": {
          type: "domain",
          coActivate: ["existing-peer", "non-existent-peer"],
        },
        "existing-peer": { type: "domain" },
        // 'non-existent-peer' is missing
      },
    };
    // Capture console.warn
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = resolveCoActivation("main-skill", rules);
    // Should still include the peer even if it doesn't exist
    expect(result.peers).toContain("non-existent-peer");
    // Should have logged a warning
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("non-existent-peer"),
    );
    warnSpy.mockRestore();
  });
  it("should handle empty coActivate array", () => {
    const rules = {
      skills: {
        "main-skill": {
          type: "domain",
          coActivate: [],
        },
      },
    };
    const result = resolveCoActivation("main-skill", rules);
    expect(result.peers).toEqual([]);
  });
});
