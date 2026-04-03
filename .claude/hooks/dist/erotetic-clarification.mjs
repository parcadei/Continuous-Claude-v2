#!/usr/bin/env node

// src/erotetic-clarification.ts
import { readFileSync } from "fs";
import { execSync } from "child_process";

// src/shared/workflow-erotetic.ts
var IMPL_PATTERNS =
  /\b(build|implement|create|add|develop|design|set up|write)\b/i;
var NON_IMPL_PATTERNS =
  /\b(fix|run|show|explain|list|search|rename|delete|update)\b/i;
var PROPOSITION_PATTERNS = {
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

// src/erotetic-clarification.ts
function extractPropositions(prompt) {
  const propositions = {};
  for (const [propName, pattern] of Object.entries(PROPOSITION_PATTERNS)) {
    const match = prompt.match(pattern);
    if (match) {
      propositions[propName] = match[0].toLowerCase();
    } else {
      propositions[propName] = "UNKNOWN";
    }
  }
  return propositions;
}
function computeEvocation(propositions, cwd) {
  try {
    const propsJson = JSON.stringify(propositions);
    const result = execSync(
      `uv run python scripts/z3_erotetic_cli.py --props '${propsJson}'`,
      {
        cwd,
        encoding: "utf-8",
        timeout: 5e3,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return JSON.parse(result.trim());
  } catch (err) {
    return null;
  }
}
function getEroteticMessage(propositions, evocation) {
  if (!evocation) {
    return `
EROTETIC CLARIFICATION PROTOCOL (Z3 unavailable - using heuristics)

This is an implementation task. Before proceeding, use AskUserQuestion to clarify:
- Framework/language choice
- Authentication method
- Database selection
- Hosting platform

Only proceed when all key decisions are resolved.
`.trim();
  }
  if (evocation.isEmpty) {
    return `
EROTETIC CHECK PASSED - E(X,Q) = {} (empty)

All propositions resolved from context:
${Object.entries(propositions)
  .filter(([_, v]) => v !== "UNKNOWN")
  .map(([k, v]) => `  - ${k}: ${v}`)
  .join("\n")}

Proceed with implementation.
`.trim();
  }
  return `
EROTETIC CLARIFICATION REQUIRED - E(X,Q) = {${evocation.unknowns.join(", ")}}

Formal evocation check found ${evocation.count} unresolved proposition(s):

UNKNOWNS (must clarify):
${evocation.unknowns.map((u) => `  \u2753 ${u}`).join("\n")}

KNOWN (from context):
${
  Object.entries(propositions)
    .filter(([_, v]) => v !== "UNKNOWN")
    .map(([k, v]) => `  \u2713 ${k}: ${v}`)
    .join("\n") || "  (none extracted)"
}

ACTION: Use AskUserQuestion to resolve the ${evocation.count} unknown(s) above.
Loop until E(X,Q) = {} (empty), then proceed with implementation.
`.trim();
}
async function main() {
  try {
    const input = readFileSync(0, "utf-8");
    let data;
    try {
      data = JSON.parse(input);
    } catch {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const prompt = data.prompt || "";
    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    if (!isImplementationTask(prompt)) {
      console.log(JSON.stringify({ result: "continue" }));
      return;
    }
    const propositions = extractPropositions(prompt);
    const evocation = computeEvocation(propositions, cwd);
    const message = getEroteticMessage(propositions, evocation);
    const output = {
      result: "continue",
      message,
    };
    console.log(JSON.stringify(output));
    process.exit(0);
  } catch (err) {
    console.log(JSON.stringify({ result: "continue" }));
    process.exit(0);
  }
}
main().catch(() => {
  console.log(JSON.stringify({ result: "continue" }));
  process.exit(0);
});
