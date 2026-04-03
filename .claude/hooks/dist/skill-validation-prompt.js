/**
 * Prompt-Based Skill Validation
 *
 * Reduces false-positive skill activations by using LLM validation to
 * distinguish between:
 * - "mentions keyword" (e.g., "commit" in "I need to commit to this approach")
 * - "actually needs this skill" (e.g., "commit these changes to git")
 *
 * This module provides:
 * 1. Heuristics to determine when LLM validation is needed
 * 2. Prompt templates for validation
 * 3. Response parsing utilities
 */
/**
 * Keywords that are commonly ambiguous (have both technical and everyday meanings)
 */
const AMBIGUOUS_KEYWORDS = new Set([
  "commit",
  "push",
  "pull",
  "merge",
  "branch",
  "checkout",
  "debug",
  "build",
  "implement",
  "plan",
  "research",
  "deploy",
  "release",
  "fix",
  "test",
  "validate",
  "review",
  "analyze",
  "document",
  "refactor",
  "optimize",
]);
/**
 * Keywords that are highly specific and unlikely to be false positives
 */
const SPECIFIC_TECHNICAL_TERMS = new Set([
  "sympy",
  "braintrust",
  "perplexity",
  "agentica",
  "firecrawl",
  "qlty",
  "repoprompt",
  "ast-grep",
  "morph",
  "ragie",
  "lean4",
  "mathlib",
  "z3",
  "shapely",
  "pint",
]);
/**
 * Technical context indicators for specific skills
 * If any of these appear in the prompt, the skill is likely genuinely needed
 */
const TECHNICAL_CONTEXT_INDICATORS = {
  commit: [
    "git",
    "changes",
    "files",
    "message",
    "push",
    "repository",
    "branch",
    "staged",
  ],
  push: ["git", "remote", "origin", "branch", "repository", "upstream"],
  pull: ["git", "remote", "origin", "branch", "merge", "rebase", "request"],
  merge: ["git", "branch", "conflict", "pull request", "pr"],
  branch: ["git", "checkout", "create", "switch", "feature"],
  checkout: ["git", "branch", "file", "commit", "HEAD"],
  debug: [
    "error",
    "bug",
    "issue",
    "logs",
    "stack trace",
    "exception",
    "crash",
    "breakpoint",
  ],
  build: [
    "npm",
    "yarn",
    "cargo",
    "make",
    "compile",
    "webpack",
    "bundle",
    "project",
  ],
  implement: [
    "code",
    "feature",
    "function",
    "class",
    "method",
    "api",
    "interface",
    "module",
  ],
  plan: [
    "implementation",
    "phase",
    "architecture",
    "design",
    "roadmap",
    "milestone",
  ],
  research: [
    "api",
    "library",
    "documentation",
    "docs",
    "best practices",
    "pattern",
    "codebase",
  ],
  deploy: [
    "server",
    "production",
    "staging",
    "kubernetes",
    "docker",
    "cloud",
    "ci/cd",
  ],
  release: ["version", "tag", "changelog", "npm", "package", "publish"],
  fix: ["bug", "error", "issue", "broken", "failing", "test", "regression"],
  test: [
    "unit",
    "integration",
    "e2e",
    "coverage",
    "spec",
    "jest",
    "pytest",
    "vitest",
  ],
  validate: ["input", "schema", "data", "form", "field", "type"],
  review: ["code", "pr", "pull request", "changes", "diff"],
  analyze: ["code", "codebase", "performance", "metrics", "logs"],
  document: ["api", "readme", "docs", "jsdoc", "docstring", "comments"],
  refactor: ["code", "function", "class", "module", "clean up", "simplify"],
  optimize: ["performance", "speed", "memory", "query", "algorithm"],
};
/**
 * Determines whether a skill match should be validated by LLM
 *
 * Returns false (no validation needed) for:
 * - Explicit slash command invocations (/commit)
 * - Strong intent pattern matches (regex)
 * - Blocking enforcement skills (critical path)
 * - Highly specific technical terms
 * - Ambiguous terms with clear technical context
 *
 * Returns true (validation needed) for:
 * - Keyword matches with ambiguous terms in non-technical context
 */
