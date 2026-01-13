/**
 * Memory Awareness Hook (UserPromptSubmit)
 *
 * Checks if user prompt is similar to stored learnings.
 * Shows hint to BOTH user (visible) AND Claude (system context).
 *
 * Flow:
 * 1. Extract INTENT from user prompt (not just keywords)
 * 2. Semantic search using hybrid RRF (text + vector)
 * 3. If score > threshold, show visible hint with top learning preview
 * 4. Claude proactively discloses and acts on relevant memories
 */

import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { getOpcDir } from './shared/opc-path.js';

interface UserPromptSubmitInput {
  session_id: string;
  hook_event_name: string;
  prompt: string;
  cwd: string;
}

interface LearningResult {
  id: string;
  type: string;
  content: string;
  score: number;
}

interface MemoryMatch {
  count: number;
  results: LearningResult[];
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

/**
 * Extract the INTENT from user prompt - what they're actually asking about.
 * Removes meta-language ("can you", "help me", "recall") to get core topic.
 */
function extractIntent(prompt: string): string {
  // Meta-phrases to remove (these describe HOW, not WHAT)
  const metaPhrases = [
    /^(can you|could you|would you|please|help me|i want to|i need to|let's|lets)\s+/gi,
    /^(show me|tell me|find|search for|look for|recall|remember)\s+/gi,
    /^(how do i|how can i|how to|what is|what are|where is|where are)\s+/gi,
    /\s+(for me|please|thanks|thank you)$/gi,
    /\?$/g,
  ];

  let intent = prompt.trim();

  // Strip meta-phrases iteratively
  for (const pattern of metaPhrases) {
    intent = intent.replace(pattern, '');
  }

  intent = intent.trim();

  // If we stripped too much, fall back to keyword extraction
  if (intent.length < 5) {
    return extractKeywords(prompt);
  }

  return intent;
}

/**
 * Extract meaningful keywords from prompt (fallback for very short intents).
 */
function extractKeywords(prompt: string): string {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    's', 't', 'just', 'don', 'now', 'i', 'me', 'my', 'you', 'your', 'we', 'help', 'with',
    'our', 'they', 'them', 'their', 'it', 'its', 'this', 'that', 'these',
    'what', 'which', 'who', 'whom', 'and', 'but', 'if', 'or', 'because',
    'until', 'while', 'about', 'against', 'also', 'get', 'got', 'make',
    'want', 'need', 'look', 'see', 'use', 'like', 'know', 'think', 'take',
    'come', 'go', 'say', 'said', 'tell', 'please', 'help', 'let', 'sure',
    'recall', 'remember', 'similar', 'problems', 'issues'
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)].slice(0, 5).join(' ');
}

/**
 * Fast memory relevance check using text search.
 * For text-only mode, we search by the most significant keyword
 * (text ILIKE looks for substring match, not multi-word).
 */
function checkMemoryRelevance(intent: string, projectDir: string): MemoryMatch | null {
  if (!intent || intent.length < 3) return null;

  const opcDir = getOpcDir();
  if (!opcDir) return null;  // Graceful degradation if OPC not available

  // PostgreSQL full-text search handles stopwords automatically via plainto_tsquery
  // Just clean up the intent: remove paths, underscores, short words
  const searchTerm = intent
    .replace(/[_\/]/g, ' ')           // Convert underscores/slashes to spaces
    .replace(/\b\w{1,2}\b/g, '')      // Remove 1-2 char words
    .replace(/\s+/g, ' ')             // Collapse whitespace
    .trim();

  // Use text-only for fast checking (< 1s), user can run /recall for semantic
  const result = spawnSync('uv', [
    'run', 'python', 'scripts/core/recall_learnings.py',
    '--query', searchTerm,  // Single keyword for text match
    '--k', '3',
    '--json',
    '--text-only'  // Fast text search for hints
  ], {
    encoding: 'utf-8',
    cwd: opcDir,
    env: {
      ...process.env,
      PYTHONPATH: opcDir
    },
    timeout: 5000  // 5s timeout for fast check
  });

  if (result.status !== 0 || !result.stdout) {
    return null;
  }

  try {
    const data = JSON.parse(result.stdout);

    if (!data.results || data.results.length === 0) {
      return null;
    }

    // ts_rank returns small values (0.0001-0.1), ILIKE fallback returns 0.1
    // Any match from FTS is relevant enough to show

    // Extract structured results with better previews
    const results: LearningResult[] = data.results.slice(0, 3).map((r: any) => {
      const content = r.content || '';
      // Get first meaningful line up to 120 chars
      const preview = content
        .split('\n')
        .filter((l: string) => l.trim().length > 0)
        .map((l: string) => l.trim())
        .join(' ')
        .slice(0, 120);

      return {
        id: (r.id || 'unknown').slice(0, 8),
        type: r.learning_type || r.type || 'UNKNOWN',
        content: preview + (content.length > 120 ? '...' : ''),
        score: r.score || 0
      };
    });

    return {
      count: data.results.length,
      results
    };
  } catch {
    return null;
  }
}

async function main() {
  let input: UserPromptSubmitInput | null = null;
  try {
    input = JSON.parse(readStdin());
  } catch {
    // Invalid JSON input, skip hook
    return;
  }

  // Validate input has required fields
  if (!input || typeof input.prompt !== 'string') {
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;

  // Skip for subagents - they don't need memory recall (saves tokens)
  if (process.env.CLAUDE_AGENT_ID) {
    return;
  }

  // Skip very short prompts (greetings, commands)
  if (input.prompt.length < 15) {
    return;
  }

  // Skip if prompt is just a slash command
  if (input.prompt.trim().startsWith('/')) {
    return;
  }

  // Extract intent (semantic query, not just keywords)
  const intent = extractIntent(input.prompt);

  // Skip if no meaningful intent
  if (intent.length < 3) {
    return;
  }

  // Check memory relevance using semantic search
  const match = checkMemoryRelevance(intent, projectDir);

  if (match) {
    // Build structured context for Claude
    const resultLines = match.results.map((r, i) =>
      `${i + 1}. [${r.type}] ${r.content} (id: ${r.id})`
    ).join('\n');

    const claudeContext = `MEMORY MATCH (${match.count} results) for "${intent}":\n${resultLines}\nUse /recall "${intent}" for full content. Disclose if helpful.`;

    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: claudeContext
      }
    }));
  }
}

main().catch((err) => {
  // Log error but don't block user prompts
  console.error(`[memory-awareness] Error: ${err}`);
});
