#!/usr/bin/env node

// src/skill-activation-prompt.ts
import { readFileSync as readFileSync4, existsSync as existsSync4 } from "fs";
import { join as join4 } from "path";
import { spawnSync } from "child_process";
import { tmpdir as tmpdir2 } from "os";

// src/shared/resource-reader.ts
import { readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
var DEFAULT_RESOURCE_STATE = {
  freeMemMB: 4096,
  activeAgents: 0,
  maxAgents: 10,
  contextPct: 0
};
function getSessionId() {
  return process.env.CLAUDE_SESSION_ID || String(process.ppid || process.pid);
}
function getResourceFilePath(sessionId) {
  return join(tmpdir(), `claude-resources-${sessionId}.json`);
}
function readResourceState() {
  const sessionId = getSessionId();
  const resourceFile = getResourceFilePath(sessionId);
  if (!existsSync(resourceFile)) {
    return null;
  }
  try {
    const content = readFileSync(resourceFile, "utf-8");
    const data = JSON.parse(content);
    return {
      freeMemMB: typeof data.freeMemMB === "number" ? data.freeMemMB : DEFAULT_RESOURCE_STATE.freeMemMB,
      activeAgents: typeof data.activeAgents === "number" ? data.activeAgents : DEFAULT_RESOURCE_STATE.activeAgents,
      maxAgents: typeof data.maxAgents === "number" ? data.maxAgents : DEFAULT_RESOURCE_STATE.maxAgents,
      contextPct: typeof data.contextPct === "number" ? data.contextPct : DEFAULT_RESOURCE_STATE.contextPct
    };
  } catch {
    return null;
  }
}

// src/shared/output.ts
function outputContinue() {
  console.log(JSON.stringify({ result: "continue" }));
}
function outputWithMessage(message) {
  console.log(JSON.stringify({ result: "continue", message }));
}

// src/shared/session-activity.ts
import { existsSync as existsSync2, mkdirSync, readFileSync as readFileSync2, writeFileSync } from "fs";
import { join as join2 } from "path";
function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE || "/tmp";
}
function getActivityPath(sessionId) {
  const dir = join2(getHomeDir(), ".claude", "cache", "session-activity");
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
  }
  return join2(dir, `${sessionId}.json`);
}
function readActivity(sessionId) {
  const filePath = getActivityPath(sessionId);
  try {
    if (!existsSync2(filePath)) {
      return null;
    }
    const raw = readFileSync2(filePath, "utf-8");
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function loadOrCreate(sessionId) {
  const existing = readActivity(sessionId);
  if (existing) {
    return existing;
  }
  return {
    session_id: sessionId,
    started_at: (/* @__PURE__ */ new Date()).toISOString(),
    skills: [],
    hooks: []
  };
}
function upsertEntry(entries, name) {
  const existing = entries.find((e) => e.name === name);
  if (existing) {
    existing.count++;
  } else {
    entries.push({
      name,
      first_seen: (/* @__PURE__ */ new Date()).toISOString(),
      count: 1
    });
  }
}
function logHook(sessionId, hookName) {
  const activity = loadOrCreate(sessionId);
  upsertEntry(activity.hooks, hookName);
  const filePath = getActivityPath(sessionId);
  writeFileSync(filePath, JSON.stringify(activity), { encoding: "utf-8" });
}

// src/skill-validation-prompt.ts
var AMBIGUOUS_KEYWORDS = /* @__PURE__ */ new Set([
  "commit",
  "push",
  "pull",
  "merge",
  "branch",
  "checkout",
  "debug",
  "build",
  "implement",
  "plan",
  "research",
  "deploy",
  "release",
  "fix",
  "test",
  "validate",
  "review",
  "analyze",
  "document",
  "refactor",
  "optimize"
]);
var SPECIFIC_TECHNICAL_TERMS = /* @__PURE__ */ new Set([
  "sympy",
  "braintrust",
  "perplexity",
  "agentica",
  "firecrawl",
  "qlty",
  "repoprompt",
  "ast-grep",
  "morph",
  "ragie",
  "lean4",
  "mathlib",
  "z3",
  "shapely",
  "pint"
]);
var TECHNICAL_CONTEXT_INDICATORS = {
  commit: ["git", "changes", "files", "message", "push", "repository", "branch", "staged"],
  push: ["git", "remote", "origin", "branch", "repository", "upstream"],
  pull: ["git", "remote", "origin", "branch", "merge", "rebase", "request"],
  merge: ["git", "branch", "conflict", "pull request", "pr"],
  branch: ["git", "checkout", "create", "switch", "feature"],
  checkout: ["git", "branch", "file", "commit", "HEAD"],
  debug: ["error", "bug", "issue", "logs", "stack trace", "exception", "crash", "breakpoint"],
  build: ["npm", "yarn", "cargo", "make", "compile", "webpack", "bundle", "project"],
  implement: ["code", "feature", "function", "class", "method", "api", "interface", "module"],
  plan: ["implementation", "phase", "architecture", "design", "roadmap", "milestone"],
  research: ["api", "library", "documentation", "docs", "best practices", "pattern", "codebase"],
  deploy: ["server", "production", "staging", "kubernetes", "docker", "cloud", "ci/cd"],
  release: ["version", "tag", "changelog", "npm", "package", "publish"],
  fix: ["bug", "error", "issue", "broken", "failing", "test", "regression"],
  test: ["unit", "integration", "e2e", "coverage", "spec", "jest", "pytest", "vitest"],
  validate: ["input", "schema", "data", "form", "field", "type"],
  review: ["code", "pr", "pull request", "changes", "diff"],
  analyze: ["code", "codebase", "performance", "metrics", "logs"],
  document: ["api", "readme", "docs", "jsdoc", "docstring", "comments"],
  refactor: ["code", "function", "class", "module", "clean up", "simplify"],
  optimize: ["performance", "speed", "memory", "query", "algorithm"]
};
function shouldValidateWithLLM(match) {
  if (match.matchType === "explicit") {
    return false;
  }
  if (match.enforcement === "block") {
    return false;
  }
  if (match.matchType === "intent") {
    return false;
  }
  const termLower = match.matchedTerm.toLowerCase();
  if (SPECIFIC_TECHNICAL_TERMS.has(termLower)) {
    return false;
  }
  if (match.matchType === "keyword" && AMBIGUOUS_KEYWORDS.has(termLower)) {
    const promptLower = match.prompt.toLowerCase();
    const technicalIndicators = TECHNICAL_CONTEXT_INDICATORS[termLower] || [];
    for (const indicator of technicalIndicators) {
      const regex = new RegExp(`\\b${indicator.toLowerCase()}\\b`);
      if (regex.test(promptLower)) {
        return false;
      }
    }
    return true;
  }
  return false;
}

// src/skill-router.ts
import { readFileSync as readFileSync3, existsSync as existsSync3, readdirSync, statSync } from "fs";
import { join as join3 } from "path";

// src/shared/skill-router-types.ts
var CircularDependencyError = class extends Error {
  constructor(cyclePath) {
    super(`Circular dependency detected: ${cyclePath.join(" -> ")}`);
    this.cyclePath = cyclePath;
    this.name = "CircularDependencyError";
  }
};

// src/skill-router.ts
var PROMPT_WEIGHTS = {
  multiple_files: 0.2,
  task_conjunctions: 0.15,
  uncertainty_markers: 0.1,
  architecture_keywords: 0.3,
  debug_intermittent: 0.25,
  new_project_intent: 0.35
};
var FILE_WEIGHTS = {
  imports_over_10: 0.15,
  cross_module: 0.2,
  test_files: 0.1,
  config_files: 0.15
};
var COMPLEXITY_THRESHOLD_SUGGEST = 0.5;
var COMPLEXITY_THRESHOLD_FORCE = 0.7;
var AGENT_TYPES = {
  scout: "exploration",
  oracle: "research",
  architect: "planning",
  phoenix: "refactoring",
  kraken: "implementation",
  spark: "quick-fix",
  arbiter: "testing",
  atlas: "e2e-testing",
  critic: "review",
  judge: "review",
  surveyor: "review",
  liaison: "integration",
  sleuth: "debugging",
  "debug-agent": "debugging",
  aegis: "security",
  profiler: "performance",
  herald: "release",
  scribe: "documentation",
  maestro: "orchestration"
};
function loadSkillRules() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const rulesPath = join3(homeDir, ".claude", "skills", "skill-rules.json");
  if (!existsSync3(rulesPath)) {
    return { skills: {}, agents: {} };
  }
  try {
    const content = readFileSync3(rulesPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return { skills: {}, agents: {} };
  }
}
function detectCircularDependency(skillName, rules) {
  const visited = /* @__PURE__ */ new Set();
  function dfs(current, path, pathSet) {
    if (pathSet.has(current)) {
      const cycleStart = path.indexOf(current);
      return path.slice(cycleStart).concat(current);
    }
    if (visited.has(current)) {
      return null;
    }
    path.push(current);
    pathSet.add(current);
    visited.add(current);
    const skill = rules.skills[current];
    if (skill?.prerequisites) {
      const neighbors = [
        ...skill.prerequisites.suggest || [],
        ...skill.prerequisites.require || []
      ];
      for (const neighbor of neighbors) {
        const result = dfs(neighbor, path, pathSet);
        if (result !== null) {
          return result;
        }
      }
    }
    path.pop();
    pathSet.delete(current);
    return null;
  }
  return dfs(skillName, [], /* @__PURE__ */ new Set());
}
function topologicalSort(skillName, rules) {
  const reachable = /* @__PURE__ */ new Set();
  const queue = [skillName];
  while (queue.length > 0) {
    const current = queue.shift();
    if (reachable.has(current)) continue;
    reachable.add(current);
    const skill = rules.skills[current];
    if (skill?.prerequisites) {
      const deps = [
        ...skill.prerequisites.suggest || [],
        ...skill.prerequisites.require || []
      ];
      for (const dep of deps) {
        queue.push(dep);
      }
    }
  }
  const inDegree = /* @__PURE__ */ new Map();
  const adjList = /* @__PURE__ */ new Map();
  for (const node of reachable) {
    inDegree.set(node, 0);
    adjList.set(node, []);
  }
  for (const node of reachable) {
    const skill = rules.skills[node];
    if (skill?.prerequisites) {
      const deps = [
        ...skill.prerequisites.suggest || [],
        ...skill.prerequisites.require || []
      ];
      for (const dep of deps) {
        if (reachable.has(dep)) {
          adjList.get(dep).push(node);
          inDegree.set(node, (inDegree.get(node) || 0) + 1);
        }
      }
    }
  }
  const sorted = [];
  const kahnQueue = Array.from(reachable).filter((n) => inDegree.get(n) === 0).sort();
  while (kahnQueue.length > 0) {
    const current = kahnQueue.shift();
    sorted.push(current);
    for (const dependent of adjList.get(current) || []) {
      const newDegree = (inDegree.get(dependent) || 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) {
        const insertIdx = kahnQueue.findIndex((q) => q > dependent);
        if (insertIdx === -1) {
          kahnQueue.push(dependent);
        } else {
          kahnQueue.splice(insertIdx, 0, dependent);
        }
      }
    }
  }
  if (sorted.length !== reachable.size) {
    const remaining = Array.from(reachable).filter((n) => !sorted.includes(n));
    const cyclePath = detectCircularDependency(remaining[0], rules) || remaining;
    throw new CircularDependencyError(cyclePath);
  }
  return sorted;
}
function getLoadingMode(skillName, rules) {
  const skill = rules.skills[skillName];
  if (!skill) return "lazy";
  const mode = skill.loading;
  if (!mode) return "lazy";
  const validModes = ["lazy", "eager", "eager-prerequisites"];
  if (!validModes.includes(mode)) {
    console.warn(`Skill "${skillName}" has invalid loading mode "${mode}", defaulting to lazy`);
    return "lazy";
  }
  return mode;
}
function resolveCoActivation(skillName, rules) {
  const skill = rules.skills[skillName];
  if (!skill?.coActivate) {
    return { peers: [], mode: "any" };
  }
  const peers = skill.coActivate.filter((peer) => peer !== skillName);
  for (const peer of peers) {
    if (!rules.skills[peer]) {
      console.warn(`Skill "${skillName}" co-activates non-existent peer "${peer}"`);
    }
  }
  const mode = skill.coActivateMode || "any";
  return { peers, mode };
}
function resolvePrerequisites(skillName, rules) {
  const skill = rules.skills[skillName];
  const suggest = skill?.prerequisites?.suggest || [];
  const require2 = skill?.prerequisites?.require || [];
  const loadOrder = topologicalSort(skillName, rules);
  return { suggest, require: require2, loadOrder };
}
function buildEnhancedLookupResult(baseMatch, rules) {
  const prerequisites = resolvePrerequisites(baseMatch.skillName, rules);
  const coActivation = resolveCoActivation(baseMatch.skillName, rules);
  const loading = getLoadingMode(baseMatch.skillName, rules);
  return {
    found: true,
    skillName: baseMatch.skillName,
    confidence: baseMatch.priorityValue / 3,
    source: baseMatch.source,
    prerequisites,
    coActivation,
    loading
  };
}
function extractPromptSignals(task, context = "") {
  const signals = [];
  const combined = `${task} ${context}`.toLowerCase();
  const filePattern = /[\w/\\]+\.\w{2,4}/g;
  const filesFound = combined.match(filePattern) || [];
  signals.push({
    name: "multiple_files",
    weight: filesFound.length > 1 ? PROMPT_WEIGHTS.multiple_files : 0,
    detected: filesFound.length > 1,
    detail: filesFound.length > 1 ? `Found ${filesFound.length} file references` : ""
  });
  const conjunctions = ["and also", "and then", "then also", ", and ", " also "];
  const conjunctionCount = conjunctions.filter((c) => combined.includes(c)).length;
  signals.push({
    name: "task_conjunctions",
    weight: Math.min(PROMPT_WEIGHTS.task_conjunctions * conjunctionCount, 0.45),
    detected: conjunctionCount > 0,
    detail: conjunctionCount > 0 ? `Found ${conjunctionCount} task conjunctions` : ""
  });
  const uncertainty = ["how", "should i", "what's the best way", "which approach", "is it better"];
  const hasUncertainty = uncertainty.some((u) => combined.includes(u));
  signals.push({
    name: "uncertainty_markers",
    weight: hasUncertainty ? PROMPT_WEIGHTS.uncertainty_markers : 0,
    detected: hasUncertainty,
    detail: hasUncertainty ? "Question/uncertainty detected" : ""
  });
  const archKeywords = ["refactor", "migrate", "redesign", "restructure", "architect", "overhaul"];
  const archFound = archKeywords.filter((k) => combined.includes(k));
  signals.push({
    name: "architecture_keywords",
    weight: archFound.length > 0 ? PROMPT_WEIGHTS.architecture_keywords : 0,
    detected: archFound.length > 0,
    detail: archFound.length > 0 ? `Architecture keywords: ${archFound.join(", ")}` : ""
  });
  const debugKeywords = ["debug", "fix", "bug", "error", "issue"];
  const intermittent = ["intermittent", "sometimes", "random", "sporadic", "occasional", "flaky"];
  const hasDebug = debugKeywords.some((d) => combined.includes(d));
  const hasIntermittent = intermittent.some((i) => combined.includes(i));
  signals.push({
    name: "debug_intermittent",
    weight: hasDebug && hasIntermittent ? PROMPT_WEIGHTS.debug_intermittent : 0,
    detected: hasDebug && hasIntermittent,
    detail: hasDebug && hasIntermittent ? "Debug + intermittent pattern detected" : ""
  });
  const newKeywords = ["build", "create", "new", "implement", "add feature", "develop"];
  const scratchKeywords = ["from scratch", "new project", "new app", "new feature", "greenfield"];
  const hasNew = newKeywords.some((n) => combined.includes(n));
  const hasScratch = scratchKeywords.some((s) => combined.includes(s));
  signals.push({
    name: "new_project_intent",
    weight: hasNew && hasScratch ? PROMPT_WEIGHTS.new_project_intent : 0,
    detected: hasNew && hasScratch,
    detail: hasNew && hasScratch ? "New project/feature intent detected" : ""
  });
  return signals;
}
function extractFileSignals(files, cwd = "") {
  const signals = [];
  if (!files || files.length === 0) {
    return signals;
  }
  const dirs = /* @__PURE__ */ new Set();
  for (const f of files) {
    const parts = f.split(/[/\\]/);
    if (parts.length > 1) {
      dirs.add(parts.slice(0, -1).join("/"));
    }
  }
  const crossModule = dirs.size > 1;
  signals.push({
    name: "cross_module",
    weight: crossModule ? FILE_WEIGHTS.cross_module : 0,
    value: dirs.size
  });
  const testPatterns = [".test.", ".spec.", "_test.", "_spec.", "test_", "tests/"];
  const testFiles = files.filter(
    (f) => testPatterns.some((p) => f.toLowerCase().includes(p))
  );
  signals.push({
    name: "test_files",
    weight: testFiles.length > 0 ? FILE_WEIGHTS.test_files : 0,
    value: testFiles.length
  });
  const configPatterns = ["package.json", "tsconfig", "pyproject.toml", "setup.py", ".env", "config"];
  const configFiles = files.filter(
    (f) => configPatterns.some((p) => f.toLowerCase().includes(p))
  );
  signals.push({
    name: "config_files",
    weight: configFiles.length > 0 ? FILE_WEIGHTS.config_files : 0,
    value: configFiles.length
  });
  signals.push({
    name: "imports_over_10",
    weight: 0,
    value: 0
  });
  return signals;
}
function calculateComplexity(task, context, files, cwd = "") {
  const promptSignals = extractPromptSignals(task, context);
  const fileSignals = extractFileSignals(files, cwd);
  const promptScore = promptSignals.filter((s) => s.detected).reduce((sum, s) => sum + s.weight, 0);
  const fileScore = fileSignals.filter((s) => s.weight > 0).reduce((sum, s) => sum + s.weight, 0);
  const total = Math.min(promptScore + fileScore, 1);
  let action = "proceed";
  if (total >= COMPLEXITY_THRESHOLD_FORCE) {
    action = "force_maestro";
  } else if (total >= COMPLEXITY_THRESHOLD_SUGGEST) {
    action = "suggest_maestro";
  }
  return {
    total,
    prompt_score: promptScore,
    file_score: fileScore,
    prompt_signals: promptSignals,
    file_signals: fileSignals,
    action
  };
}
function calculateGreenfieldScore(task, context, cwd = "") {
  let score = 0;
  const combined = `${task} ${context}`.toLowerCase();
  const newKeywords = ["build", "create", "new", "implement", "start", "init"];
  if (newKeywords.some((k) => combined.includes(k))) {
    score += 0.15;
  }
  const scratchKeywords = ["from scratch", "new project", "greenfield", "new app"];
  if (scratchKeywords.some((k) => combined.includes(k))) {
    score += 0.2;
  }
  if (cwd && existsSync3(cwd)) {
    if (!existsSync3(join3(cwd, ".git"))) {
      score += 0.1;
    }
    if (!existsSync3(join3(cwd, "package.json")) && !existsSync3(join3(cwd, "pyproject.toml"))) {
      score += 0.1;
    }
    try {
      const entries = readdirSync(cwd);
      const fileCount = entries.filter((e) => {
        try {
          return statSync(join3(cwd, e)).isFile();
        } catch {
          return false;
        }
      }).length;
      if (fileCount < 5) {
        score += 0.1;
      }
    } catch {
    }
  }
  return Math.min(score, 1);
}
function matchSkills(task, context, rules) {
  const matches = [];
  const combined = `${task} ${context}`.toLowerCase();
  const skills = rules.skills || {};
  for (const [skillName, config] of Object.entries(skills)) {
    const triggers = config.promptTriggers;
    if (!triggers) continue;
    const keywords = triggers.keywords || [];
    let matchedKeyword = null;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        matchedKeyword = kw;
        break;
      }
    }
    const intentPatterns = triggers.intentPatterns || [];
    let matchedIntent = false;
    for (const pattern of intentPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(combined)) {
          matchedIntent = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (matchedKeyword || matchedIntent) {
      const matchType = matchedIntent ? "intent" : "keyword";
      const confidence = matchedIntent ? 0.9 : 0.75;
      matches.push({
        name: skillName,
        enforcement: config.enforcement || "suggest",
        priority: config.priority || "medium",
        confidence,
        reason: `${matchedIntent ? "Intent pattern" : "Keyword"} match: ${matchedKeyword || "pattern"}`,
        match_type: matchType
      });
    }
  }
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  matches.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 4;
    const pb = priorityOrder[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;
    return b.confidence - a.confidence;
  });
  return matches;
}
function matchAgents(task, context, rules, exclude = []) {
  const matches = [];
  const combined = `${task} ${context}`.toLowerCase();
  const agents = rules.agents || {};
  for (const [agentName, config] of Object.entries(agents)) {
    if (exclude.includes(agentName)) continue;
    const triggers = config.promptTriggers;
    if (!triggers) continue;
    const keywords = triggers.keywords || [];
    let matchedKeyword = null;
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        matchedKeyword = kw;
        break;
      }
    }
    const intentPatterns = triggers.intentPatterns || [];
    let matchedIntent = false;
    for (const pattern of intentPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(combined)) {
          matchedIntent = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (matchedKeyword || matchedIntent) {
      const confidence = matchedIntent ? 0.85 : 0.7;
      matches.push({
        name: agentName,
        type: AGENT_TYPES[agentName] || config.type || "general",
        confidence,
        reason: `${matchedIntent ? "Intent pattern" : "Keyword"} match`
      });
    }
  }
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches;
}
function recommendPattern(task, context, skills, complexity) {
  const combined = `${task} ${context}`.toLowerCase();
  if (["research", "find", "explore", "understand", "analyze"].some((k) => combined.includes(k))) {
    if (["multiple", "compare", "different"].some((k) => combined.includes(k))) {
      return "swarm";
    }
    return "hierarchical";
  }
  if (["implement", "build", "create", "add"].some((k) => combined.includes(k))) {
    if (complexity >= 0.7) {
      return "pipeline";
    }
    return "hierarchical";
  }
  if (["debug", "fix", "investigate", "root cause"].some((k) => combined.includes(k))) {
    return "hierarchical";
  }
  if (["review", "validate", "check", "audit"].some((k) => combined.includes(k))) {
    if (combined.includes("critical") || combined.includes("security")) {
      return "jury";
    }
    return "generator_critic";
  }
  if (["refactor", "migrate", "upgrade"].some((k) => combined.includes(k))) {
    return "pipeline";
  }
  if (complexity >= 0.7) {
    return "hierarchical";
  }
  return null;
}
function route(input) {
  const {
    task,
    context = "",
    files = [],
    current_pattern,
    exclude_agents = [],
    cwd = ""
  } = input;
  const rules = loadSkillRules();
  const complexity = calculateComplexity(task, context, files, cwd);
  const greenfield = calculateGreenfieldScore(task, context, cwd);
  const skills = matchSkills(task, context, rules);
  const agents = matchAgents(task, context, rules, exclude_agents);
  const pattern = current_pattern || recommendPattern(task, context, skills, complexity.total);
  const suggestRalph = greenfield > 0.4;
  return {
    skills,
    agents,
    complexity_score: Math.round(complexity.total * 1e3) / 1e3,
    recommended_pattern: pattern,
    llm_assisted: false,
    greenfield_score: Math.round(greenfield * 1e3) / 1e3,
    suggest_ralph: suggestRalph
  };
}
async function main() {
  let inputData;
  try {
    const input = readFileSync3(0, "utf-8");
    inputData = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ error: "Invalid JSON input or no input provided" }));
    process.exit(1);
  }
  const result = route(inputData);
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && process.argv[1].includes("skill-router")) {
  main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
}

