/**
 * Pattern Router - Shared module for pattern detection in hooks
 *
 * Provides utilities for detecting the current agent orchestration pattern
 * based on the PATTERN_TYPE environment variable, and for validating IDs
 * to prevent injection attacks.
 *
 * Part of the pattern-aware hooks infrastructure.
 * See: thoughts/shared/plans/2025-12-28-pattern-aware-hooks.md
 */
/**
 * All supported orchestration patterns.
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
];
/**
 * Detect the current pattern type from environment variable.
 *
 * Reads the PATTERN_TYPE environment variable and returns the pattern name
 * if set, or null if not set or empty.
 *
 * @returns Pattern name string or null if not set/empty
 *
 * @example
 * // When PATTERN_TYPE=swarm
 * detectPattern() // returns 'swarm'
 *
 * // When PATTERN_TYPE is not set
 * detectPattern() // returns null
 */
export function detectPattern() {
  const pattern = process.env.PATTERN_TYPE;
  if (!pattern) return null;
  return pattern;
}
/**
 * Safe ID pattern: alphanumeric, underscore, hyphen, 1-64 characters.
 *
 * Used to validate swarm IDs, agent IDs, and pattern IDs to prevent:
 * - Path traversal (../)
 * - Command injection ($(command), `command`)
 * - SQL injection ('; DROP TABLE)
 * - Other special character attacks
 *
 * @example
 * SAFE_ID_PATTERN.test('abc123')        // true
 * SAFE_ID_PATTERN.test('agent-001')     // true
 * SAFE_ID_PATTERN.test('swarm_coord')   // true
 * SAFE_ID_PATTERN.test('../etc/passwd') // false
 * SAFE_ID_PATTERN.test('$(whoami)')     // false
 */
export const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
/**
 * Validate an ID against the safe pattern.
 *
 * @param id - The ID to validate
 * @returns true if the ID is safe, false otherwise
 */
export function isValidId(id) {
  return SAFE_ID_PATTERN.test(id);
}
