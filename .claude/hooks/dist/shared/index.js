/**
 * Shared Module Barrel Exports
 *
 * Central export point for all shared utilities.
 */
// Workflow erotetic gate utilities
export {
  extractPropositions,
  generateClarificationQuestions,
  formatGateStatus,
  evaluateEroteticGate,
  generateBlockFeedback,
  isImplementationTask,
  CRITICAL_PROPOSITIONS,
  PROPOSITION_PATTERNS,
  Q_VALUE_ORDER,
} from "./workflow-erotetic.js";
// Erotetic questions
export {
  getQHeuristicsForTask,
  resolveFromContext,
  formatAskUserQuestions,
  MAX_QUESTIONS,
} from "./erotetic-questions.js";
// Erotetic termination
export {
  checkTermination,
  detectDefaultsIntent,
  applyDefaults,
  MAX_QUESTIONS_TOTAL,
} from "./erotetic-termination.js";
// Pattern router
export {
  detectPattern,
  isValidId,
  SAFE_ID_PATTERN,
  SUPPORTED_PATTERNS,
} from "./pattern-router.js";
// Pattern selector
export {
  selectPattern,
  validateComposition,
  SUPPORTED_PATTERNS as PATTERN_LIST,
} from "./pattern-selector.js";
// Composition gate (Gate 3)
export {
  gate3Composition,
  gate3CompositionChain,
  CompositionInvalidError,
} from "./composition-gate.js";
// Python bridge (internal use)
export {
  callValidateComposition,
  callPatternInference,
} from "./python-bridge.js";
// Resource utilities
export {
  readResourceState,
  getResourceFilePath,
  getSessionId,
  DEFAULT_RESOURCE_STATE,
} from "./resource-reader.js";
export { getSystemResources } from "./resource-utils.js";
export { CircularDependencyError } from "./skill-router-types.js";
// Task detector
export { detectTask } from "./task-detector.js";
// DB utilities
export {
  getDbPath,
  queryDb,
  runPythonQuery,
  registerAgent,
  completeAgent,
  getActiveAgentCount,
} from "./db-utils.js";
// Memory client
export {
  MemoryClient,
  searchMemory,
  storeMemory,
  isMemoryAvailable,
  trackUsage,
  recordSkillUsage,
} from "./memory-client.js";
