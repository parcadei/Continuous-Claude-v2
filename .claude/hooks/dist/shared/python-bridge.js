/**
 * Python Bridge
 *
 * Subprocess wrappers to call Python validation and inference scripts.
 * Provides type-safe interface between TypeScript hooks and Python logic.
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
// Get project root - from .claude/hooks/src/shared/ go up 4 levels
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR =
  process.env.CLAUDE_PROJECT_DIR || resolve(__dirname, "..", "..", "..", "..");
/**
 * Call Python validate_composition.py with JSON output.
 *
 * @param patternA - First pattern name
 * @param patternB - Second pattern name
 * @param scope - State sharing scope
 * @param operator - Composition operator
 * @returns ValidationResult with validity, errors, warnings, and scope trace
 */
export function callValidateComposition(
  patternA,
  patternB,
  scope,
  operator = ";",
) {
  const expr = `${patternA} ${operator}[${scope}] ${patternB}`;
  const cmd = `uv run python scripts/validate_composition.py --json "${expr}"`;
  try {
    const stdout = execSync(cmd, {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const result = JSON.parse(stdout);
    // Map Python snake_case to TypeScript camelCase
    return {
      valid: result.all_valid ?? false,
      composition: result.expression ?? expr,
      errors: result.compositions?.[0]?.errors ?? [],
      warnings: result.compositions?.[0]?.warnings ?? [],
      scopeTrace: result.compositions?.[0]?.scope_trace ?? [],
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      composition: expr,
      errors: [`Bridge error: ${errorMessage}`],
      warnings: [],
      scopeTrace: [],
    };
  }
}
/**
 * Call Python pattern_inference.py to infer best pattern for a task.
 *
 * @param prompt - Task description
 * @returns PatternInferenceResult with pattern, confidence, and signals
 */
export function callPatternInference(prompt) {
  // Escape double quotes and backslashes for shell safety
  const escaped = prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const cmd = `uv run python scripts/agentica_patterns/pattern_inference.py "${escaped}"`;
  try {
    const stdout = execSync(cmd, {
      cwd: PROJECT_DIR,
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const result = JSON.parse(stdout);
    return {
      pattern: result.pattern,
      confidence: result.confidence ?? 0.5,
      signals: result.signals ?? [],
      needsClarification: result.needs_clarification ?? false,
      clarificationProbe: result.clarification_probe ?? null,
      ambiguityType: result.ambiguity_type ?? null,
      alternatives: result.alternatives ?? [],
      workBreakdown: result.work_breakdown ?? "Task decomposition",
    };
  } catch (err) {
    // Fallback to hierarchical on error
    return {
      pattern: "hierarchical",
      confidence: 0.3,
      signals: ["bridge error fallback"],
      needsClarification: true,
      clarificationProbe: "Could not infer pattern - what would help?",
      ambiguityType: "scope",
      alternatives: [],
      workBreakdown: "Coordinated task decomposition with specialists",
    };
  }
}
