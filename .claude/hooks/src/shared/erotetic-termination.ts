/**
 * Erotetic Termination Logic - Phase 9 of Self-Improving Skill System
 *
 * Termination conditions for the erotetic loop:
 * 1. All Q-heuristics resolved (E(X,Q)=empty)
 * 2. User says "use defaults"
 * 3. Hard cap hit (max 4 questions already asked)
 *
 * Plan reference: thoughts/shared/plans/self-improving-skill-system.md (Phase 9)
 */

import type { QHeuristic } from "./erotetic-questions.js";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * State of the termination check.
 * Tracks what has been resolved and what remains.
 */
export interface TerminationState {
  /** Q-heuristic id -> user answer */
  resolved: Record<string, string>;
  /** Q-heuristics that still need answers */
  unresolved: QHeuristic[];
  /** Number of questions already asked */
  questionsAsked: number;
  /** Whether user explicitly requested defaults */
  userRequestedDefaults: boolean;
}

/**
 * Result of the termination check.
 */
export interface TerminationResult {
  /** Whether the questioning loop should end */
  shouldTerminate: boolean;
  /** Reason for termination (or 'continue' if not terminating) */
  reason: "all_resolved" | "defaults_requested" | "max_questions" | "continue";
  /** Final resolution with defaults applied if needed */
  finalResolution: Record<string, string>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum total questions to ask before terminating.
 * This is the hard cap for the erotetic loop.
 */
export const MAX_QUESTIONS_TOTAL = 4;

/**
 * Patterns that indicate user wants to use defaults.
 * These trigger immediate termination with defaults applied.
 */
const USE_DEFAULTS_PATTERNS: RegExp[] = [
  /\bjust\s+use\s+defaults?\b/i,
  /\bgo\s+with\s+defaults?\b/i,
  /\buse\s+(the\s+)?default\s+values?\b/i,
  /\bpick\s+for\s+me\b/i,
  /\byou\s+decide\b/i,
  /\bwhatever\s+works\b/i,
  /\byour\s+choice\b/i,
  /\byou\s+choose\b/i,
  /\bdefaults?\s+(are\s+)?fine\b/i,
  /\bi\s+don'?t\s+care\b/i,
];

// =============================================================================
// Functions
// =============================================================================

/**
 * Detect if the user's response indicates they want to use defaults.
 *
 * @param response - The user's response text
 * @returns true if user wants to use defaults
 */
export function detectDefaultsIntent(response: string): boolean {
  const text = response.toLowerCase().trim();
  return USE_DEFAULTS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Apply default values to unresolved Q-heuristics.
 * Creates a new object with resolved values plus defaults.
 *
 * @param resolved - Already resolved Q-heuristic answers
 * @param unresolved - Q-heuristics that need default values
 * @returns New object with all values (resolved + defaults)
 */
export function applyDefaults(
  resolved: Record<string, string>,
  unresolved: QHeuristic[],
): Record<string, string> {
  // Create a new object (don't mutate input)
  const result: Record<string, string> = { ...resolved };

  // Apply defaults for unresolved questions
  for (const q of unresolved) {
    // Only apply default if not already resolved
    if (!(q.id in result)) {
      result[q.id] = q.default ?? "";
    }
  }

  return result;
}

/**
 * Check if the erotetic loop should terminate.
 *
 * Priority order:
 * 1. All resolved -> terminate with 'all_resolved'
 * 2. User requested defaults -> terminate with 'defaults_requested'
 * 3. Max questions hit -> terminate with 'max_questions'
 * 4. Otherwise -> continue asking
 *
 * @param state - Current termination state
 * @returns Termination result with reason and final resolution
 */
export function checkTermination(state: TerminationState): TerminationResult {
  const { resolved, unresolved, questionsAsked, userRequestedDefaults } = state;

  // Priority 1: All Q-heuristics resolved
  if (unresolved.length === 0) {
    return {
      shouldTerminate: true,
      reason: "all_resolved",
      finalResolution: { ...resolved },
    };
  }

  // Priority 2: User explicitly requested defaults
  if (userRequestedDefaults) {
    return {
      shouldTerminate: true,
      reason: "defaults_requested",
      finalResolution: applyDefaults(resolved, unresolved),
    };
  }

  // Priority 3: Max questions reached
  if (questionsAsked >= MAX_QUESTIONS_TOTAL) {
    return {
      shouldTerminate: true,
      reason: "max_questions",
      finalResolution: applyDefaults(resolved, unresolved),
    };
  }

  // Default: Continue asking questions
  return {
    shouldTerminate: false,
    reason: "continue",
    finalResolution: { ...resolved }, // Return current state
  };
}
