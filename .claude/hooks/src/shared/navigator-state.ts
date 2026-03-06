/**
 * Navigator State - Session state management for pageindex-navigator.
 *
 * Tracks:
 * - Detected task type from prompts
 * - Which guidance has been shown (avoid repetition)
 * - Session caching for efficiency
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

// Task types that map to decision trees
export type TaskType =
  | 'RESEARCH'
  | 'IMPLEMENTATION'
  | 'DEBUGGING'
  | 'REFACTORING'
  | 'REVIEW'
  | 'CASUAL'
  | 'UNKNOWN';

// Valid agents per task type (for validation)
export const VALID_AGENTS: Record<TaskType, string[]> = {
  RESEARCH: ['scout', 'oracle', 'pathfinder'],
  IMPLEMENTATION: ['kraken', 'spark', 'architect', 'plan-agent', 'strategic-refactorer'],
  DEBUGGING: ['debug-agent', 'sleuth', 'profiler', 'spark', 'aegis', 'principal-debugger'],
  REFACTORING: ['phoenix', 'spark', 'strategic-refactorer', 'kraken'],
  REVIEW: ['critic', 'judge', 'liaison', 'surveyor', 'principal-reviewer', 'react-perf-reviewer', 'ui-compliance-reviewer'],
  CASUAL: [], // No specific agents
  UNKNOWN: [], // Allow any
};

// Keywords that indicate task types
const TASK_PATTERNS: Record<TaskType, RegExp[]> = {
  RESEARCH: [
    /\b(understand|explore|how does|what is|find|search|look for|where is)\b/i,
    /\b(explain|describe|show me|tell me about)\b/i,
  ],
  IMPLEMENTATION: [
    /\b(build|create|implement|add|make|write|develop)\b/i,
    /\b(feature|component|function|module|api|endpoint)\b/i,
  ],
  DEBUGGING: [
    /\b(fix|debug|broken|error|bug|crash|fail|issue)\b/i,
    /\b(not working|doesn't work|wrong|problem)\b/i,
  ],
  REFACTORING: [
    /\b(refactor|clean|restructure|reorganize|simplify)\b/i,
    /\b(migrate|upgrade|modernize|improve)\b/i,
  ],
  REVIEW: [
    /\b(review|audit|check|verify|validate|assess)\b/i,
    /\b(pr|pull request|code review)\b/i,
  ],
  CASUAL: [
    /^(hello|hi|hey|thanks|thank you|ok|okay|sure|yes|no)[\s!?.]*$/i,
    /^(good morning|good afternoon|good evening)[\s!?.]*$/i,
  ],
  UNKNOWN: [],
};

export interface NavigatorState {
  sessionId: string;
  detectedTaskType: TaskType;
  currentPromptKeywords: string[];
  guidanceShown: {
    decisionTree: boolean;
    rulesShown: string[];
    agentsShown: string[];
  };
  lastActivity: number;
  promptCount: number;
}

const STATE_DIR = join(tmpdir(), 'claude-navigator');
const STATE_FILE = 'navigator-state.json';

function getStateFilePath(sessionId: string): string {
  return join(STATE_DIR, `${sessionId}-${STATE_FILE}`);
}

/**
 * Detect task type from user prompt.
 */
export function detectTaskType(prompt: string): TaskType {
  const normalized = prompt.trim().toLowerCase();

  // Check casual first (short greetings)
  for (const pattern of TASK_PATTERNS.CASUAL) {
    if (pattern.test(normalized)) {
      return 'CASUAL';
    }
  }

  // Score each task type
  const scores: Record<TaskType, number> = {
    RESEARCH: 0,
    IMPLEMENTATION: 0,
    DEBUGGING: 0,
    REFACTORING: 0,
    REVIEW: 0,
    CASUAL: 0,
    UNKNOWN: 0,
  };

  for (const [taskType, patterns] of Object.entries(TASK_PATTERNS)) {
    if (taskType === 'CASUAL' || taskType === 'UNKNOWN') continue;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        scores[taskType as TaskType]++;
      }
    }
  }

  // Find highest scoring task type
  let maxScore = 0;
  let detectedType: TaskType = 'UNKNOWN';

  for (const [taskType, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = taskType as TaskType;
    }
  }

  // If no clear signal, return UNKNOWN (still shows guidance)
  return maxScore > 0 ? detectedType : 'UNKNOWN';
}

/**
 * Extract meaningful keywords from prompt for PageIndex queries.
 */
export function extractQueryKeywords(prompt: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
    'all', 'each', 'few', 'more', 'most', 'other', 'some', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'now', 'i', 'me', 'my', 'you', 'your', 'we', 'our', 'they', 'them',
    'it', 'its', 'this', 'that', 'these', 'what', 'which', 'who', 'and',
    'but', 'if', 'or', 'because', 'as', 'until', 'while', 'about',
    'please', 'help', 'want', 'need', 'like', 'let', 'lets', "let's",
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)].slice(0, 8);
}

/**
 * Load navigator state for a session.
 */
export function loadState(sessionId: string): NavigatorState {
  const filePath = getStateFilePath(sessionId);

  try {
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Fall through to default
  }

  return {
    sessionId,
    detectedTaskType: 'UNKNOWN',
    currentPromptKeywords: [],
    guidanceShown: {
      decisionTree: false,
      rulesShown: [],
      agentsShown: [],
    },
    lastActivity: Date.now(),
    promptCount: 0,
  };
}

/**
 * Save navigator state for a session.
 */
export function saveState(state: NavigatorState): void {
  const filePath = getStateFilePath(state.sessionId);

  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }

    state.lastActivity = Date.now();
    writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch {
    // Silent fail
  }
}

/**
 * Check if we should show abbreviated guidance (task type same as before).
 */
export function shouldAbbreviate(state: NavigatorState, newTaskType: TaskType): boolean {
  // Always show full guidance on first prompt
  if (state.promptCount === 0) return false;

  // Show full if task type changed
  if (state.detectedTaskType !== newTaskType) return false;

  // Abbreviate if we showed decision tree recently
  return state.guidanceShown.decisionTree;
}

/**
 * Check if agent is valid for detected task type.
 */
export function isAgentValidForTask(agentType: string, taskType: TaskType): boolean {
  // UNKNOWN allows any agent
  if (taskType === 'UNKNOWN' || taskType === 'CASUAL') return true;

  const validAgents = VALID_AGENTS[taskType];
  if (!validAgents || validAgents.length === 0) return true;

  return validAgents.some(valid =>
    agentType.toLowerCase().includes(valid.toLowerCase()) ||
    valid.toLowerCase().includes(agentType.toLowerCase())
  );
}

/**
 * Get suggested agents for a task type.
 */
export function getSuggestedAgents(taskType: TaskType): string[] {
  return VALID_AGENTS[taskType] || [];
}

/**
 * Update state after showing guidance.
 */
export function markGuidanceShown(
  state: NavigatorState,
  taskType: TaskType,
  rulesShown: string[] = [],
  agentsShown: string[] = []
): void {
  state.detectedTaskType = taskType;
  state.guidanceShown.decisionTree = true;
  state.guidanceShown.rulesShown = [
    ...new Set([...state.guidanceShown.rulesShown, ...rulesShown])
  ];
  state.guidanceShown.agentsShown = [
    ...new Set([...state.guidanceShown.agentsShown, ...agentsShown])
  ];
  state.promptCount++;
}
