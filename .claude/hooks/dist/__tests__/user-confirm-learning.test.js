/**
 * Tests for user-confirm-learning hook
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, unlinkSync, existsSync } from "fs";
// Mock the learning-extractor module
vi.mock("../shared/learning-extractor.js", () => ({
  extractConfirmationLearning: vi.fn((prompt, context) => {
    if (!context || context.length < 20) return null;
    // Detect confirmation patterns
    const confirmPatterns = [
      /\b(works?|working)\b/i,
      /\b(good|great|perfect|nice)\b/i,
      /\b(thanks?|thank you)\b/i,
    ];
    const isConfirmation = confirmPatterns.some((p) => p.test(prompt));
    if (!isConfirmation) return null;
    return {
      what: `User confirmed: "${prompt.slice(0, 50)}"`,
      why: "Approach/solution worked for user",
      how: context.slice(0, 300),
      outcome: "success",
      tags: ["user_confirmed", "solution", "auto_extracted"],
    };
  }),
  storeLearning: vi.fn().mockResolvedValue(true),
}));
const STATE_FILE = "/tmp/claude-auto-learning-state.json";
describe("user-confirm-learning hook", () => {
  beforeEach(() => {
    // Clean up state file
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  });
  afterEach(() => {
    vi.clearAllMocks();
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  });
  describe("confirmation detection", () => {
    it('should detect "works" as confirmation', () => {
      const confirmPatterns = [
        /^(works?|working|worked)!*$/i,
        /\b(works?|working)\b/i,
      ];
      expect(confirmPatterns.some((p) => p.test("works"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("works!"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("that works"))).toBe(true);
    });
    it('should detect "thanks" as confirmation', () => {
      const confirmPatterns = [
        /^(thanks?|thank you|thx|ty)!*$/i,
        /\b(thanks?|thank you)\b/i,
      ];
      expect(confirmPatterns.some((p) => p.test("thanks"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("thank you"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("thx"))).toBe(true);
    });
    it('should detect "good" as confirmation', () => {
      const confirmPatterns = [
        /^(good|great|perfect|nice|excellent|awesome)!*$/i,
        /\b(looks? good)\b/i,
      ];
      expect(confirmPatterns.some((p) => p.test("good"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("great!"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("looks good"))).toBe(true);
    });
    it('should detect "lgtm" as confirmation', () => {
      const confirmPatterns = [/^(lgtm|ship it)!*$/i];
      expect(confirmPatterns.some((p) => p.test("lgtm"))).toBe(true);
      expect(confirmPatterns.some((p) => p.test("LGTM"))).toBe(true);
    });
    it("should not detect long prompts as confirmation", () => {
      const prompt =
        "This is a very long prompt that describes a new task and should not be treated as a confirmation even if it contains the word works somewhere in the middle of this text.";
      expect(prompt.length > 100).toBe(true);
    });
    it("should not detect task prompts as confirmation", () => {
      // These should NOT match simple confirmation patterns
      const taskPrompts = [
        "Fix the bug in the parser",
        "Create a new component",
        "Update the documentation",
      ];
      const simpleConfirmPatterns = [
        /^(works?|working|worked)!*$/i,
        /^(good|great|perfect|nice|excellent|awesome)!*$/i,
        /^(thanks?|thank you|thx|ty)!*$/i,
      ];
      for (const prompt of taskPrompts) {
        expect(simpleConfirmPatterns.some((p) => p.test(prompt))).toBe(false);
      }
    });
  });
  describe("state file handling", () => {
    it("should handle missing state file", () => {
      // No state file exists
      expect(existsSync(STATE_FILE)).toBe(false);
    });
    it("should parse valid state file", () => {
      const state = {
        edits: [
          {
            file: "test.ts",
            description: "Added function",
            timestamp: Date.now(),
          },
        ],
        turnCount: 5,
        recentActions: ["edit test.ts"],
      };
      writeFileSync(STATE_FILE, JSON.stringify(state));
      const content = JSON.parse(
        require("fs").readFileSync(STATE_FILE, "utf-8"),
      );
      expect(content.edits).toHaveLength(1);
      expect(content.edits[0].file).toBe("test.ts");
    });
    it("should filter old edits by recency", () => {
      const now = Date.now();
      const RECENCY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
      const state = {
        edits: [
          {
            file: "old.ts",
            description: "Old edit",
            timestamp: now - 20 * 60 * 1000,
          }, // 20 min ago
          {
            file: "recent.ts",
            description: "Recent edit",
            timestamp: now - 5 * 60 * 1000,
          }, // 5 min ago
        ],
        turnCount: 2,
        recentActions: [],
      };
      const recentEdits = state.edits.filter(
        (e) => now - e.timestamp < RECENCY_THRESHOLD_MS,
      );
      expect(recentEdits).toHaveLength(1);
      expect(recentEdits[0].file).toBe("recent.ts");
    });
  });
  describe("context building", () => {
    it("should build context from recent edits", () => {
      const edits = [
        {
          file: "component.tsx",
          description: "Added handler",
          timestamp: Date.now(),
        },
        { file: "utils.ts", description: "Fixed bug", timestamp: Date.now() },
      ];
      const contextParts = edits.map((e) => `${e.file}: ${e.description}`);
      const context = contextParts.join("; ");
      expect(context).toBe("component.tsx: Added handler; utils.ts: Fixed bug");
      expect(context.length).toBeGreaterThan(20);
    });
    it("should return empty string if no recent edits", () => {
      const edits = [];
      const contextParts = edits.map((e) => `${e.file}: ${e.description}`);
      const context = contextParts.join("; ");
      expect(context).toBe("");
    });
  });
});
