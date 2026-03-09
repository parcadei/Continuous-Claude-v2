/**
 * Memory Quality Scorer
 *
 * Filters memory extraction candidates before storage.
 * Assigns a 0-10 quality score based on signal/noise indicators.
 *
 * Thresholds:
 *   >= 5  SIGNAL     (store with high confidence)
 *   3-4   BORDERLINE (store with medium confidence)
 *   < 3   NOISE      (discard)
 */

export interface ScoringResult {
  score: number;         // 0-10 scale
  confidence: 'high' | 'medium' | 'low';
  classification: 'SIGNAL' | 'NOISE' | 'BORDERLINE';
  reasons: string[];     // why this score
}

// --- Signal indicators (+points) ---

interface Indicator {
  test: (content: string, context?: string) => boolean;
  points: number;
  label: string;
}

const SIGNAL_INDICATORS: Indicator[] = [
  {
    test: (c) => /error|exception|failure|bug|crash/i.test(c) && /fix|fixed|solved|solution|resolved|workaround/i.test(c),
    points: 3,
    label: 'contains error + fix/solution',
  },
  {
    test: (c) => /decided to|chose|because|rationale|trade-?off/i.test(c) && c.length > 60,
    points: 2,
    label: 'contains decision with reasoning',
  },
  {
    test: (c) => /[.\/\\][\w-]+\.(ts|js|py|mjs|json|yaml|yml|toml|md|sh|go|rs)\b/.test(c) && c.length > 60,
    points: 2,
    label: 'contains file path + explanation',
  },
  {
    test: (c) => /doesn'?t work|does not work|fixed by|root cause|broke because/i.test(c),
    points: 2,
    label: 'contains diagnostic language',
  },
  {
    test: (c) => c.length > 100,
    points: 1,
    label: 'content length > 100 chars',
  },
  {
    test: (c) => /`[^`]+`/.test(c) || /\$\s*\w+/.test(c) || /--[\w-]+/.test(c),
    points: 1,
    label: 'contains code snippet or command',
  },
  {
    // Mentions specific technical tools/systems (rescues short factual statements)
    test: (c) => /\b(esbuild|webpack|vite|vitest|jest|pytest|docker|postgres|redis|nginx|caddy|drizzle|prisma|typescript|eslint|prettier|rollup|turbopack|bun|deno|node)\b/i.test(c),
    points: 1,
    label: 'mentions specific technology/tool',
  },
];

// --- Noise indicators (-points) ---

const NOISE_INDICATORS: Indicator[] = [
  {
    test: (c) => /periodic extraction|session checkpoint/i.test(c),
    points: -3,
    label: 'matches periodic/checkpoint pattern',
  },
  {
    test: (c) => /\bheartbeat\b|\bstatus update\b/i.test(c),
    points: -3,
    label: 'matches heartbeat/status update',
  },
  {
    test: (c) => c.length < 50,
    points: -2,
    label: 'content too short (< 50 chars)',
  },
  {
    test: (c) => {
      // Generic/vague: no file paths, no error messages, no decisions, no tech terms
      const hasPath = /[.\/\\][\w-]+\.(ts|js|py|mjs|json|yaml|yml|toml|md|sh|go|rs)\b/.test(c);
      const hasError = /error|exception|failure|bug|crash/i.test(c);
      const hasDecision = /decided|chose|because|rationale/i.test(c);
      const hasDiagnostic = /fix|root cause|doesn'?t work|broke/i.test(c);
      const hasCommand = /`[^`]+`/.test(c) || /--[\w-]+/.test(c);
      const hasTechTerm = /\b(esbuild|webpack|vite|vitest|jest|pytest|docker|postgres|redis|nginx|caddy|drizzle|prisma|typescript|eslint|prettier|rollup|turbopack|bun|deno|node)\b/i.test(c);
      return !hasPath && !hasError && !hasDecision && !hasDiagnostic && !hasCommand && !hasTechTerm;
    },
    points: -2,
    label: 'generic/vague content',
  },
  {
    test: (c) => {
      const stripped = c.trim().toLowerCase();
      return /^(task\s+)?(completed|in progress|started|done|pending|finished)\b/i.test(stripped)
        || /^\s*(completed|in progress|started)\s*$/i.test(stripped);
    },
    points: -2,
    label: 'only contains task status',
  },
  {
    // Repetitive/padded content: long text but low unique sentence ratio
    test: (c) => {
      if (c.length < 100) return false;
      const sentences = c.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 5);
      if (sentences.length < 2) return false;
      const uniqueSentences = new Set(sentences);
      // If fewer than 50% of sentences are unique, it's repetitive
      return uniqueSentences.size / sentences.length < 0.5;
    },
    points: -3,
    label: 'repetitive/padded content',
  },
];

// Base score: start at 5 (neutral), add/subtract from there, clamp to 0-10
const BASE_SCORE = 5;
const MIN_SCORE = 0;
const MAX_SCORE = 10;
const SIGNAL_THRESHOLD = 5;
const BORDERLINE_LOW = 3;

/**
 * Score a memory extraction candidate.
 *
 * @param content   The learning content to evaluate
 * @param context   Optional context string (e.g. "hook development")
 * @returns         ScoringResult with score, classification, confidence, reasons
 */
export function scoreExtraction(content: string, context?: string): ScoringResult {
  const reasons: string[] = [];
  let score = BASE_SCORE;

  // Empty content is always noise
  if (!content || content.trim().length === 0) {
    return {
      score: 0,
      confidence: 'low',
      classification: 'NOISE',
      reasons: ['empty content'],
    };
  }

  // Apply signal indicators
  for (const indicator of SIGNAL_INDICATORS) {
    if (indicator.test(content, context)) {
      score += indicator.points;
      reasons.push(`+${indicator.points}: ${indicator.label}`);
    }
  }

  // Apply noise indicators
  for (const indicator of NOISE_INDICATORS) {
    if (indicator.test(content, context)) {
      score += indicator.points; // points are negative
      reasons.push(`${indicator.points}: ${indicator.label}`);
    }
  }

  // Context bonus: having context means caller cared enough to provide it
  if (context && context.trim().length > 0) {
    score += 0.5;
    reasons.push('+0.5: context provided');
  }

  // Clamp to range
  score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));

  // Classify
  let classification: 'SIGNAL' | 'NOISE' | 'BORDERLINE';
  let confidence: 'high' | 'medium' | 'low';

  if (score >= SIGNAL_THRESHOLD) {
    classification = 'SIGNAL';
    confidence = 'high';
  } else if (score >= BORDERLINE_LOW) {
    classification = 'BORDERLINE';
    confidence = 'medium';
  } else {
    classification = 'NOISE';
    confidence = 'low';
  }

  return { score, confidence, classification, reasons };
}

/**
 * Convenience function: returns true if content scores at SIGNAL threshold.
 *
 * @param content  The learning content to evaluate
 * @returns        true if score >= SIGNAL_THRESHOLD (5)
 */
export function isSignal(content: string): boolean {
  return scoreExtraction(content).score >= SIGNAL_THRESHOLD;
}
