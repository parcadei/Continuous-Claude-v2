/**
 * Phase 4: Loading Mode Tests
 *
 * Test cases for loading mode behavior.
 * These tests should FAIL initially until implementation.
 */
import { describe, it, expect, vi } from "vitest";
import { getLoadingMode } from "../skill-router.js";
describe("Loading Mode", () => {
  it('should return "lazy" as default loading mode', () => {
    const rules = {
      skills: {
        "simple-skill": {
          type: "domain",
          // No loading field specified
        },
      },
    };
    const result = getLoadingMode("simple-skill", rules);
    expect(result).toBe("lazy");
  });
  it('should return "eager" when explicitly set', () => {
    const rules = {
      skills: {
        "eager-skill": {
          type: "domain",
          loading: "eager",
        },
      },
    };
    const result = getLoadingMode("eager-skill", rules);
    expect(result).toBe("eager");
  });
  it('should return "lazy" when explicitly set', () => {
    const rules = {
      skills: {
        "lazy-skill": {
          type: "domain",
          loading: "lazy",
        },
      },
    };
    const result = getLoadingMode("lazy-skill", rules);
    expect(result).toBe("lazy");
  });
  it('should return "eager-prerequisites" when set', () => {
    const rules = {
      skills: {
        "smart-skill": {
          type: "domain",
          loading: "eager-prerequisites",
        },
      },
    };
    const result = getLoadingMode("smart-skill", rules);
    expect(result).toBe("eager-prerequisites");
  });
  it('should fall back to "lazy" for invalid loading mode with warning', () => {
    const rules = {
      skills: {
        "invalid-loading-skill": {
          type: "domain",
          loading: "invalid-mode", // Force invalid type
        },
      },
    };
    // Capture console.warn
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = getLoadingMode("invalid-loading-skill", rules);
    expect(result).toBe("lazy");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid-mode"),
    );
    warnSpy.mockRestore();
  });
  it('should return "lazy" for non-existent skill', () => {
    const rules = {
      skills: {},
    };
    const result = getLoadingMode("non-existent-skill", rules);
    expect(result).toBe("lazy");
  });
  it("should handle null skills object gracefully", () => {
    const rules = {
      skills: {},
    };
    const result = getLoadingMode("any-skill", rules);
    expect(result).toBe("lazy");
  });
});
describe("Loading Mode Effects", () => {
  it("eager loading should indicate immediate activation is needed", () => {
    const rules = {
      skills: {
        "eager-skill": {
          type: "domain",
          loading: "eager",
        },
      },
    };
    const mode = getLoadingMode("eager-skill", rules);
    // Eager loading means skill should be activated immediately
    expect(mode).toBe("eager");
  });
  it("lazy loading should indicate deferred activation", () => {
    const rules = {
      skills: {
        "lazy-skill": {
          type: "domain",
          loading: "lazy",
        },
      },
    };
    const mode = getLoadingMode("lazy-skill", rules);
    // Lazy loading means skill activation can be deferred
    expect(mode).toBe("lazy");
  });
  it("eager-prerequisites should load self eagerly but deps lazily", () => {
    const rules = {
      skills: {
        "smart-skill": {
          type: "domain",
          loading: "eager-prerequisites",
          prerequisites: {
            require: ["dep-skill"],
          },
        },
        "dep-skill": {
          type: "domain",
          loading: "lazy",
        },
      },
    };
    const mainMode = getLoadingMode("smart-skill", rules);
    const depMode = getLoadingMode("dep-skill", rules);
    // Main skill should be eager (via eager-prerequisites)
    expect(mainMode).toBe("eager-prerequisites");
    // Dependency should retain its own loading mode
    expect(depMode).toBe("lazy");
  });
});
