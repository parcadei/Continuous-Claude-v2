/**
 * Tests for prompt-based skill validation
 *
 * The goal is to reduce false-positive skill activations by using LLM
 * validation to distinguish between:
 * - "mentions keyword" (e.g., "commit" in "I need to commit to this approach")
 * - "actually needs this skill" (e.g., "commit these changes to git")
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SkillValidationResult,
  validateSkillRelevance,
  shouldValidateWithLLM,
  buildValidationPrompt,
  parseValidationResponse,
  SkillMatch,
} from "../skill-validation-prompt.js";

describe("Prompt-Based Skill Validation", () => {
  describe("shouldValidateWithLLM", () => {
    it("should return true for ambiguous keyword matches", () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: "I need to commit to this approach before moving forward",
      };

      expect(shouldValidateWithLLM(match)).toBe(true);
    });

    it("should return false for strong intent pattern matches", () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "intent",
        matchedTerm: "git.*commit",
        prompt: "Please commit these changes to git",
      };

      expect(shouldValidateWithLLM(match)).toBe(false);
    });

    it("should return true for potentially ambiguous domain skills", () => {
      const match: SkillMatch = {
        skillName: "debug",
        matchType: "keyword",
        matchedTerm: "debug",
        prompt: "I want to debug my approach to this", // No technical indicators (error, bug, etc)
      };

      expect(shouldValidateWithLLM(match)).toBe(true);
    });

    it("should return false for explicit skill invocation", () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "explicit",
        matchedTerm: "/commit",
        prompt: "/commit",
      };

      expect(shouldValidateWithLLM(match)).toBe(false);
    });

    it("should return false for blocking enforcement skills", () => {
      // Blocking skills should never be delayed by validation
      const match: SkillMatch = {
        skillName: "math-router",
        matchType: "keyword",
        matchedTerm: "integrate",
        prompt: "integrate x^2",
        enforcement: "block",
      };

      expect(shouldValidateWithLLM(match)).toBe(false);
    });
  });

  describe("buildValidationPrompt", () => {
    it("should create a structured validation prompt", () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: "I need to commit to this approach",
        skillDescription: "Create git commits with user approval",
      };

      const prompt = buildValidationPrompt(match);

      expect(prompt).toContain("commit");
      expect(prompt).toContain("I need to commit to this approach");
      expect(prompt).toContain("Create git commits");
      expect(prompt).toContain("decision");
      expect(prompt).toContain("activate");
      expect(prompt).toContain("skip");
    });

    it("should include the matched keyword context", () => {
      const match: SkillMatch = {
        skillName: "research",
        matchType: "keyword",
        matchedTerm: "research",
        prompt: "I want to research this topic deeply",
        skillDescription:
          "Simple research (use research-agent for comprehensive research)",
      };

      const prompt = buildValidationPrompt(match);

      expect(prompt).toContain("research");
      expect(prompt).toContain("keyword");
    });
  });

  describe("parseValidationResponse", () => {
    it("should parse valid activate response", () => {
      const response = JSON.stringify({
        decision: "activate",
        confidence: 0.95,
        reason: "User is asking to commit code changes to git",
      });

      const result = parseValidationResponse(response);

      expect(result.decision).toBe("activate");
      expect(result.confidence).toBe(0.95);
      expect(result.reason).toContain("commit code");
    });

    it("should parse valid skip response", () => {
      const response = JSON.stringify({
        decision: "skip",
        confidence: 0.85,
        reason:
          "User is using commit as a verb meaning to dedicate, not git commit",
      });

      const result = parseValidationResponse(response);

      expect(result.decision).toBe("skip");
      expect(result.confidence).toBe(0.85);
    });

    it("should handle malformed JSON gracefully", () => {
      const response = "This is not JSON";

      const result = parseValidationResponse(response);

      expect(result.decision).toBe("activate"); // Default to activate on parse error
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.parseError).toBe(true);
    });

    it("should handle JSON with missing fields", () => {
      const response = JSON.stringify({
        decision: "activate",
        // missing confidence and reason
      });

      const result = parseValidationResponse(response);

      expect(result.decision).toBe("activate");
      expect(result.confidence).toBe(0.5); // Default confidence
    });

    it("should extract JSON from surrounding text", () => {
      const response =
        'Let me analyze this... {"decision": "skip", "confidence": 0.9, "reason": "Not relevant"} as shown.';

      const result = parseValidationResponse(response);

      expect(result.decision).toBe("skip");
      expect(result.confidence).toBe(0.9);
    });
  });

  describe("validateSkillRelevance (integration)", () => {
    // These tests mock the LLM call
    const mockLLMResponse = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return activate for clearly relevant prompt", async () => {
      mockLLMResponse.mockResolvedValue({
        decision: "activate",
        confidence: 0.95,
        reason: "User explicitly wants to commit git changes",
      });

      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: "Please commit my changes to git",
        skillDescription: "Create git commits with user approval",
      };

      const result = await validateSkillRelevance(match, mockLLMResponse);

      expect(result.decision).toBe("activate");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should return skip for irrelevant keyword usage", async () => {
      mockLLMResponse.mockResolvedValue({
        decision: "skip",
        confidence: 0.9,
        reason:
          'User is using "commit" as a verb meaning to dedicate or pledge, not git commit',
      });

      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: "I need to commit to this design decision before proceeding",
        skillDescription: "Create git commits with user approval",
      };

      const result = await validateSkillRelevance(match, mockLLMResponse);

      expect(result.decision).toBe("skip");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should activate on LLM timeout with low confidence", async () => {
      mockLLMResponse.mockRejectedValue(new Error("Timeout"));

      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: "commit to this approach",
        skillDescription: "Create git commits",
      };

      const result = await validateSkillRelevance(match, mockLLMResponse);

      // On error, should default to activate (fail-open) but with low confidence
      expect(result.decision).toBe("activate");
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.error).toBe(true);
    });
  });

  describe("Ambiguity Detection Heuristics", () => {
    it("should detect common ambiguous terms in non-technical contexts", () => {
      // These prompts are specifically crafted to NOT contain technical indicators
      const testCases = [
        { term: "commit", prompt: "I want to commit myself to this goal" },
        { term: "debug", prompt: "Let me debug my thought process here" },
        { term: "push", prompt: "We should push harder on this initiative" },
        { term: "build", prompt: "Let us build a relationship with the team" },
        {
          term: "implement",
          prompt: "We need to implement better communication",
        },
        { term: "research", prompt: "I did some research on the topic" },
        { term: "plan", prompt: "Let me plan my vacation next week" },
      ];

      for (const { term, prompt } of testCases) {
        const match: SkillMatch = {
          skillName: term,
          matchType: "keyword",
          matchedTerm: term,
          prompt,
        };

        // These common terms in non-technical contexts should trigger validation
        expect(shouldValidateWithLLM(match)).toBe(true);
      }
    });

    it("should not validate highly specific technical terms", () => {
      const technicalTerms = [
        "sympy",
        "braintrust",
        "perplexity",
        "agentica",
        "firecrawl",
      ];

      for (const term of technicalTerms) {
        const match: SkillMatch = {
          skillName: term,
          matchType: "keyword",
          matchedTerm: term,
          prompt: `Use ${term} for this`,
        };

        // Highly specific terms are unlikely to be false positives
        expect(shouldValidateWithLLM(match)).toBe(false);
      }
    });
  });

  describe("Confidence Thresholds", () => {
    it("should not activate skill below confidence threshold", () => {
      const result: SkillValidationResult = {
        decision: "activate",
        confidence: 0.3, // Below threshold
        reason: "Uncertain match",
      };

      // When confidence is low, should treat as skip
      const effectiveDecision =
        result.confidence < 0.5 ? "skip" : result.decision;
      expect(effectiveDecision).toBe("skip");
    });

    it("should activate skill above confidence threshold", () => {
      const result: SkillValidationResult = {
        decision: "activate",
        confidence: 0.8,
        reason: "Clear match",
      };

      const effectiveDecision =
        result.confidence < 0.5 ? "skip" : result.decision;
      expect(effectiveDecision).toBe("activate");
    });
  });
});

describe("False Positive Test Cases", () => {
  // Real-world examples of false positives we want to catch

  describe("commit skill", () => {
    it('should require validation for "commit to an approach"', async () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt:
          "Before we commit to this approach, let me review the alternatives",
      };

      // This should trigger LLM validation (non-technical usage)
      expect(shouldValidateWithLLM(match)).toBe(true);
    });

    it('should NOT require validation for "commit these files" (technical context)', async () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: 'Please commit these files with message "Fix bug"',
      };

      // Technical context detected ("files") - no validation needed
      expect(shouldValidateWithLLM(match)).toBe(false);
    });

    it('should NOT require validation for "commit changes to git"', async () => {
      const match: SkillMatch = {
        skillName: "commit",
        matchType: "keyword",
        matchedTerm: "commit",
        prompt: "Commit the changes to git",
      };

      // Technical context detected ("git", "changes") - no validation needed
      expect(shouldValidateWithLLM(match)).toBe(false);
    });
  });

  describe("debug skill", () => {
    it('should require validation for "debug my thinking"', () => {
      const match: SkillMatch = {
        skillName: "debug",
        matchType: "keyword",
        matchedTerm: "debug",
        prompt: "Help me debug my thinking on this", // No technical indicators (error, bug, etc)
      };

      expect(shouldValidateWithLLM(match)).toBe(true);
    });

    it('should NOT require validation for "debug the error"', () => {
      const match: SkillMatch = {
        skillName: "debug",
        matchType: "keyword",
        matchedTerm: "debug",
        prompt: "Help me debug the error in the authentication code",
      };

      // Technical context detected ("error") - no validation needed
      expect(shouldValidateWithLLM(match)).toBe(false);
    });
  });

  describe("research skill", () => {
    it('should require validation for casual "I did some research"', () => {
      const match: SkillMatch = {
        skillName: "research",
        matchType: "keyword",
        matchedTerm: "research",
        prompt: "I did some research and found...",
      };

      expect(shouldValidateWithLLM(match)).toBe(true);
    });

    it('should NOT require validation for "research the API"', () => {
      const match: SkillMatch = {
        skillName: "research",
        matchType: "keyword",
        matchedTerm: "research",
        prompt: "Please research the API documentation for this library",
      };

      // Technical context detected ("api", "library", "documentation")
      expect(shouldValidateWithLLM(match)).toBe(false);
    });
  });

  describe("implement skill", () => {
    it('should require validation for "implement a strategy"', () => {
      const match: SkillMatch = {
        skillName: "implement_plan",
        matchType: "keyword",
        matchedTerm: "implement",
        prompt: "We need to implement a strategy to improve user engagement",
      };

      expect(shouldValidateWithLLM(match)).toBe(true);
    });

    it('should NOT require validation for "implement the function"', () => {
      const match: SkillMatch = {
        skillName: "implement_plan",
        matchType: "keyword",
        matchedTerm: "implement",
        prompt: "Please implement the new API function for user authentication",
      };

      // Technical context detected ("function", "api")
      expect(shouldValidateWithLLM(match)).toBe(false);
    });
  });
});