export function shouldValidateWithLLM(match) {
  // Never delay explicit invocations
  if (match.matchType === "explicit") {
    return false;
  }
  // Never delay blocking enforcement skills
  if (match.enforcement === "block") {
    return false;
  }
  // Intent pattern matches are usually strong signals
  if (match.matchType === "intent") {
    return false;
  }
  // Highly specific technical terms are unlikely to be false positives
  const termLower = match.matchedTerm.toLowerCase();
  if (SPECIFIC_TECHNICAL_TERMS.has(termLower)) {
    return false;
  }
  // For keyword matches with ambiguous terms
  if (match.matchType === "keyword" && AMBIGUOUS_KEYWORDS.has(termLower)) {
    const promptLower = match.prompt.toLowerCase();
    // Check for technical context indicators that suggest genuine usage
    // Use word boundary matching to avoid "debug" matching "bug"
    const technicalIndicators = TECHNICAL_CONTEXT_INDICATORS[termLower] || [];
    for (const indicator of technicalIndicators) {
      // Match whole word only (with word boundaries)
      const regex = new RegExp(`\\b${indicator.toLowerCase()}\\b`);
      if (regex.test(promptLower)) {
        // Technical context found - no validation needed
        return false;
      }
    }
    // No technical context found - this IS ambiguous, needs validation
    return true;
  }
  // Default: don't validate (assume match is good)
  return false;
}
/**
 * Builds a validation prompt for the LLM
 */
export function buildValidationPrompt(match) {
  const skillDesc = match.skillDescription || `The "${match.skillName}" skill`;
  return `Skill validation: Determine if the skill "${match.skillName}" is genuinely needed.

**User prompt:**
"${match.prompt}"

**Skill description:**
${skillDesc}

**Match context:**
- Matched on: "${match.matchedTerm}" (${match.matchType} match)

**Your task:**
Determine if the user is requesting functionality that the skill provides, or if they're using the keyword in a different context (e.g., "commit to an approach" vs "git commit").

Respond with ONLY a JSON object:
{"decision": "activate" | "skip", "confidence": 0.0-1.0, "reason": "brief explanation"}

Examples:
- "commit these changes" -> {"decision": "activate", "confidence": 0.95, "reason": "User wants to commit code changes"}
- "commit to this approach" -> {"decision": "skip", "confidence": 0.9, "reason": "Using commit as verb meaning to dedicate, not git commit"}`;
}
/**
 * Parses the LLM validation response
 */
export function parseValidationResponse(response) {
  // Default result for parse errors
  const defaultResult = {
    decision: "activate", // Fail-open: activate on parse error
    confidence: 0.4,
    reason: "Failed to parse validation response",
    parseError: true,
  };
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return defaultResult;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    // Validate required fields
    const decision = parsed.decision;
    if (decision !== "activate" && decision !== "skip") {
      return defaultResult;
    }
    return {
      decision,
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reason:
        typeof parsed.reason === "string"
          ? parsed.reason
          : "No reason provided",
    };
  } catch (err) {
    return defaultResult;
  }
}
/**
 * Validates skill relevance using LLM
 *
 * @param match - The skill match to validate
 * @param llmCall - Function to call the LLM (injected for testing)
 */
export async function validateSkillRelevance(match, llmCall) {
  try {
    const prompt = buildValidationPrompt(match);
    const result = await llmCall(prompt);
    return result;
  } catch (err) {
    // On error, fail-open with low confidence
    return {
      decision: "activate",
      confidence: 0.3,
      reason: `Validation error: ${err instanceof Error ? err.message : "Unknown error"}`,
      error: true,
    };
  }
}
/**
 * Filters matched skills based on validation results
 *
 * @param matches - Array of skill matches
 * @param validationResults - Map of skill name to validation result
 * @param confidenceThreshold - Minimum confidence to activate (default 0.5)
 */
export function filterValidatedSkills(
  matches,
  validationResults,
  confidenceThreshold = 0.5,
) {
  return matches.filter((match) => {
    const result = validationResults.get(match.skillName);
    // If no validation was done, keep the match
    if (!result) {
      return true;
    }
    // Skip if decision is skip
    if (result.decision === "skip") {
      return false;
    }
    // Skip if confidence is below threshold
    if (result.confidence < confidenceThreshold) {
      return false;
    }
    return true;
  });
}
