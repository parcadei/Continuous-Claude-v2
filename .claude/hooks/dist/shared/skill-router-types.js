/**
 * Shared type definitions for Skill Router hook.
 *
 * These types are used across phases of the self-improving skill system:
 * - Phase 2: Basic types and lookup stub
 * - Phase 3: Skill matching (keywords)
 * - Phase 4: Intent pattern matching
 * - Phase 5-6: Memory integration
 * - Phase 7+: JIT skill generation
 *
 * Plan: thoughts/shared/plans/self-improving-skill-system.md
 */
// =============================================================================
// Error Types
// =============================================================================
/**
 * Error thrown when a circular dependency is detected in skill prerequisites.
 */
export class CircularDependencyError extends Error {
  cyclePath;
  constructor(cyclePath) {
    super(`Circular dependency detected: ${cyclePath.join(" -> ")}`);
    this.cyclePath = cyclePath;
    this.name = "CircularDependencyError";
  }
}
