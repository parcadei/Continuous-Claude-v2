// src/pageindex-navigator.ts
import { readFileSync as readFileSync2 } from "fs";

// src/shared/navigator-state.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
var VALID_AGENTS = {
  RESEARCH: ["scout", "oracle", "pathfinder"],
  IMPLEMENTATION: ["kraken", "spark", "architect", "plan-agent", "strategic-refactorer"],
  DEBUGGING: ["debug-agent", "sleuth", "profiler", "spark", "aegis", "principal-debugger"],
  REFACTORING: ["phoenix", "spark", "strategic-refactorer", "kraken"],
  REVIEW: ["critic", "judge", "liaison", "surveyor", "principal-reviewer", "react-perf-reviewer", "ui-compliance-reviewer"],
  CASUAL: [],
  // No specific agents
  UNKNOWN: []
  // Allow any
};
var TASK_PATTERNS = {
  RESEARCH: [
    /\b(understand|explore|how does|what is|find|search|look for|where is)\b/i,
    /\b(explain|describe|show me|tell me about)\b/i
  ],
  IMPLEMENTATION: [
    /\b(build|create|implement|add|make|write|develop)\b/i,
    /\b(feature|component|function|module|api|endpoint)\b/i
  ],
  DEBUGGING: [
    /\b(fix|debug|broken|error|bug|crash|fail|issue)\b/i,
    /\b(not working|doesn't work|wrong|problem)\b/i
  ],
  REFACTORING: [
    /\b(refactor|clean|restructure|reorganize|simplify)\b/i,
    /\b(migrate|upgrade|modernize|improve)\b/i
  ],
  REVIEW: [
    /\b(review|audit|check|verify|validate|assess)\b/i,
    /\b(pr|pull request|code review)\b/i
  ],
  CASUAL: [
    /^(hello|hi|hey|thanks|thank you|ok|okay|sure|yes|no)[\s!?.]*$/i,
    /^(good morning|good afternoon|good evening)[\s!?.]*$/i
  ],
  UNKNOWN: []
};
var STATE_DIR = join(tmpdir(), "claude-navigator");
var STATE_FILE = "navigator-state.json";
function getStateFilePath(sessionId) {
  return join(STATE_DIR, `${sessionId}-${STATE_FILE}`);
}
function detectTaskType(prompt) {
  const normalized = prompt.trim().toLowerCase();
  for (const pattern of TASK_PATTERNS.CASUAL) {
    if (pattern.test(normalized)) {
      return "CASUAL";
    }
  }
  const scores = {
    RESEARCH: 0,
    IMPLEMENTATION: 0,
    DEBUGGING: 0,
    REFACTORING: 0,
    REVIEW: 0,
    CASUAL: 0,
    UNKNOWN: 0
  };
  for (const [taskType, patterns] of Object.entries(TASK_PATTERNS)) {
    if (taskType === "CASUAL" || taskType === "UNKNOWN") continue;
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        scores[taskType]++;
      }
    }
  }
  let maxScore = 0;
  let detectedType = "UNKNOWN";
  for (const [taskType, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = taskType;
    }
  }
  return maxScore > 0 ? detectedType : "UNKNOWN";
}
function extractQueryKeywords(prompt) {
  const stopWords = /* @__PURE__ */ new Set([
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
    "just",
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
    "it",
    "its",
    "this",
    "that",
    "these",
    "what",
    "which",
    "who",
    "and",
    "but",
    "if",
    "or",
    "because",
    "as",
    "until",
    "while",
    "about",
    "please",
    "help",
    "want",
    "need",
    "like",
    "let",
    "lets",
    "let's"
  ]);
  const words = prompt.toLowerCase().replace(/[^\w\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  return [...new Set(words)].slice(0, 8);
}
function loadState(sessionId) {
  const filePath = getStateFilePath(sessionId);
  try {
    if (existsSync(filePath)) {
      const data = readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch {
  }
  return {
    sessionId,
    detectedTaskType: "UNKNOWN",
    currentPromptKeywords: [],
    guidanceShown: {
      decisionTree: false,
      rulesShown: [],
      agentsShown: []
    },
    lastActivity: Date.now(),
    promptCount: 0
  };
}
function saveState(state) {
  const filePath = getStateFilePath(state.sessionId);
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    state.lastActivity = Date.now();
    writeFileSync(filePath, JSON.stringify(state, null, 2));
  } catch {
  }
}
function shouldAbbreviate(state, newTaskType) {
  if (state.promptCount === 0) return false;
  if (state.detectedTaskType !== newTaskType) return false;
  return state.guidanceShown.decisionTree;
}
function getSuggestedAgents(taskType) {
  return VALID_AGENTS[taskType] || [];
}
function markGuidanceShown(state, taskType, rulesShown = [], agentsShown = []) {
  state.detectedTaskType = taskType;
  state.guidanceShown.decisionTree = true;
  state.guidanceShown.rulesShown = [
    .../* @__PURE__ */ new Set([...state.guidanceShown.rulesShown, ...rulesShown])
  ];
  state.guidanceShown.agentsShown = [
    .../* @__PURE__ */ new Set([...state.guidanceShown.agentsShown, ...agentsShown])
  ];
  state.promptCount++;
}

// src/shared/pageindex-client.ts
import { spawnSync } from "child_process";

// src/shared/opc-path.ts
import { existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
function getOpcDir() {
  const envOpcDir = process.env.CLAUDE_OPC_DIR;
  if (envOpcDir && existsSync2(envOpcDir)) {
    return envOpcDir;
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const localOpc = join2(projectDir, "opc");
  if (existsSync2(localOpc)) {
    return localOpc;
  }
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (homeDir) {
    const globalClaude = join2(homeDir, ".claude");
    const globalScripts = join2(globalClaude, "scripts", "core");
    if (existsSync2(globalScripts) && globalClaude !== projectDir) {
      return globalClaude;
    }
  }
  return null;
}

// src/shared/pageindex-client.ts
var queryCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 5 * 60 * 1e3;
var cacheTimestamps = /* @__PURE__ */ new Map();
function queryPageIndex(query, docPath, options = {}) {
  const {
    maxResults = 3,
    timeoutMs = 3e3,
    useCache = true,
    docType
  } = options;
  const cacheKey = `${query}:${docPath || "all"}:${docType || "any"}:${maxResults}`;
  if (useCache) {
    const cached = queryCache.get(cacheKey);
    const timestamp = cacheTimestamps.get(cacheKey);
    if (cached && timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
      return cached;
    }
  }
  const opcDir = getOpcDir();
  if (!opcDir) {
    return [];
  }
  try {
    const args = [
      "run",
      "python",
      "-c",
      buildPythonScript(query, docPath, maxResults, docType)
    ];
    const result = spawnSync("uv", args, {
      encoding: "utf-8",
      cwd: opcDir,
      env: {
        ...process.env,
        PYTHONPATH: opcDir
      },
      timeout: timeoutMs,
      killSignal: "SIGKILL"
    });
    if (result.status !== 0 || !result.stdout) {
      return [];
    }
    const data = JSON.parse(result.stdout);
    const results = (data.results || []).map((r) => ({
      nodeId: r.node_id || "",
      title: r.title || "",
      text: r.text || "",
      lineNum: r.line_num,
      relevanceReason: r.relevance_reason || "",
      confidence: r.confidence || 0.5,
      docPath: r.doc_path || docPath || ""
    }));
    if (useCache) {
      queryCache.set(cacheKey, results);
      cacheTimestamps.set(cacheKey, Date.now());
    }
    return results;
  } catch (err) {
    return [];
  }
}
function buildPythonScript(query, docPath, maxResults, _docType) {
  const escapedQuery = query.replace(/'/g, "\\'").replace(/\n/g, " ");
  const escapedDocPath = docPath ? docPath.replace(/'/g, "\\'") : "";
  return `
import sys, json, os
sys.path.insert(0, '.')
from scripts.pageindex.fast_search import search_fts

project_path = os.getcwd()
results = search_fts(
    query='${escapedQuery}',
    project_path=project_path,
    doc_path='${escapedDocPath}' or None,
    max_results=${maxResults}
)
print(json.dumps({'results': [
    {'node_id': r.node_id, 'title': r.title, 'text': r.text[:500] if r.text else '',
     'line_num': r.line_num, 'relevance_reason': f'FTS match (score: {r.score:.3f})',
     'confidence': min(r.score, 1.0), 'doc_path': r.doc_path}
    for r in results
]}))
`;
}

// src/shared/output.ts
function outputContinue() {
  console.log(JSON.stringify({ result: "continue" }));
}

// src/pageindex-navigator.ts
var ARCHITECTURE_DOCS = {
  decisionTrees: ".claude/docs/architecture/DECISION-TREES.md",
  agentPicker: ".claude/docs/architecture/quick-ref/agent-picker.md",
  index: ".claude/docs/architecture/INDEX.md"
};
var DECISION_TREE_FALLBACK = {
  RESEARCH: `
  RESEARCH
    Know location? -> Read directly
    Internal code? -> scout
    External docs? -> oracle
    GitHub repos? -> pathfinder`,
  IMPLEMENTATION: `
  IMPLEMENTATION
    Simple fix (<50 loc)? -> spark
    Need tests (TDD)? -> kraken
    Need design first? -> architect -> kraken
    Full feature? -> /ralph workflow`,
  DEBUGGING: `
  DEBUGGING
    Know location? -> spark
    Need investigation? -> debug-agent
    Performance issue? -> profiler
    Multi-file bug? -> sleuth -> spark`,
  REFACTORING: `
  REFACTORING
    Single file? -> spark
    Architecture change? -> phoenix -> kraken
    Migration? -> phoenix + surveyor`,
  REVIEW: `
  REVIEW
    Feature code? -> critic
    Refactoring? -> judge
    API/integration? -> liaison
    Migration? -> surveyor`,
  CASUAL: "",
  UNKNOWN: ""
};
function readStdin() {
  return readFileSync2(0, "utf-8");
}
function isInfrastructureDir(projectDir) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (!homeDir) return false;
  const claudeDir = homeDir.replace(/\\/g, "/") + "/.claude";
  const normalizedProject = (projectDir || "").replace(/\\/g, "/");
  return normalizedProject === claudeDir || normalizedProject.endsWith("/.claude");
}
function queryDecisionTree(taskType, keywords) {
  if (taskType === "CASUAL" || taskType === "UNKNOWN") {
    return "";
  }
  const query = `${taskType.toLowerCase()} ${keywords.join(" ")}`;
  const results = queryPageIndex(query, ARCHITECTURE_DOCS.decisionTrees, {
    maxResults: 2,
    timeoutMs: 2e3
  });
  if (results.length > 0) {
    const lines = results.map(
      (r) => `  ${r.title}: ${r.relevanceReason}`
    );
    return `${taskType}
${lines.join("\n")}`;
  }
  return DECISION_TREE_FALLBACK[taskType] || "";
}
function queryRelevantRules(taskType, keywords) {
  const ruleQueries = {
    RESEARCH: "research exploration claim verification",
    IMPLEMENTATION: "code quality implementation testing",
    DEBUGGING: "debugging claim verification error",
    REFACTORING: "refactoring code quality",
    REVIEW: "review verification code quality",
    CASUAL: "",
    UNKNOWN: keywords.join(" ")
  };
  const baseQuery = ruleQueries[taskType] || "";
  const query = `${baseQuery} ${keywords.slice(0, 3).join(" ")}`.trim();
  if (!query) return [];
  return queryPageIndex(query, null, {
    maxResults: 2,
    docType: "DOCUMENTATION",
    // Rules are indexed as documentation
    timeoutMs: 2e3
  });
}
function queryAgentGuidance(taskType, keywords) {
  if (taskType === "CASUAL") return [];
  const query = `${taskType.toLowerCase()} agent ${keywords.slice(0, 2).join(" ")}`;
  const results = queryPageIndex(query, ARCHITECTURE_DOCS.agentPicker, {
    maxResults: 3,
    timeoutMs: 2e3
  });
  if (results.length > 0) {
    return results.map((r) => r.title);
  }
  return getSuggestedAgents(taskType);
}
function formatGuidance(taskType, decisionTree, rules, agents, abbreviated) {
  const lines = [];
  lines.push("");
  lines.push("NAVIGATOR");
  lines.push("");
  lines.push(`**Task Type:** ${taskType}`);
  if (decisionTree && !abbreviated) {
    lines.push("");
    lines.push("**Decision Tree:**");
    for (const line of decisionTree.split("\n")) {
      if (line.trim()) {
        lines.push(`  ${line.trim()}`);
      }
    }
  }
  if (rules.length > 0) {
    lines.push("");
    lines.push("**Relevant Rules:**");
    for (const rule of rules) {
      const ruleName = rule.docPath?.split("/").pop()?.replace(".md", "") || rule.title;
      lines.push(`  - ${ruleName}: ${rule.relevanceReason || rule.title}`);
    }
  }
  if (agents.length > 0 && taskType !== "CASUAL") {
    lines.push("");
    lines.push("**Suggested Agents:**");
    lines.push(`  ${agents.slice(0, 4).join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
function formatMinimalGuidance() {
  return "\nNAVIGATOR: No specific task detected.\n";
}
async function main() {
  const input = JSON.parse(readStdin());
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  if (isInfrastructureDir(projectDir)) {
    outputContinue();
    return;
  }
  if (process.env.CLAUDE_AGENT_ID) {
    outputContinue();
    return;
  }
  if (input.prompt.trim().startsWith("/")) {
    outputContinue();
    return;
  }
  const state = loadState(input.session_id);
  const taskType = detectTaskType(input.prompt);
  const keywords = extractQueryKeywords(input.prompt);
  const abbreviated = shouldAbbreviate(state, taskType);
  let guidance;
  if (taskType === "CASUAL") {
    guidance = formatMinimalGuidance();
  } else {
    const decisionTree = queryDecisionTree(taskType, keywords);
    const rules = queryRelevantRules(taskType, keywords);
    const agents = queryAgentGuidance(taskType, keywords);
    guidance = formatGuidance(
      taskType,
      decisionTree,
      rules,
      agents,
      abbreviated
    );
    markGuidanceShown(
      state,
      taskType,
      rules.map((r) => r.docPath || r.title),
      agents
    );
  }
  state.currentPromptKeywords = keywords;
  saveState(state);
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: guidance
    }
  }));
}
main().catch(() => {
  outputContinue();
});