// src/skill-activation-prompt.ts
var PATTERN_AGENT_MAP = {
  "swarm": "research-agent",
  "hierarchical": "kraken",
  "pipeline": "kraken",
  "generator_critic": "review-agent",
  "adversarial": "validate-agent",
  "map_reduce": "kraken",
  "jury": "validate-agent",
  "blackboard": "maestro",
  "circuit_breaker": "kraken",
  "chain_of_responsibility": "maestro",
  "event_driven": "kraken"
};
var WORKFLOW_TRIGGERS = [
  {
    skill: "fix",
    pattern: /\b(fix|debug|broken|failing)\s+(the\s+)?(bug|error|issue|problem)/i,
    antiPattern: /\b(don't|do\s+not|no\s+need\s+to)\s+fix/i,
    confidence: 0.95,
    description: "Bug/error investigation and resolution"
  },
  {
    skill: "build",
    pattern: /\b(build|create|implement)\s+(?:a\s+)?(?:new\s+)?(feature|component|page|module|api|endpoint)/i,
    antiPattern: /\b(don't|do\s+not)\s+(build|create|implement)/i,
    confidence: 0.9,
    description: "Feature development workflow"
  },
  {
    skill: "commit",
    pattern: /\b(commit|save)\s+(these\s+|the\s+|my\s+)?changes/i,
    antiPattern: /\b(don't|do\s+not|before\s+you)\s+commit/i,
    confidence: 0.95,
    description: "Git commit workflow"
  },
  {
    skill: "explore",
    pattern: /\b(explore|understand|navigate|analyze)\s+(the\s+)?(codebase|project|repository|code\s+structure)/i,
    confidence: 0.9,
    description: "Codebase exploration and understanding"
  },
  {
    skill: "ralph",
    pattern: /\b(start|run|launch|use)\s+ralph/i,
    confidence: 0.99,
    description: "Ralph autonomous development workflow"
  },
  {
    skill: "refactor",
    pattern: /\brefactor\s+(the\s+)?(this\s+)?(code|function|class|module|component)/i,
    confidence: 0.9,
    description: "Code refactoring workflow"
  },
  {
    skill: "test",
    pattern: /\b(write|add|create)\s+(unit\s+|integration\s+)?tests?\s+for/i,
    confidence: 0.85,
    description: "Test writing workflow"
  }
];
function checkWorkflowTriggers(prompt) {
  for (const trigger of WORKFLOW_TRIGGERS) {
    if (trigger.pattern.test(prompt)) {
      if (trigger.antiPattern && trigger.antiPattern.test(prompt)) {
        continue;
      }
      return trigger;
    }
  }
  return null;
}
function runPatternInference(prompt, projectDir) {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (homeDir) {
    const claudeDir = homeDir.replace(/\\/g, "/") + "/.claude";
    const normalizedProject = projectDir.replace(/\\/g, "/");
    if (normalizedProject === claudeDir || normalizedProject.endsWith("/.claude")) {
      return null;
    }
  }
  try {
    const scriptPath = join4(projectDir, "scripts", "agentica_patterns", "pattern_inference.py");
    if (!existsSync4(scriptPath)) {
      return null;
    }
    const pythonCode = `
import sys
import json
import importlib.util

# Direct import bypassing __init__.py
spec = importlib.util.spec_from_file_location(
    'pattern_inference',
    ${JSON.stringify(scriptPath)}
)
pattern_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pattern_mod)

prompt = ${JSON.stringify(prompt)}
result = pattern_mod.infer_pattern(prompt)
output = result.to_dict()
output['work_breakdown_detailed'] = pattern_mod.generate_work_breakdown(result)
print(json.dumps(output))
`;
    const result = spawnSync("uv", ["run", "python", "-c", pythonCode], {
      encoding: "utf-8",
      timeout: 2e3,
      cwd: projectDir,
      stdio: ["pipe", "pipe", "pipe"],
      killSignal: "SIGKILL"
    });
    if (result.status !== 0 || !result.stdout) {
      return null;
    }
    return JSON.parse(result.stdout.trim());
  } catch (err) {
    return null;
  }
}
function generateAgenticaOutput(inference, prompt) {
  let output = "\n";
  output += "=".repeat(50) + "\n";
  output += "AGENTICA PATTERN INFERENCE\n";
  output += "=".repeat(50) + "\n";
  output += "\n";
  if (inference.confidence >= 0.7) {
    const suggestedAgent = PATTERN_AGENT_MAP[inference.pattern] || "kraken";
    output += "SUGGESTED APPROACH:\n";
    output += `  Agent: ${suggestedAgent}
`;
    output += `  Pattern: ${inference.work_breakdown_detailed}
`;
    const confidencePct = Math.round(inference.confidence * 100);
    output += `  Confidence: ${confidencePct}%
`;
    output += "\n";
    output += "ACTION: Use AskUserQuestion to confirm before spawning:\n";
    output += `  "I'll use ${suggestedAgent} to ${inference.work_breakdown}. Proceed?"
`;
    output += "  Options: [Yes, proceed] [Different approach] [Let me explain more]\n";
    if (inference.alternatives.length > 0) {
      output += `
Alternative approaches available: ${inference.alternatives.join(", ")}
`;
    }
  } else {
    output += "CLARIFICATION NEEDED:\n";
    output += "\n";
    if (inference.clarification_probe) {
      output += `Ask the user: "${inference.clarification_probe}"
`;
    }
    output += "\n";
    output += "Initial analysis suggests: " + inference.work_breakdown + "\n";
    const confidencePct = Math.round(inference.confidence * 100);
    output += `Confidence: ${confidencePct}%
`;
    output += "\n";
    output += "ACTION: Use AskUserQuestion to clarify before proceeding.\n";
  }
  output += "=".repeat(50) + "\n";
  return output;
}
function detectSemanticQuery(prompt) {
  const semanticPatterns = [
    /^(how|what|where|why|when|which)\s/i,
    /\?$/,
    /^(find|show|list|get|explain)\s+(all|the|every|any)/i,
    /^.*\s+(implementation|architecture|flow|pattern|logic|system)$/i
  ];
  const isSemanticQuery = semanticPatterns.some((p) => p.test(prompt.trim()));
  if (!isSemanticQuery) {
    return { isSemanticQuery: false };
  }
  const shortPrompt = prompt.length > 50 ? prompt.slice(0, 50) + "..." : prompt;
  const suggestion = `\u{1F4A1} **Semantic Query Detected**

Your question "${shortPrompt}" may benefit from semantic code search.

**Try:**
\`\`\`bash
tldr semantic search "${prompt.slice(0, 100)}" .
\`\`\`

Or use the /explore skill for guided exploration.
`;
  return { isSemanticQuery: true, suggestion };
}
async function main2() {
  try {
    const input = readFileSync4(0, "utf-8");
    let data;
    try {
      data = JSON.parse(input);
    } catch {
      outputContinue();
      process.exit(0);
    }
    if (!data.prompt || typeof data.prompt !== "string") {
      outputContinue();
      process.exit(0);
    }
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    if (homeDir) {
      const claudeDir = homeDir.replace(/\\/g, "/") + "/.claude";
      const normalizedCwd = (data.cwd || "").replace(/\\/g, "/");
      if (normalizedCwd === claudeDir || normalizedCwd.endsWith("/.claude")) {
        outputContinue();
        process.exit(0);
      }
    }
    const prompt = data.prompt.toLowerCase();
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const projectRulesPath = join4(projectDir, ".claude", "skills", "skill-rules.json");
    const globalRulesPath = join4(homeDir, ".claude", "skills", "skill-rules.json");
    let rulesPath = "";
    if (existsSync4(projectRulesPath)) {
      rulesPath = projectRulesPath;
    } else if (existsSync4(globalRulesPath)) {
      rulesPath = globalRulesPath;
    } else {
      outputContinue();
      process.exit(0);
    }
    const rules = JSON.parse(readFileSync4(rulesPath, "utf-8"));
    try {
      logHook(data.session_id, "skill-activation-prompt");
    } catch {
    }
    let workflowMessage = "";
    const workflowTrigger = checkWorkflowTriggers(data.prompt);
    if (workflowTrigger && workflowTrigger.confidence >= 0.9) {
      const confidencePct = Math.round(workflowTrigger.confidence * 100);
      workflowMessage = `
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F680} WORKFLOW DETECTED: /${workflowTrigger.skill}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

High-confidence workflow match (${confidencePct}%):
  \u2192 ${workflowTrigger.description}

\u26A0\uFE0F ACTION REQUIRED - INVOKE SKILL FIRST:
Use the Skill tool with: { "skill": "${workflowTrigger.skill}" }

Do NOT skip this step. The skill provides:
- Structured methodology for this task type
- Built-in verification steps
- Proper agent orchestration

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
    }
    const patternInference = runPatternInference(data.prompt, projectDir);
    const semanticQuery = detectSemanticQuery(data.prompt);
    const matchedSkills = [];
    const messages = [];
    if (workflowMessage) {
      messages.push(workflowMessage);
    }
    for (const [skillName, config] of Object.entries(rules.skills)) {
      const triggers = config.promptTriggers;
      if (!triggers) {
        continue;
      }
      if (triggers.keywords) {
        const matchedKeyword = triggers.keywords.find(
          (kw) => prompt.includes(kw.toLowerCase())
        );
        if (matchedKeyword) {
          const skillMatchForValidation = {
            skillName,
            matchType: "keyword",
            matchedTerm: matchedKeyword,
            prompt: data.prompt,
            // Use original prompt (not lowercased)
            skillDescription: config.description,
            enforcement: config.enforcement
          };
          const needsValidation = shouldValidateWithLLM(skillMatchForValidation);
          matchedSkills.push({
            name: skillName,
            matchType: "keyword",
            matchedTerm: matchedKeyword,
            config,
            needsValidation
          });
          continue;
        }
      }
      if (triggers.intentPatterns) {
        const intentMatch = triggers.intentPatterns.some((pattern) => {
          try {
            const regex = new RegExp(pattern, "i");
            return regex.test(prompt);
          } catch {
            return false;
          }
        });
        if (intentMatch) {
          matchedSkills.push({
            name: skillName,
            matchType: "intent",
            config,
            needsValidation: false
          });
        }
      }
    }
    const matchedAgents = [];
    if (rules.agents) {
      for (const [agentName, config] of Object.entries(rules.agents)) {
        const triggers = config.promptTriggers;
        if (!triggers) {
          continue;
        }
        if (triggers.keywords) {
          const matchedKeyword = triggers.keywords.find(
            (kw) => prompt.includes(kw.toLowerCase())
          );
          if (matchedKeyword) {
            const skillMatchForValidation = {
              skillName: agentName,
              matchType: "keyword",
              matchedTerm: matchedKeyword,
              prompt: data.prompt,
              skillDescription: config.description,
              enforcement: config.enforcement
            };
            const needsValidation = shouldValidateWithLLM(skillMatchForValidation);
            matchedAgents.push({
              name: agentName,
              matchType: "keyword",
              matchedTerm: matchedKeyword,
              config,
              isAgent: true,
              needsValidation
            });
            continue;
          }
        }
        if (triggers.intentPatterns) {
          const intentMatch = triggers.intentPatterns.some((pattern) => {
            try {
              const regex = new RegExp(pattern, "i");
              return regex.test(prompt);
            } catch {
              return false;
            }
          });
          if (intentMatch) {
            matchedAgents.push({
              name: agentName,
              matchType: "intent",
              config,
              isAgent: true,
              needsValidation: false
            });
          }
        }
      }
    }
    if (matchedSkills.length > 0 || matchedAgents.length > 0 || patternInference || semanticQuery.isSemanticQuery) {
      const skillsNeedingValidation = matchedSkills.filter((s) => s.needsValidation);
      const agentsNeedingValidation = matchedAgents.filter((a) => a.needsValidation);
      const allNeedingValidation = [...skillsNeedingValidation, ...agentsNeedingValidation];
      const confirmedSkills = matchedSkills.filter((s) => !s.needsValidation);
      const confirmedAgents = matchedAgents.filter((a) => !a.needsValidation);
      let output = "";
      if (patternInference) {
        output += generateAgenticaOutput(patternInference, data.prompt);
        output += "\n";
      }
      if (semanticQuery.isSemanticQuery && semanticQuery.suggestion) {
        output += semanticQuery.suggestion;
        output += "\n";
      }
      if (matchedSkills.length > 0 || matchedAgents.length > 0) {
        output += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
        output += "\u{1F3AF} SKILL ACTIVATION CHECK\n";
        output += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n";
        if (allNeedingValidation.length > 0) {
          output += "\u2753 AMBIGUOUS MATCHES (validate before activating):\n";
          output += "   The following skills matched on keywords that may be used\n";
          output += "   in a non-technical context. Consider if they're needed:\n\n";
          for (const item of allNeedingValidation) {
            const isAgent = item.isAgent ? " [agent]" : "";
            output += `   \u2022 ${item.name}${isAgent}
`;
            output += `     Matched: "${item.matchedTerm}" (keyword match)
`;
            if (item.config.description) {
              output += `     Purpose: ${item.config.description}
`;
            }
            output += `     \u2192 Skip if the user is NOT asking for this functionality
`;
            output += "\n";
          }
          output += "   VALIDATION: Before activating these, ask yourself:\n";
          output += `   "Is the user asking for this skill's capability, or just
`;
          output += '    using the word in everyday language?"\n\n';
        }
        const graphRules = rules;
        const graphInfoMap = /* @__PURE__ */ new Map();
        for (const skill of confirmedSkills) {
          try {
            const priorityValue = skill.config.priority === "critical" ? 3 : skill.config.priority === "high" ? 2 : 1;
            const enhanced = buildEnhancedLookupResult(
              { skillName: skill.name, source: skill.matchType, priorityValue },
              graphRules
            );
            const prereqs = [
              ...enhanced.prerequisites?.require || [],
              ...enhanced.prerequisites?.suggest || []
            ];
            const peers = enhanced.coActivation?.peers || [];
            if (prereqs.length > 0 || peers.length > 0) {
              graphInfoMap.set(skill.name, { prereqs, peers });
            }
          } catch {
          }
        }
        const formatSkill = (s) => {
          let line = `  \u2192 ${s.name}
`;
          const info = graphInfoMap.get(s.name);
          if (info) {
            if (info.prereqs.length > 0) {
              line += `     Prerequisites: ${info.prereqs.join(", ")}
`;
            }
            if (info.peers.length > 0) {
              line += `     Also consider: ${info.peers.join(", ")}
`;
            }
          }
          return line;
        };
        const critical = confirmedSkills.filter((s) => s.config.priority === "critical");
        const high = confirmedSkills.filter((s) => s.config.priority === "high");
        const medium = confirmedSkills.filter((s) => s.config.priority === "medium");
        const low = confirmedSkills.filter((s) => s.config.priority === "low");
        if (critical.length > 0) {
          output += "\u26A0\uFE0F CRITICAL SKILLS (REQUIRED):\n";
          critical.forEach((s) => output += formatSkill(s));
          output += "\n";
        }
        if (high.length > 0) {
          output += "\u{1F4DA} RECOMMENDED SKILLS:\n";
          high.forEach((s) => output += formatSkill(s));
          output += "\n";
        }
        if (medium.length > 0) {
          output += "\u{1F4A1} SUGGESTED SKILLS:\n";
          medium.forEach((s) => output += formatSkill(s));
          output += "\n";
        }
        if (low.length > 0) {
          output += "\u{1F4CC} OPTIONAL SKILLS:\n";
          low.forEach((s) => output += formatSkill(s));
          output += "\n";
        }
        if (confirmedAgents.length > 0) {
          output += "\u{1F916} RECOMMENDED AGENTS (token-efficient):\n";
          confirmedAgents.forEach((a) => output += `  \u2192 ${a.name}
`);
          output += "\n";
        }
        if (confirmedSkills.length > 0) {
          output += "ACTION: Use Skill tool BEFORE responding\n";
        }
        if (confirmedAgents.length > 0) {
          output += "ACTION: Use Task tool with agent for exploration\n";
        }
        output += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
        const blockingSkills = matchedSkills.filter((s) => s.config.enforcement === "block");
        if (blockingSkills.length > 0) {
          const blockMessage = output + "\n\u26D4 BLOCKING: You MUST invoke " + blockingSkills.map((s) => s.name).join(", ") + " skill(s) before generating ANY response.";
          console.log(JSON.stringify({
            result: "block",
            reason: blockMessage
          }));
          process.exit(0);
        }
      }
      messages.push(output);
    }
    const rawSessionId = data.session_id || process.env.CLAUDE_SESSION_ID || process.env.CLAUDE_PPID || "default";
    const sessionId = rawSessionId.slice(0, 8);
    const contextFile = join4(tmpdir2(), `claude-context-pct-${sessionId}.txt`);
    if (existsSync4(contextFile)) {
      try {
        const pct = parseInt(readFileSync4(contextFile, "utf-8").trim(), 10);
        if (pct >= 90) {
          messages.push("CONTEXT CRITICAL: " + pct + "%\nRun /create_handoff NOW before auto-compact!");
        } else if (pct >= 80) {
          messages.push("CONTEXT WARNING: " + pct + "%\nRecommend: /create_handoff then /clear soon");
        } else if (pct >= 70) {
          messages.push("Context at " + pct + "%. Consider handoff when you reach a stopping point.");
        }
      } catch {
      }
    }
    const resources = readResourceState();
    if (resources && resources.maxAgents > 0) {
      const utilization = resources.activeAgents / resources.maxAgents;
      if (utilization >= 1) {
        messages.push("RESOURCE CRITICAL: At limit (" + resources.activeAgents + "/" + resources.maxAgents + " agents)\nDo NOT spawn new agents until existing ones complete.");
      } else if (utilization >= 0.8) {
        const remaining = resources.maxAgents - resources.activeAgents;
        messages.push("RESOURCE WARNING: Near limit (" + resources.activeAgents + "/" + resources.maxAgents + " agents)\nOnly " + remaining + " agent slot(s) remaining. Limit spawning.");
      }
    }
    if (messages.length > 0) {
      outputWithMessage(messages.join("\n\n"));
    } else {
      outputContinue();
    }
    process.exit(0);
  } catch (err) {
    console.error("Error in skill-activation-prompt hook:", err);
    outputContinue();
    process.exit(1);
  }
}
main2().catch((err) => {
  console.error("Uncaught error:", err);
  outputContinue();
  process.exit(1);
});
