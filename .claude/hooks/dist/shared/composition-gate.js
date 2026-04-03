/**
 * Composition Gate (Gate 3)
 *
 * Validates pattern algebra rules before orchestration.
 * Part of the 3-gate system: Erotetic -> Resources -> Composition.
 */
import { validateComposition } from "./pattern-selector.js";
/**
 * Error thrown when pattern composition validation fails.
 */
export class CompositionInvalidError extends Error {
  errors;
  constructor(errors) {
    super(`Invalid composition: ${errors.join("; ")}`);
    this.errors = errors;
    this.name = "CompositionInvalidError";
  }
}
/**
 * Gate 3: Composition validation.
 *
 * Validates pattern algebra rules before orchestration.
 * Throws CompositionInvalidError if validation fails.
 *
 * @param patternA - First pattern name
 * @param patternB - Second pattern name
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';')
 * @returns ValidationResult if valid
 * @throws CompositionInvalidError if invalid
 */
export function gate3Composition(
  patternA,
  patternB,
  scope = "handoff",
  operator = ";",
) {
  const result = validateComposition([patternA, patternB], scope, operator);
  if (!result.valid) {
    throw new CompositionInvalidError(result.errors);
  }
  return result;
}
/**
 * Validate a chain of patterns.
 *
 * @param patterns - Array of pattern names to compose
 * @param scope - State sharing scope (default: 'handoff')
 * @param operator - Composition operator (default: ';')
 * @returns ValidationResult if valid
 * @throws CompositionInvalidError if invalid
 */
export function gate3CompositionChain(
  patterns,
  scope = "handoff",
  operator = ";",
) {
  const result = validateComposition(patterns, scope, operator);
  if (!result.valid) {
    throw new CompositionInvalidError(result.errors);
  }
  return result;
}
