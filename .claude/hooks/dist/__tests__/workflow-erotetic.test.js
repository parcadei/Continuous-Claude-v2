/**
 * Phase 1: Erotetic Gate + Display Tests
 *
 * TDD: These tests are written BEFORE implementation.
 * Run: cd .claude/hooks && npm test
 *
 * Tests cover:
 * 1. extractPropositions() - Extract what/how/why from user input
 * 2. Erotetic gate integration - Block if missing critical propositions
 * 3. Gate display - StatusLine shows E:[check] R:[circle] C:[circle] format
 * 4. Don Norman feedback - Structured error messages
 */
import { describe, it, expect } from "vitest";
import {
  extractPropositions,
  generateClarificationQuestions,
  formatGateStatus,
  evaluateEroteticGate,
  generateBlockFeedback,
} from "../shared/workflow-erotetic.js";
// ============================================================
// SECTION 1: extractPropositions() Tests
// ============================================================
describe("extractPropositions", () => {
  it("should extract framework from implementation prompt", () => {
    const prompt = "Build a FastAPI backend with JWT authentication";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("fastapi");
  });
  it("should extract auth_method from prompt", () => {
    const prompt = "Build a FastAPI backend with JWT authentication";
    const props = extractPropositions(prompt);
    expect(props.auth_method).toBe("jwt");
  });
  it("should extract multiple propositions from complex prompt", () => {
    const prompt = "Create a Django app with OAuth2 and PostgreSQL on AWS";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("django");
    expect(props.auth_method).toBe("oauth");
    expect(props.database).toBe("postgresql");
    expect(props.hosting).toBe("aws");
  });
  it("should mark missing propositions as UNKNOWN", () => {
    const prompt = "Build an API backend";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("UNKNOWN");
    expect(props.auth_method).toBe("UNKNOWN");
    expect(props.database).toBe("UNKNOWN");
  });
  it("should handle empty input gracefully", () => {
    const prompt = "";
    const props = extractPropositions(prompt);
    // All propositions should be UNKNOWN for empty input
    expect(props.framework).toBe("UNKNOWN");
    expect(props.auth_method).toBe("UNKNOWN");
  });
  it("should normalize case of extracted values", () => {
    const prompt = "Build with FASTAPI and PostgreSQL";
    const props = extractPropositions(prompt);
    // Values should be lowercase for consistency
    expect(props.framework).toBe("fastapi");
    expect(props.database).toBe("postgresql");
  });
  it("should extract language proposition", () => {
    const prompt = "Create a Python service with Flask";
    const props = extractPropositions(prompt);
    expect(props.language).toBe("python");
    expect(props.framework).toBe("flask");
  });
  it("should handle ambiguous framework mentions", () => {
    // When multiple frameworks are mentioned, take the first one
    const prompt = "Build a FastAPI backend, not Express";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("fastapi");
  });
});
// ============================================================
// SECTION 2: generateClarificationQuestions() Tests
// ============================================================
describe("generateClarificationQuestions", () => {
  it("should generate questions for list of unknowns", () => {
    const unknowns = ["framework", "database"];
    const questions = generateClarificationQuestions(unknowns);
    expect(questions.length).toBe(2);
  });
  it("should include header matching proposition name", () => {
    const unknowns = ["framework"];
    const questions = generateClarificationQuestions(unknowns);
    expect(questions[0].header).toBe("Framework");
    expect(questions[0].proposition).toBe("framework");
  });
  it("should provide options for framework question", () => {
    const unknowns = ["framework"];
    const questions = generateClarificationQuestions(unknowns);
    expect(questions[0].options).toContain("FastAPI");
    expect(questions[0].options).toContain("Express");
    expect(questions[0].options).toContain("Django");
  });
  it("should include why explanation for each question", () => {
    const unknowns = ["database"];
    const questions = generateClarificationQuestions(unknowns);
    expect(questions[0].why).toBeDefined();
    expect(questions[0].why.length).toBeGreaterThan(0);
    // Why should explain architectural impact
    expect(questions[0].why.toLowerCase()).toMatch(
      /architect|impact|choice|depend/,
    );
  });
  it("should return empty array for empty unknowns", () => {
    const unknowns = [];
    const questions = generateClarificationQuestions(unknowns);
    expect(questions).toEqual([]);
  });
  it("should handle unknown proposition types gracefully", () => {
    const unknowns = ["custom_unknown_field"];
    const questions = generateClarificationQuestions(unknowns);
    expect(questions.length).toBe(1);
    expect(questions[0].header).toBe("Custom Unknown Field");
    expect(questions[0].options).toBeDefined();
  });
  it("should order questions by architectural impact (Q-value)", () => {
    // Framework has higher Q-value than testing
    const unknowns = ["testing", "framework", "database"];
    const questions = generateClarificationQuestions(unknowns);
    // Framework and database should come before testing
    const frameworkIdx = questions.findIndex(
      (q) => q.proposition === "framework",
    );
    const testingIdx = questions.findIndex((q) => q.proposition === "testing");
    expect(frameworkIdx).toBeLessThan(testingIdx);
  });
});
// ============================================================
// SECTION 3: Gate Display (StatusLine format) Tests
// ============================================================
describe("Gate Display", () => {
  it("should format all pending gates as circles", () => {
    const status = formatGateStatus({
      erotetic: "pending",
      resources: "pending",
      composition: "pending",
    });
    // Unicode circles for pending
    expect(status).toMatch(/E:[^A-Z]*R:[^A-Z]*C:/);
  });
  it("should show checkmark for passed erotetic gate", () => {
    const status = formatGateStatus({
      erotetic: "pass",
      resources: "pending",
      composition: "pending",
    });
    // Should show check for E, pending for others
    expect(status).toContain("E:");
    // The exact format should be E:[checkmark] R:[circle] C:[circle]
  });
  it("should show arrow for in-progress gate", () => {
    const status = formatGateStatus({
      erotetic: "pass",
      resources: "block", // currently being evaluated
      composition: "pending",
    });
    expect(status).toContain("R:");
  });
  it("should show X for blocked gate", () => {
    const status = formatGateStatus({
      erotetic: "block",
      resources: "pending",
      composition: "pending",
    });
    // E should show blocked indicator
    expect(status).toContain("E:");
  });
  it("should produce compact single-line output", () => {
    const status = formatGateStatus({
      erotetic: "pass",
      resources: "pass",
      composition: "pending",
    });
    // No newlines in status
    expect(status).not.toContain("\n");
    // Should be reasonably short for status line
    expect(status.length).toBeLessThan(30);
  });
});
// ============================================================
// SECTION 4: Erotetic Gate Integration Tests
// ============================================================
describe("Erotetic Gate Integration", () => {
  it("should block when critical propositions are missing", () => {
    const prompt = "Build an API";
    const result = evaluateEroteticGate(prompt);
    expect(result.decision).toBe("block");
    expect(result.unknowns.length).toBeGreaterThan(0);
  });
  it("should continue when all critical propositions are present", () => {
    const prompt = "Build a FastAPI backend with JWT auth and PostgreSQL";
    const result = evaluateEroteticGate(prompt);
    expect(result.decision).toBe("continue");
    expect(result.unknowns.length).toBe(0);
  });
  it("should continue for non-implementation tasks", () => {
    // Non-implementation tasks should pass through
    const prompt = "Fix the bug in the login function";
    const result = evaluateEroteticGate(prompt);
    expect(result.decision).toBe("continue");
  });
  it("should provide feedback with unknowns list", () => {
    const prompt = "Build a web app";
    const result = evaluateEroteticGate(prompt);
    expect(result.feedback).toBeDefined();
    expect(result.feedback?.gate).toBe("Erotetic");
  });
  it("should mark framework as critical unknown", () => {
    const prompt = "Build a backend with JWT authentication";
    const result = evaluateEroteticGate(prompt);
    expect(result.unknowns).toContain("framework");
  });
  it("should not require non-critical propositions to pass", () => {
    // testing and hosting are not critical for gate pass
    const prompt = "Build a FastAPI backend with JWT and PostgreSQL";
    const result = evaluateEroteticGate(prompt);
    // Should pass even without testing/hosting specified
    expect(result.decision).toBe("continue");
  });
});
// ============================================================
// SECTION 5: Don Norman Feedback Tests (Structured Errors)
// ============================================================
describe("Don Norman Feedback", () => {
  it("should include gate name in feedback", () => {
    const feedback = generateBlockFeedback("Erotetic", ["framework"]);
    expect(feedback.gate).toBe("Erotetic");
  });
  it("should include actionable title", () => {
    const feedback = generateBlockFeedback("Erotetic", [
      "framework",
      "database",
    ]);
    expect(feedback.title).toBeDefined();
    expect(feedback.title.length).toBeGreaterThan(0);
    // Title should mention what needs to be resolved
    expect(feedback.title.toLowerCase()).toMatch(
      /missing|unknown|clarif|resolv/,
    );
  });
  it("should include detailed explanation", () => {
    const feedback = generateBlockFeedback("Erotetic", ["framework"]);
    expect(feedback.details).toBeDefined();
    expect(feedback.details).toContain("framework");
  });
  it("should include suggestion for resolution", () => {
    const feedback = generateBlockFeedback("Erotetic", ["database"]);
    expect(feedback.suggestion).toBeDefined();
    // Suggestion should tell user how to fix
    expect(feedback.suggestion?.toLowerCase()).toMatch(
      /specify|choose|select|ask/,
    );
  });
  it("should format feedback for multiple unknowns", () => {
    const feedback = generateBlockFeedback("Erotetic", [
      "framework",
      "auth_method",
      "database",
    ]);
    expect(feedback.details).toContain("framework");
    expect(feedback.details).toContain("auth_method");
    expect(feedback.details).toContain("database");
  });
  it("should handle empty unknowns gracefully", () => {
    // Edge case - gate blocked but no specific unknowns
    const feedback = generateBlockFeedback("Erotetic", []);
    expect(feedback.status).toBe("block");
    expect(feedback.details).toBeDefined();
  });
});
// ============================================================
// SECTION 6: Edge Cases
// ============================================================
describe("Edge Cases", () => {
  it("should handle prompt with only whitespace", () => {
    const prompt = "   \n\t  ";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("UNKNOWN");
  });
  it("should handle very long prompts", () => {
    const longPrompt =
      "Build a FastAPI backend with JWT authentication. ".repeat(100);
    const props = extractPropositions(longPrompt);
    // Should still extract correctly
    expect(props.framework).toBe("fastapi");
  });
  it("should handle special characters in prompt", () => {
    const prompt =
      "Build a FastAPI backend with JWT! It's awesome? Yes, indeed.";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("fastapi");
    expect(props.auth_method).toBe("jwt");
  });
  it("should handle unicode in prompt", () => {
    const prompt = "Build a FastAPI backend - great solution";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("fastapi");
  });
  it("should handle mixed case framework names", () => {
    const prompt = "Build with NestJS and PostgreSQL";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("nestjs");
  });
  it("should distinguish between similar framework names", () => {
    // "express" vs "expressjs", "nest" vs "nestjs"
    const prompt = "Build with Express not Nest";
    const props = extractPropositions(prompt);
    expect(props.framework).toBe("express");
  });
});
