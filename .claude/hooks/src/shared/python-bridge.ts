/**
 * Python Bridge
 *
 * Subprocess wrappers to call Python validation and inference scripts.
 * Provides type-safe interface between TypeScript hooks and Python logic.
 */

import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { ValidationResult, PatternInferenceResult, PatternType } from './pattern-selector.js';

// Get project root - from .claude/hooks/src/shared/ go up 4 levels
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || resolve(__dirname, '..', '..', '..', '..');

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
  patternA: string,
  patternB: string,
  scope: string,
  operator: string = ';'
): ValidationResult {
  const expr = `${patternA} ${operator}[${scope}] ${patternB}`;

  try {
    const proc = spawnSync('uv', [
      'run', 'python', 'scripts/validate_composition.py', '--json', expr
    ], {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const result = JSON.parse(proc.stdout || '');

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
export function callPatternInference(prompt: string): PatternInferenceResult {
  try {
    const proc = spawnSync('uv', [
      'run', 'python', 'scripts/agentica_patterns/pattern_inference.py', prompt
    ], {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const result = JSON.parse(proc.stdout || '');

    return {
      pattern: result.pattern as PatternType,
      confidence: result.confidence ?? 0.5,
      signals: result.signals ?? [],
      needsClarification: result.needs_clarification ?? false,
      clarificationProbe: result.clarification_probe ?? null,
      ambiguityType: result.ambiguity_type ?? null,
      alternatives: (result.alternatives ?? []) as PatternType[],
      workBreakdown: result.work_breakdown ?? 'Task decomposition',
    };
  } catch (err) {
    // Fallback to hierarchical on error
    return {
      pattern: 'hierarchical',
      confidence: 0.3,
      signals: ['bridge error fallback'],
      needsClarification: true,
      clarificationProbe: 'Could not infer pattern - what would help?',
      ambiguityType: 'scope',
      alternatives: [],
      workBreakdown: 'Coordinated task decomposition with specialists',
    };
  }
}
