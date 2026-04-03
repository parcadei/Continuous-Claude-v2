/**
 * UserPromptSubmit Hook: Impact Analysis for Refactoring
 *
 * When user mentions refactor/change/rename + function name, automatically
 * runs `tldr impact` and injects the results as context.
 *
 * Priority:
 * 1. Check cached calls.json first (instant)
 * 2. Fall back to live `tldr impact` command
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
// Keywords that trigger impact analysis
const REFACTOR_KEYWORDS = [
  /\brefactor\b/i,
  /\brename\b/i,
  /\bchange\b.*\bfunction\b/i,
  /\bmodify\b.*\b(?:function|method|class)\b/i,
  /\bupdate\b.*\bsignature\b/i,
  /\bmove\b.*\bfunction\b/i,
  /\bdelete\b.*\b(?:function|method)\b/i,
  /\bremove\b.*\b(?:function|method)\b/i,
  /\bextract\b.*\b(?:function|method)\b/i,
  /\binline\b.*\b(?:function|method)\b/i,
];
// Extract function/method names from prompt
const FUNCTION_PATTERNS = [
  /(?:refactor|rename|change|modify|update|move|delete|remove)\s+(?:the\s+)?(?:function\s+)?[`"']?(\w+)[`"']?/gi,
  /[`"'](\w+)[`"']\s+(?:function|method)/gi,
  /(?:function|method|def|fn)\s+[`"']?(\w+)[`"']?/gi,
];
const EXCLUDE_WORDS = new Set([
  "the",
  "this",
  "that",
  "function",
  "method",
  "class",
  "file",
  "to",
  "from",
  "into",
  "a",
  "an",
  "and",
  "or",
  "for",
  "with",
]);
function readStdin() {
  return readFileSync(0, "utf-8");
}
function shouldTrigger(prompt) {
  return REFACTOR_KEYWORDS.some((pattern) => pattern.test(prompt));
}
function extractFunctionNames(prompt) {
  const candidates = new Set();
  for (const pattern of FUNCTION_PATTERNS) {
    let match;
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    while ((match = pattern.exec(prompt)) !== null) {
      const name = match[1];
      if (name && name.length > 2 && !EXCLUDE_WORDS.has(name.toLowerCase())) {
        candidates.add(name);
      }
    }
  }
  // Also look for snake_case and camelCase identifiers
  const identifierPattern = /\b([a-z][a-z0-9_]*[a-z0-9])\b/gi;
  let match;
  while ((match = identifierPattern.exec(prompt)) !== null) {
    const name = match[1];
    if (name.length > 4 && !EXCLUDE_WORDS.has(name.toLowerCase())) {
      // Only add if it looks like a function name (has underscore or is camelCase)
      if (name.includes("_") || /[a-z][A-Z]/.test(name)) {
        candidates.add(name);
      }
    }
  }
  return Array.from(candidates);
}
function findCallersInCache(functionName, cacheDir) {
  const callsPath = join(cacheDir, "calls.json");
  if (!existsSync(callsPath)) return null;
  try {
    const calls = JSON.parse(readFileSync(callsPath, "utf-8"));
    const callers = [];
    // Handle tldr calls format: { edges: [...] }
    if (calls.edges && Array.isArray(calls.edges)) {
      for (const edge of calls.edges) {
        if (edge.to_func === functionName) {
          const caller = `${edge.from_file}:${edge.from_func}`;
          if (!callers.includes(caller)) {
            callers.push(caller);
          }
        }
      }
      return callers.length > 0 ? callers : null;
    }
    // Fallback: old format { caller: [callees] }
    for (const [caller, callees] of Object.entries(calls)) {
      if (Array.isArray(callees) && callees.includes(functionName)) {
        callers.push(caller);
      }
    }
    return callers.length > 0 ? callers : null;
  } catch {
    return null;
  }
}
function runTldrImpact(functionName, projectDir) {
  try {
    // Try src/ first, then project root
    const srcDir = join(projectDir, "src");
    const searchPath = existsSync(srcDir) ? srcDir : projectDir;
    // Cross-platform: use stdio option to suppress stderr (works on Windows/Linux/macOS)
    // stdio: ['pipe', 'pipe', 'ignore'] = stdin: pipe, stdout: pipe, stderr: ignore
    const result = execSync(
      `tldr impact "${functionName}" "${searchPath}" --depth 2`,
      {
        encoding: "utf-8",
        timeout: 10000,
        stdio: ["pipe", "pipe", "ignore"],
      },
    );
    return result?.toString().trim() || null;
  } catch {
    return null;
  }
}
async function main() {
  const input = JSON.parse(readStdin());
  const prompt = input.prompt;
  // Check if this looks like a refactoring request
  if (!shouldTrigger(prompt)) {
    console.log("");
    return;
  }
  // Extract function names
  const functions = extractFunctionNames(prompt);
  if (functions.length === 0) {
    console.log("");
    return;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const cacheDir = join(projectDir, ".claude", "cache", "tldr");
  const results = [];
  for (const funcName of functions.slice(0, 3)) {
    // Max 3 functions
    // Try cache first
    const cachedCallers = findCallersInCache(funcName, cacheDir);
    if (cachedCallers && cachedCallers.length > 0) {
      results.push(
        `📊 **Impact: ${funcName}** (from cache)\nCallers: ${cachedCallers.slice(0, 10).join(", ")}${cachedCallers.length > 10 ? ` (+${cachedCallers.length - 10} more)` : ""}`,
      );
      continue;
    }
    // Fall back to live tldr impact
    const liveResult = runTldrImpact(funcName, projectDir);
    if (liveResult && liveResult.length > 10) {
      // Truncate if too long
      const truncated =
        liveResult.length > 500
          ? liveResult.substring(0, 500) + "\n... (truncated)"
          : liveResult;
      results.push(`📊 **Impact: ${funcName}** (live)\n${truncated}`);
    }
  }
  if (results.length > 0) {
    console.log(
      `\n⚠️ **REFACTORING IMPACT ANALYSIS**\n\n${results.join("\n\n")}\n\nConsider these callers before making changes.\n`,
    );
  } else {
    console.log("");
  }
}
main().catch(() => {
  // Silent fail
  console.log("");
});
