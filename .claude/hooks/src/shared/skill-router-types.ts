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
// Hook Input/Output Types
// =============================================================================

/**
 * Input from UserPromptSubmit hook event.
 * Contains the user's prompt and session context.
 *
 * Note: Fields are optional to support graceful degradation
 * when input is malformed or incomplete.
 */
export interface SkillRouterInput {
  session_id?: string;
  prompt?: string;
  // Additional fields from UserPromptSubmit event
  cwd?: string;
  conversation_id?: string;
}

/**
 * Output for hook response.
 * Returns continue/block with optional system message.
 */
export interface SkillRouterOutput {
  result: "continue" | "block";
  message?: string;
}

// =============================================================================
// Skill Lookup Types
// =============================================================================

/**
 * Result from skill lookup operation.
 * Used to determine if a matching skill was found.
 */
export interface SkillLookupResult {
  /** Whether a matching skill was found */
  found: boolean;
  /** Name of the matched skill (if found) */
  skillName?: string;
  /** Path to the skill's SKILL.md file (if found) */
  skillPath?: string;
  /** Confidence score 0-1 (higher = better match) */
  confidence: number;
  /** Source of the match: 'keyword', 'intent', 'memory', 'jit' */
  source?: "keyword" | "intent" | "memory" | "jit";

  // NEW: Enhanced lookup result fields
  /** Prerequisite resolution result */
  prerequisites?: {
    suggest: string[];
    require: string[];
    loadOrder: string[]; // Topologically sorted
  };
  /** Co-activation resolution result */
  coActivation?: {
    peers: string[];
    mode: "all" | "any";
  };
  /** Loading mode for this skill */
  loading?: "lazy" | "eager" | "eager-prerequisites";
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error thrown when a circular dependency is detected in skill prerequisites.
 */
export class CircularDependencyError extends Error {
  constructor(public readonly cyclePath: string[]) {
    super(`Circular dependency detected: ${cyclePath.join(" -> ")}`);
    this.name = "CircularDependencyError";
  }
}

// =============================================================================
// Skill Rules Types (for Phase 3+)
// =============================================================================

/**
 * Trigger configuration for a skill.
 * Defines how prompts are matched to skills.
 */
export interface SkillTrigger {
  keywords?: string[];
  intentPatterns?: string[];
}

/**
 * Single skill entry in skill-rules.json.
 */
export interface SkillRule {
  type?:
    | "domain"
    | "workflow"
    | "meta"
    | "process"
    | "exploration"
    | "research"
    | "planning"
    | "validation"
    | "debugging"
    | "development";
  enforcement?: "suggest" | "require" | "auto" | "block" | "warn";
  priority?: "low" | "medium" | "high" | "critical";
  description?: string;
  promptTriggers?: SkillTrigger;
  reminder?: string;

  // NEW: Prerequisites (vertical chain)
  prerequisites?: {
    suggest?: string[]; // Suggest before loading this skill
    require?: string[]; // Must be loaded before this skill
  };

  // NEW: Co-activation (horizontal chain)
  coActivate?: string[]; // Peers to activate together
  coActivateMode?: "all" | "any"; // all = activate all peers, any = suggest peers

  // NEW: Loading mode
  loading?: "lazy" | "eager" | "eager-prerequisites";
}

/**
 * Complete skill-rules.json structure.
 */
export interface SkillRulesConfig {
  version?: string;
  description?: string;
  skills: Record<string, SkillRule>;
  agents?: Record<string, SkillRule>;
  notes?: Record<string, unknown>;
}
