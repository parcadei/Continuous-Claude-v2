// src/skill-validation-prompt.ts
var AMBIGUOUS_KEYWORDS = /* @__PURE__ */ new Set([
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
var SPECIFIC_TECHNICAL_TERMS = /* @__PURE__ */ new Set([
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
var TECHNICAL_CONTEXT_INDICATORS = {
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
function shouldValidateWithLLM(match) {
  if (match.matchType === "explicit") {
    return false;
  }
  if (match.enforcement === "block") {
    return false;
  }
  if (match.matchType === "intent") {
    return false;
  }
  const termLower = match.matchedTerm.toLowerCase();
  if (SPECIFIC_TECHNICAL_TERMS.has(termLower)) {
    return false;
  }
  if (match.matchType === "keyword" && AMBIGUOUS_KEYWORDS.has(termLower)) {
    const promptLower = match.prompt.toLowerCase();
    const technicalIndicators = TECHNICAL_CONTEXT_INDICATORS[termLower] || [];
    for (const indicator of technicalIndicators) {
      const regex = new RegExp(`\\b${indicator.toLowerCase()}\\b`);
      if (regex.test(promptLower)) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function buildValidationPrompt(match) {
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
function parseValidationResponse(response) {
  const defaultResult = {
    decision: "activate",
    // Fail-open: activate on parse error
    confidence: 0.4,
    reason: "Failed to parse validation response",
    parseError: true,
  };
  try {
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return defaultResult;
    }
    const parsed = JSON.parse(jsonMatch[0]);
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
async function validateSkillRelevance(match, llmCall) {
  try {
    const prompt = buildValidationPrompt(match);
    const result = await llmCall(prompt);
    return result;
  } catch (err) {
    return {
      decision: "activate",
      confidence: 0.3,
      reason: `Validation error: ${err instanceof Error ? err.message : "Unknown error"}`,
      error: true,
    };
  }
}
function filterValidatedSkills(
  matches,
  validationResults,
  confidenceThreshold = 0.5,
) {
  return matches.filter((match) => {
    const result = validationResults.get(match.skillName);
    if (!result) {
      return true;
    }
    if (result.decision === "skip") {
      return false;
    }
    if (result.confidence < confidenceThreshold) {
      return false;
    }
    return true;
  });
}
export {
  buildValidationPrompt,
  filterValidatedSkills,
  parseValidationResponse,
  shouldValidateWithLLM,
  validateSkillRelevance,
};
