/**
 * Pattern Selector
 *
 * Selects appropriate patterns for tasks and validates pattern compositions.
 * Uses Python bridge to call validate_composition.py and pattern_inference.py.
 */

import {
  callPatternInference,
  callValidateComposition,
} from "./python-bridge.js";

/**
 * All supported orchestration patterns.
 * Matches Python PATTERNS dict in validate_composition.py
 */
export const SUPPORTED_PATTERNS = [
  "swarm",
  "jury",
  "pipeline",
  "generator_critic",
  "hierarchical",
  "map_reduce",
  "blackboard",
  "circuit_breaker",
  "chain_of_responsibility",
  "adversarial",
  "event_driven",
  "consensus",
  "aggregator",
  "broadcast",
] as const;

export type PatternType = (typeof SUPPORTED_PATTERNS)[number];

/**
 * State sharing scope types.
 * Matches Python ScopeType enum in validate_composition.py
 */
export type ScopeType = "iso" | "shared" | "fed" | "handoff";

/**
 * Composition operators.
 * Matches Python Operator enum in validate_composition.py
 */
export type OperatorType = ";" | "|" | "+";

/**
 * Result of pattern composition validation.
 * Matches Python ValidationResult dataclass.
 */
export interface ValidationResult {
  valid: boolean;
  composition: string;
  errors: string[];
  warnings: string[];
  scopeTrace: string[];
}

/**
 * Result of pattern inference from task description.
 * Matches Python PatternInference dataclass.
 */
export interface PatternInferenceResult {
  pattern: PatternType;
  confidence: number;
  signals: string[];
  needsClarification: boolean;
  clarificationProbe: string | null;
  ambiguityType: string | null;
  alternatives: PatternType[];
  workBreakdown: string;
}

export interface PatternSelection {
  pattern: PatternType;
  confidence: number;
  reason: string;
}

export interface Task {
  description: string;
  complexity: "low" | "medium" | "high";
  parallelizable: boolean;
  requiresValidation: boolean;
}

/**
 * Select the best pattern for a given task.
 * Uses Python pattern_inference.py via subprocess.
 */
export function selectPattern(task: Task): PatternSelection {
  const result = callPatternInference(task.description);

  return {
    pattern: result.pattern,
    confidence: result.confidence,
    reason: result.workBreakdown,
  };
}

/**
 * Validate that a composition of patterns is valid.
 * Uses Python validate_composition.py via subprocess.
 *
 * For chains of 3+ patterns, validates pairwise left-to-right.
 *
 * @param patterns - Array of pattern names to compose
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';' sequential)
 * @returns ValidationResult with validity, errors, warnings, and trace
 */
export function validateComposition(
  patterns: PatternType[] | string[],
  scope: ScopeType = "handoff",
  operator: OperatorType = ";",
): ValidationResult {
  if (patterns.length === 0) {
    return {
      valid: true,
      composition: "",
      errors: [],
      warnings: [],
      scopeTrace: [],
    };
  }

  if (patterns.length === 1) {
    return {
      valid: true,
      composition: patterns[0],
      errors: [],
      warnings: [],
      scopeTrace: [],
    };
  }

  // Validate pairwise (left-associative)
  const allWarnings: string[] = [];
  const allTraces: string[] = [];
  let compositionStr = patterns[0];

  for (let i = 0; i < patterns.length - 1; i++) {
    const result = callValidateComposition(
      patterns[i],
      patterns[i + 1],
      scope,
      operator,
    );

    if (!result.valid) {
      return {
        valid: false,
        composition: compositionStr,
        errors: result.errors,
        warnings: result.warnings,
        scopeTrace: result.scopeTrace,
      };
    }

    allWarnings.push(...result.warnings);
    allTraces.push(...result.scopeTrace);
    compositionStr = result.composition;
  }

  return {
    valid: true,
    composition: compositionStr,
    errors: [],
    warnings: allWarnings,
    scopeTrace: allTraces,
  };
}
