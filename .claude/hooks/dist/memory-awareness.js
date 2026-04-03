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
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { join } from "path";
function readStdin() {
  return readFileSync(0, "utf-8");
}
/**
 * Extract the INTENT from user prompt - what they're actually asking about.
 * Removes meta-language ("can you", "help me", "recall") to get core topic.
 */
function extractIntent(prompt) {
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
    intent = intent.replace(pattern, "");
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
function extractKeywords(prompt) {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "s",
    "t",
    "just",
    "don",
    "now",
    "i",
    "me",
    "my",
    "you",
    "your",
    "we",
    "our",
    "they",
    "them",
    "their",
    "it",
    "its",
    "this",
    "that",
    "these",
    "what",
    "which",
    "who",
    "whom",
    "and",
    "but",
    "if",
    "or",
    "because",
    "until",
    "while",
    "about",
    "against",
    "also",
    "get",
    "got",
    "make",
    "want",
    "need",
    "look",
    "see",
    "use",
    "like",
    "know",
    "think",
    "take",
    "come",
    "go",
    "say",
    "said",
    "tell",
    "please",
    "help",
    "let",
    "sure",
    "recall",
    "remember",
    "similar",
    "problems",
    "issues",
  ]);
  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 5).join(" ");
}
/**
 * Fast memory relevance check using text search.
 * For text-only mode, we search by the most significant keyword
 * (text ILIKE looks for substring match, not multi-word).
 */
function checkMemoryRelevance(intent, projectDir) {
  if (!intent || intent.length < 3) return null;
  const opcDir = join(projectDir, "opc");
  // For text search, use first significant keyword (ILIKE needs substring)
  const keywords = intent
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const searchTerm = keywords[0] || intent.split(/\s+/)[0];
  // Use text-only for fast checking (< 1s), user can run /recall for semantic
  const result = spawnSync(
    "uv",
    [
      "run",
      "python",
      "scripts/recall_learnings.py",
      "--query",
      searchTerm, // Single keyword for text match
      "--k",
      "3",
      "--json",
      "--text-only", // Fast text search for hints
    ],
    {
      encoding: "utf-8",
      cwd: opcDir,
      env: {
        ...process.env,
        PYTHONPATH: opcDir,
      },
      timeout: 5000, // 5s timeout for fast check
    },
  );
  if (result.status !== 0 || !result.stdout) {
    return null;
  }
  try {
    const data = JSON.parse(result.stdout);
    if (!data.results || data.results.length === 0) {
      return null;
    }
    const topResult = data.results[0];
    const score = topResult.score || 0;
    // Text-only search returns 0.5 for any match
    if (score < 0.3) {
      return null;
    }
    // Extract a short preview from the content
    const content = topResult.content || "";
    const preview = content
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .slice(0, 2)
      .join(" ")
      .slice(0, 100);
    return {
      count: data.results.length,
      topScore: score,
      topSession: topResult.session_id || "unknown",
      topPreview: preview,
    };
  } catch {
    return null;
  }
}
async function main() {
  const input = JSON.parse(readStdin());
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
  if (input.prompt.trim().startsWith("/")) {
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
    // Claude-only context (user doesn't see this, Claude decides whether to disclose)
    const claudeContext = `MEMORY MATCH: Found ${match.count} learnings for "${intent}". Preview: "${match.topPreview}". Use if relevant, disclose if helpful.`;
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: claudeContext,
        },
      }),
    );
  }
}
main().catch(() => {
  // Silent fail - don't block user prompts
});
