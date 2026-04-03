/**
 * Task Detector - Phase 7 of Self-Improving Skill System
 *
 * Detects whether a user prompt is a task that should trigger JIT skill
 * generation vs a conversational prompt that should just continue.
 *
 * Task types:
 * - implementation: build, create, implement, add feature, write
 * - research: how do I, find out, research, look into
 * - debug: fix bug, debug, investigate, troubleshoot
 * - planning: plan, design, architect, outline
 * - unknown: detected as task but type not determined
 *
 * Conversational (NOT tasks):
 * - what is, explain, show me, tell me about, describe
 * - greetings, thanks, simple questions
 *
 * Plan: thoughts/shared/plans/self-improving-skill-system.md (Phase 7)
 */
/**
 * Implementation task indicators.
 * Strong signals that the user wants to build/create something.
 */
const IMPLEMENTATION_INDICATORS = [
  {
    pattern: /\bimplement\b/i,
    keyword: "implement",
    type: "implementation",
    weight: 0.9,
  },
  {
    pattern: /\bbuild\b/i,
    keyword: "build",
    type: "implementation",
    weight: 0.9,
  },
  {
    pattern: /\bcreate\b/i,
    keyword: "create",
    type: "implementation",
    weight: 0.8,
  },
  {
    pattern: /\badd\s+(a\s+)?feature/i,
    keyword: "add feature",
    type: "implementation",
    weight: 0.85,
  },
  {
    pattern: /\bwrite\s+(a\s+)?(function|class|method|component|module)/i,
    keyword: "write",
    type: "implementation",
    weight: 0.85,
  },
  {
    pattern: /\bdevelop\b/i,
    keyword: "develop",
    type: "implementation",
    weight: 0.8,
  },
  {
    pattern: /\bset\s*up\b/i,
    keyword: "set up",
    type: "implementation",
    weight: 0.7,
  },
  {
    pattern: /\bconfigure\b/i,
    keyword: "configure",
    type: "implementation",
    weight: 0.7,
  },
  {
    pattern: /\brefactor\b/i,
    keyword: "refactor",
    type: "implementation",
    weight: 0.8,
  },
  {
    pattern: /\bmigrate\b/i,
    keyword: "migrate",
    type: "implementation",
    weight: 0.75,
  },
];
/**
 * Debug task indicators.
 * Signals that the user wants to fix or investigate an issue.
 */
const DEBUG_INDICATORS = [
  { pattern: /\bdebug\b/i, keyword: "debug", type: "debug", weight: 0.9 },
  {
    pattern: /\bfix\s+(the\s+)?(bug|issue|error|problem)/i,
    keyword: "fix bug",
    type: "debug",
    weight: 0.9,
  },
  {
    pattern: /\binvestigate\b/i,
    keyword: "investigate",
    type: "debug",
    weight: 0.85,
  },
  {
    pattern: /\btroubleshoot\b/i,
    keyword: "troubleshoot",
    type: "debug",
    weight: 0.85,
  },
  { pattern: /\bdiagnose\b/i, keyword: "diagnose", type: "debug", weight: 0.8 },
  {
    pattern: /\bwhy\s+is\s+.*\b(failing|broken|not\s+working)/i,
    keyword: "why failing",
    type: "debug",
    weight: 0.75,
  },
  { pattern: /\bfix\b/i, keyword: "fix", type: "debug", weight: 0.6 },
];
/**
 * Research task indicators.
 * Signals that the user wants to learn about or explore options.
 */
const RESEARCH_INDICATORS = [
  {
    pattern: /\bhow\s+do\s+I\b/i,
    keyword: "how do I",
    type: "research",
    weight: 0.85,
  },
  {
    pattern: /\bfind\s+out\b/i,
    keyword: "find out",
    type: "research",
    weight: 0.8,
  },
  {
    pattern: /\bresearch\b/i,
    keyword: "research",
    type: "research",
    weight: 0.85,
  },
  {
    pattern: /\blook\s+into\b/i,
    keyword: "look into",
    type: "research",
    weight: 0.8,
  },
  {
    pattern: /\bexplore\s+(the\s+)?(options|possibilities|approaches)/i,
    keyword: "explore",
    type: "research",
    weight: 0.75,
  },
  {
    pattern: /\bwhat\s+are\s+(the\s+)?(best\s+practices|options|ways)/i,
    keyword: "best practices",
    type: "research",
    weight: 0.7,
  },
  {
    pattern: /\blearn\s+about\b/i,
    keyword: "learn about",
    type: "research",
    weight: 0.7,
  },
];
/**
 * Planning task indicators.
 * Signals that the user wants to design or plan something.
 */
