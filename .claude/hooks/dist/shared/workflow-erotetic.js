/**
 * Workflow Erotetic Gate - Proposition Extraction and Gate Evaluation
 *
 * This module provides:
 * 1. extractPropositions() - Extract framework, auth_method, database etc from input
 * 2. generateClarificationQuestions() - Generate Q-value ordered questions
 * 3. formatGateStatus() - Format as E:X R:O C:->
 * 4. evaluateEroteticGate() - Return continue/block decision
 * 5. generateBlockFeedback() - Don Norman error messages
 */
// ============================================================
// Constants
// ============================================================
// Pattern to detect implementation tasks
const IMPL_PATTERNS =
  /\b(build|implement|create|add|develop|design|set up|write)\b/i;
const NON_IMPL_PATTERNS =
  /\b(fix|run|show|explain|list|search|rename|delete|update)\b/i;
// Domain-specific proposition extractors
const PROPOSITION_PATTERNS = {
  framework:
    /\b(fastapi|express|hono|gin|django|flask|rails|spring|nest\.?js)\b/i,
  auth_method:
    /\b(jwt|oauth\d?|session|api[- ]?key|basic auth|bearer|saml|oidc)\b/i,
  database:
    /\b(postgres|postgresql|mysql|sqlite|mongodb|redis|dynamodb|firestore)\b/i,
  hosting: /\b(vercel|aws|gcp|azure|heroku|railway|fly\.io|cloudflare)\b/i,
  language: /\b(python|typescript|javascript|go|rust|java|ruby|php)\b/i,
  testing: /\b(pytest|jest|vitest|mocha|junit|rspec)\b/i,
};
// Critical propositions - gate blocks if these are missing
const CRITICAL_PROPOSITIONS = ["framework", "auth_method", "database"];
// Q-value ordering (higher = more architectural impact, asked first)
const Q_VALUE_ORDER = {
  framework: 100,
  database: 90,
  auth_method: 80,
  hosting: 60,
  language: 50,
  testing: 30,
};
// Default options for common propositions
const PROPOSITION_OPTIONS = {
  framework: [
    "FastAPI",
    "Express",
    "Django",
    "Flask",
    "NestJS",
    "Rails",
    "Spring",
    "Hono",
  ],
  auth_method: ["JWT", "OAuth", "Session", "API Key", "SAML", "OIDC"],
  database: ["PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "DynamoDB"],
  hosting: ["AWS", "GCP", "Azure", "Vercel", "Heroku", "Railway", "Fly.io"],
  language: [
    "Python",
    "TypeScript",
    "JavaScript",
    "Go",
    "Rust",
    "Java",
    "Ruby",
  ],
  testing: ["pytest", "Jest", "Vitest", "Mocha", "JUnit", "RSpec"],
};
// Why explanations for propositions
const PROPOSITION_WHY = {
  framework:
    "The framework choice impacts architecture, dependencies, and development patterns.",
  auth_method:
    "Authentication choice affects security architecture and integration complexity.",
  database:
    "Database selection impacts data modeling, scalability, and query patterns.",
  hosting:
    "Hosting platform choice affects deployment, scaling, and operational complexity.",
  language:
    "Language choice depends on team expertise, ecosystem, and performance needs.",
  testing:
    "Testing framework choice affects test structure and CI/CD integration.",
};
// ============================================================
// Utility Functions
// ============================================================
function findFirstMatch(prompt, pattern) {
  const match = prompt.match(pattern);
  return match?.index ?? -1;
}
function isImplementationTask(prompt) {
  if (!prompt?.trim()) return false;
  const implPos = findFirstMatch(prompt, IMPL_PATTERNS);
  const nonImplPos = findFirstMatch(prompt, NON_IMPL_PATTERNS);
  if (implPos === -1) return false;
  if (nonImplPos === -1) return true;
  return implPos < nonImplPos;
}
function toTitleCase(str) {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
// ============================================================
// Main Functions
// ============================================================
/**
 * Extract propositions from a prompt using pattern matching.
 * Returns a dict where found values are lowercase strings, missing values are "UNKNOWN".
 */
export function extractPropositions(prompt) {
  const propositions = {};
  // Handle empty or whitespace-only input
  if (!prompt?.trim()) {
    for (const propName of Object.keys(PROPOSITION_PATTERNS)) {
      propositions[propName] = "UNKNOWN";
    }
    return propositions;
  }
  for (const [propName, pattern] of Object.entries(PROPOSITION_PATTERNS)) {
    const match = prompt.match(pattern);
    if (match) {
      // Normalize to lowercase and handle special cases
      let value = match[0].toLowerCase();
      // Normalize nest.js to nestjs
      if (value === "nest.js") value = "nestjs";
      // Normalize postgresql to postgresql
      if (value === "postgres") value = "postgresql";
      // Normalize oauth2/oauth variations
      if (value.startsWith("oauth")) value = "oauth";
      propositions[propName] = value;
    } else {
      propositions[propName] = "UNKNOWN";
    }
  }
  return propositions;
}
/**
 * Generate clarification questions for a list of unknown propositions.
 * Questions are ordered by Q-value (architectural impact).
 */
export function generateClarificationQuestions(unknowns) {
  if (unknowns.length === 0) {
    return [];
  }
  // Sort by Q-value (higher = more important = asked first)
  const sortedUnknowns = [...unknowns].sort((a, b) => {
    const qA = Q_VALUE_ORDER[a] ?? 10;
    const qB = Q_VALUE_ORDER[b] ?? 10;
    return qB - qA;
  });
  return sortedUnknowns.map((proposition) => ({
    header: toTitleCase(proposition),
    proposition,
    options: PROPOSITION_OPTIONS[proposition] ?? ["Other (specify)"],
    why:
      PROPOSITION_WHY[proposition] ??
      `The ${proposition} choice impacts the overall architecture and implementation.`,
  }));
}
/**
 * Format gate status for display (StatusLine format).
 * Returns: "E:X R:O C:->" format where X=check, O=circle, ->=arrow, x=blocked
 */
export function formatGateStatus(gates) {
  const statusChars = {
    pass: "\u2713", // checkmark
    block: "\u2717", // X mark
    pending: "\u25CB", // circle
  };
  const eChar = statusChars[gates.erotetic];
  const rChar = statusChars[gates.resources];
  const cChar = statusChars[gates.composition];
  return `E:${eChar} R:${rChar} C:${cChar}`;
}
/**
 * Evaluate the erotetic gate for a prompt.
 * Returns continue/block decision with list of unknowns.
 */
export function evaluateEroteticGate(prompt) {
  // Non-implementation tasks always pass
  if (!isImplementationTask(prompt)) {
    return {
      decision: "continue",
      unknowns: [],
    };
  }
  // Extract propositions
  const propositions = extractPropositions(prompt);
  // Find unknown critical propositions
  const unknowns = CRITICAL_PROPOSITIONS.filter(
    (prop) => propositions[prop] === "UNKNOWN",
  );
  if (unknowns.length === 0) {
    return {
      decision: "continue",
      unknowns: [],
    };
  }
  // Gate blocks - generate feedback
  const feedback = generateBlockFeedback("Erotetic", unknowns);
  return {
    decision: "block",
    unknowns,
    feedback,
  };
}
/**
 * Generate structured feedback for a blocked gate (Don Norman principles).
 */
export function generateBlockFeedback(gate, unknowns, suggestions) {
  const unknownsList =
    unknowns.length > 0 ? unknowns.join(", ") : "general requirements";
  return {
    gate,
    status: "block",
    title: `Missing ${unknowns.length} critical proposition(s) to resolve`,
    details: `The following must be clarified before proceeding: ${unknownsList}`,
    suggestion:
      suggestions?.[0] ??
      `Please specify the missing values using AskUserQuestion or select from options.`,
  };
}
// ============================================================
// Exports for barrel file
// ============================================================
export {
  isImplementationTask,
  CRITICAL_PROPOSITIONS,
  PROPOSITION_PATTERNS,
  Q_VALUE_ORDER,
};