const PLANNING_INDICATORS = [
  { pattern: /\bplan\b/i, keyword: "plan", type: "planning", weight: 0.85 },
  { pattern: /\bdesign\b/i, keyword: "design", type: "planning", weight: 0.85 },
  {
    pattern: /\barchitect\b/i,
    keyword: "architect",
    type: "planning",
    weight: 0.9,
  },
  {
    pattern: /\boutline\b/i,
    keyword: "outline",
    type: "planning",
    weight: 0.75,
  },
  {
    pattern: /\bstrateg(y|ize)\b/i,
    keyword: "strategy",
    type: "planning",
    weight: 0.8,
  },
  {
    pattern: /\bpropose\b/i,
    keyword: "propose",
    type: "planning",
    weight: 0.7,
  },
  {
    pattern: /\bstructure\b/i,
    keyword: "structure",
    type: "planning",
    weight: 0.65,
  },
];
/**
 * Conversational patterns - these NEGATE task detection.
 * When matched, they reduce confidence that this is a task.
 */
const CONVERSATIONAL_PATTERNS = [
  /\bwhat\s+is\b/i,
  /\bexplain\b/i,
  /\bshow\s+me\b/i,
  /\btell\s+me\s+about\b/i,
  /\bdescribe\b/i,
  /\bcan\s+you\s+explain\b/i,
  /\bhelp\s+me\s+understand\b/i,
  /\bwhat\s+does\b/i,
  /\bhow\s+does\b/i,
  /\bwhy\s+does\b/i,
  /\bwhat's\s+the\s+difference\b/i,
  /\bhello\b/i,
  /\bhi\b/i,
  /\bthanks?\b/i,
  /\bthank\s+you\b/i,
  /\bgreat\b/i,
  /\bnice\b/i,
  /\bgood\s+job\b/i,
  /\bwhat\s+happened\b/i,
];
/**
 * All task indicators combined.
 */
const ALL_TASK_INDICATORS = [
  ...IMPLEMENTATION_INDICATORS,
  ...DEBUG_INDICATORS,
  ...RESEARCH_INDICATORS,
  ...PLANNING_INDICATORS,
];
/**
 * Detect if a prompt is a task vs conversational.
 *
 * Returns TaskDetectionResult with:
 * - isTask: true if this appears to be a task
 * - taskType: the primary type of task detected
 * - confidence: 0-1 score of confidence
 * - triggers: the words/patterns that matched
 *
 * @param prompt - The user's prompt to analyze
 * @returns TaskDetectionResult
 */
export function detectTask(prompt) {
  if (!prompt?.trim()) {
    return {
      isTask: false,
      confidence: 0,
      triggers: [],
    };
  }
  const promptLower = prompt.toLowerCase();
  // Check for conversational patterns first
  const conversationalMatches = CONVERSATIONAL_PATTERNS.filter((p) =>
    p.test(promptLower),
  );
  // Find all task indicator matches
  const matches = [];
  for (const indicator of ALL_TASK_INDICATORS) {
    if (indicator.pattern.test(promptLower)) {
      matches.push({ indicator, keyword: indicator.keyword });
    }
  }
  // If no task indicators matched, not a task
  if (matches.length === 0) {
    return {
      isTask: false,
      confidence: 0,
      triggers: [],
    };
  }
  // Calculate confidence based on:
  // 1. Number of matches
  // 2. Weight of matches
  // 3. Penalty for conversational patterns
  let totalWeight = 0;
  for (const match of matches) {
    totalWeight += match.indicator.weight;
  }
  // Average weight, boosted slightly for multiple matches
  let confidence = totalWeight / matches.length;
  // Boost for multiple different task indicators (capped at 0.15 boost)
  const uniqueTypes = new Set(matches.map((m) => m.indicator.type));
  if (uniqueTypes.size > 1) {
    confidence += 0.1;
  }
  if (matches.length > 2) {
    confidence += Math.min(0.05 * (matches.length - 2), 0.15);
  }
  // Penalty for conversational patterns
  if (conversationalMatches.length > 0) {
    confidence -= 0.3 * conversationalMatches.length;
  }
  // If conversational penalty brings us below threshold, not a task
  if (confidence < 0.4) {
    return {
      isTask: false,
      confidence: Math.max(0, confidence),
      triggers: [],
    };
  }
  // Normalize confidence to 0-1 range
  confidence = Math.min(1, Math.max(0, confidence));
  // Determine primary task type (highest weight match)
  const sortedMatches = [...matches].sort(
    (a, b) => b.indicator.weight - a.indicator.weight,
  );
  const primaryType = sortedMatches[0].indicator.type;
  // Extract unique triggers
  const triggers = [...new Set(matches.map((m) => m.keyword))];
  return {
    isTask: true,
    taskType: primaryType,
    confidence,
    triggers,
  };
}
