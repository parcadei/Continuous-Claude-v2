/**
 * PreToolUse Hook: Smart Search Router
 *
 * Routes Grep calls to the most token-efficient tool:
 * 1. AST-grep - structural code queries (most efficient)
 * 2. LEANN - semantic/conceptual queries
 * 3. Grep - literal patterns (fallback)
 *
 * Uses TLDR daemon for fast symbol lookups when available.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import {
  queryDaemonSync,
  DaemonResponse,
  trackHookActivitySync,
} from "./daemon-client.js";

interface GrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  type?: string;
  output_mode?: string;
}

interface PreToolUseInput {
  tool_name: string;
  tool_input: GrepInput;
  session_id?: string;
}

type QueryType = "structural" | "semantic" | "literal";

// Search context for TLDR layer routing
interface SearchContext {
  timestamp: number;
  queryType: QueryType;
  pattern: string;
  target: string | null;
  targetType:
    | "function"
    | "class"
    | "variable"
    | "import"
    | "decorator"
    | "unknown";
  suggestedLayers: string[];
  definitionLocation?: string; // Where the symbol is defined
  callers?: string[]; // Cross-file: where the symbol is called/used
}

const CONTEXT_DIR = "/tmp/claude-search-context";

function storeSearchContext(sessionId: string, context: SearchContext): void {
  try {
    if (!existsSync(CONTEXT_DIR)) {
      mkdirSync(CONTEXT_DIR, { recursive: true });
    }
    writeFileSync(
      `${CONTEXT_DIR}/${sessionId}.json`,
      JSON.stringify(context, null, 2),
    );
  } catch {
    // Ignore errors - context storage is best-effort
  }
}

// TLDR-based symbol lookup via daemon (faster than spawning CLI)
interface TLDRSearchResult {
  file: string;
  line: number;
  content: string;
}

/**
 * Search using TLDR daemon with ripgrep fallback.
 * Uses daemon when available, falls back to ripgrep when indexing/unavailable.
 */
function tldrSearch(
  pattern: string,
  projectDir: string = ".",
): TLDRSearchResult[] {
  try {
    // Try daemon first
    const response = queryDaemonSync({ cmd: "search", pattern }, projectDir);

    // If daemon is indexing or unavailable, fall back to ripgrep
    if (response.indexing || response.status === "unavailable") {
      return ripgrepFallback(pattern, projectDir);
    }

    // Parse successful daemon response
    if (response.status === "ok" && response.results) {
      return response.results as TLDRSearchResult[];
    }

    return [];
  } catch {
    // Fall back to ripgrep on any error
    return ripgrepFallback(pattern, projectDir);
  }
}

/**
 * Ripgrep fallback for when daemon is unavailable.
 */
function ripgrepFallback(
  pattern: string,
  projectDir: string,
): TLDRSearchResult[] {
  try {
    const escaped = pattern.replace(/"/g, '\\"').replace(/\$/g, "\\$");
    const result = execSync(
      `rg "${escaped}" "${projectDir}" --type py --line-number --max-count 10 2>/dev/null`,
      { encoding: "utf-8", timeout: 3000 },
    );
    // Parse ripgrep output: file:line:content
    return result
      .trim()
      .split("\n")
      .filter((l) => l)
      .slice(0, 10)
      .map((line) => {
        const match = line.match(/^([^:]+):(\d+):(.*)$/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2], 10),
            content: match[3],
          };
        }
        return { file: line, line: 0, content: "" };
      });
  } catch {
    return [];
  }
}

/**
 * Semantic search using TLDR daemon embeddings.
 * Returns relevant code snippets for natural language queries.
 */
interface SemanticResult {
  file: string;
  function: string;
  score: number;
  snippet?: string;
}

interface SemanticSearchResult {
  results: SemanticResult[];
  status: "ok" | "no_index" | "daemon_unavailable" | "indexing" | "error";
}

function checkSemanticIndexExists(projectDir: string): boolean {
  const indexPath = join(
    projectDir,
    ".tldr",
    "cache",
    "semantic",
    "index.faiss",
  );
  return existsSync(indexPath);
}

function tldrSemantic(
  query: string,
  projectDir: string = ".",
): SemanticSearchResult {
  // First check if index exists
  if (!checkSemanticIndexExists(projectDir)) {
    return { results: [], status: "no_index" };
  }

  try {
    const response = queryDaemonSync(
      { cmd: "semantic", query, k: 5 },
      projectDir,
    );

    if (response.indexing) {
      return { results: [], status: "indexing" };
    }

    if (response.status === "unavailable") {
      return { results: [], status: "daemon_unavailable" };
    }

    if (response.status === "ok" && response.results) {
      return { results: response.results as SemanticResult[], status: "ok" };
    }

    return { results: [], status: "ok" }; // Empty results but working
  } catch {
    return { results: [], status: "error" };
  }
}

/**
 * Get callers of a function using TLDR daemon.
 */
function tldrImpact(funcName: string, projectDir: string = "."): string[] {
  try {
    const response = queryDaemonSync(
      { cmd: "impact", func: funcName },
      projectDir,
    );

    // Skip if indexing or unavailable
    if (response.indexing || response.status === "unavailable") {
      return [];
    }

    // Parse callers from response
    if (response.status === "ok" && response.callers) {
      return response.callers.map((c: any) => `${c.file}:${c.line}`);
    }

    return [];
  } catch {
    return [];
  }
}

function lookupCallers(pattern: string): string[] {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";
  return tldrImpact(pattern, projectDir).slice(0, 20);
}

function lookupSymbol(
  pattern: string,
): { type: SearchContext["targetType"]; location: string } | null {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";

  // Try function first (most common)
  const funcResults = tldrSearch(`def ${pattern}`, projectDir);
  if (funcResults.length > 0) {
    return {
      type: "function",
      location: `${funcResults[0].file}:${funcResults[0].line}`,
    };
  }

  // Try class
  const classResults = tldrSearch(`class ${pattern}`, projectDir);
  if (classResults.length > 0) {
    return {
      type: "class",
      location: `${classResults[0].file}:${classResults[0].line}`,
    };
  }

  // Try variable (SCREAMING_CASE assignment)
  if (/^[A-Z][A-Z0-9_]+$/.test(pattern)) {
    const varResults = tldrSearch(`${pattern} =`, projectDir);
    if (varResults.length > 0) {
      return {
        type: "variable",
        location: `${varResults[0].file}:${varResults[0].line}`,
      };
    }
  }

  return null;
}

// Verb prefixes AND standalone verbs that indicate a function (not a variable)
// Prefixes: get_, set_, is_, has_, etc.
// Standalone: poll, call, exec, sync, etc. (common method names that are single verbs)
const FUNCTION_VERB_PREFIXES =
  /^(get|set|is|has|do|can|create|update|delete|fetch|load|save|read|write|parse|build|make|init|setup|run|start|stop|handle|process|validate|check|find|search|filter|sort|map|reduce|transform|convert|format|render|display|show|hide|enable|disable|add|remove|insert|append|push|pop|clear|reset|close|open|connect|disconnect|send|receive|emit|on_|async_|_get|_set|_is|_has|_do|_create|_update|_delete|_fetch|_load|_save|_read|_write|_parse|_build|_make|_init|_setup|_run|_handle|_process|_validate|_check|_find|poll|call|exec|execute|invoke|apply|bind|dispatch|trigger|fire|notify|broadcast|publish|subscribe|unsubscribe|listen|watch|observe|register|unregister|mount|unmount|attach|detach|flush|dump|log|warn|error|debug|trace|print|throw|raise|assert|test|mock|stub|spy|wait|sleep|delay|retry|abort|cancel|pause|resume|refresh|reload|rerun|revert|rollback|commit|merge|split|join|clone|copy|move|swap|toggle|flip|increment|decrement|next|prev|first|last|peek|drain|consume|produce|yield|spawn|fork|join|kill|terminate|shutdown|cleanup|destroy|dispose|release|acquire|lock|unlock|enter|exit|begin|end|finalize)(_|$)/;

function extractTarget(pattern: string): {
  target: string | null;
  targetType: SearchContext["targetType"];
} {
  // 1. Try AST-based symbol index first (100% accurate if indexed)
  const indexed = lookupSymbol(pattern);
  if (indexed) {
    return { target: pattern, targetType: indexed.type };
  }

  // 2. Fall back to heuristics for unindexed patterns
  // Explicit keywords first
  const classMatch = pattern.match(/^class\s+(\w+)/);
  if (classMatch) return { target: classMatch[1], targetType: "class" };

  const defMatch = pattern.match(/^(?:async\s+)?def\s+(\w+)/);
  if (defMatch) return { target: defMatch[1], targetType: "function" };

  const functionMatch = pattern.match(/^(?:async\s+)?function\s+(\w+)/);
  if (functionMatch)
    return { target: functionMatch[1], targetType: "function" };

  const decoratorMatch = pattern.match(/^@(\w+)/);
  if (decoratorMatch)
    return { target: decoratorMatch[1], targetType: "decorator" };

  const importMatch = pattern.match(/^(?:import|from)\s+(\w+)/);
  if (importMatch) return { target: importMatch[1], targetType: "import" };

  // Self/this attribute access (handle escaped dots too: self\._data)
  const attrMatch = pattern.match(/(?:self|this)(?:\.|\\\.|\\\.\s*)(\w+)/);
  if (attrMatch) {
    const attr = attrMatch[1];
    // Check if it looks like a method (verb prefix) or variable
    if (FUNCTION_VERB_PREFIXES.test(attr)) {
      return { target: attr, targetType: "function" };
    }
    return { target: attr, targetType: "variable" };
  }

  // Python dunder handling
  if (/^__[a-z][a-z0-9_]*__$/.test(pattern)) {
    // Module-level dunder VARIABLES (not methods)
    const moduleVars = [
      "__all__",
      "__version__",
      "__author__",
      "__doc__",
      "__file__",
      "__name__",
      "__package__",
      "__path__",
      "__cached__",
      "__loader__",
      "__spec__",
      "__builtins__",
      "__dict__",
      "__module__",
      "__slots__",
      "__annotations__",
    ];
    if (moduleVars.includes(pattern)) {
      return { target: pattern, targetType: "variable" };
    }
    // All other dunders are methods (e.g., __init__, __str__, __repr__, __eq__)
    return { target: pattern, targetType: "function" };
  }

  // SCREAMING_CASE = constant (variable)
  if (/^[A-Z][A-Z0-9_]+$/.test(pattern))
    return { target: pattern, targetType: "variable" };

  // PascalCase = class
  if (/^[A-Z][a-zA-Z0-9]+$/.test(pattern))
    return { target: pattern, targetType: "class" };

  // snake_case with verb prefix = function
  if (
    /^_?[a-z][a-z0-9_]*$/.test(pattern) &&
    FUNCTION_VERB_PREFIXES.test(pattern)
  ) {
    return { target: pattern, targetType: "function" };
  }

  // snake_case WITHOUT verb prefix = variable (e.g., _pool, cpu_percent, data_source)
  if (/^_?[a-z][a-z0-9_]*$/.test(pattern)) {
    return { target: pattern, targetType: "variable" };
  }

  // camelCase with verb prefix = function (e.g., handleClick, useState, fetchData)
  const camelCaseVerbPattern =
    /^(get|set|is|has|do|can|use|create|update|delete|fetch|load|save|read|write|parse|build|make|init|setup|run|start|stop|handle|process|validate|check|find|search|filter|sort|map|reduce|transform|convert|format|render|display|show|hide|enable|disable|add|remove|insert|append|push|pop|clear|reset|close|open|connect|disconnect|send|receive|emit|on|async|poll|call|exec|execute|invoke|apply|bind|dispatch|trigger|fire|notify|broadcast|publish|subscribe|watch|observe|register|mount|attach|flush|dump|log|warn|error|debug|print|throw|assert|test|mock|wait|sleep|retry|abort|cancel|pause|resume|refresh|reload|revert|commit|merge|clone|copy|move|toggle|spawn|fork|kill|terminate|shutdown|cleanup|destroy|dispose|release|acquire|lock|unlock|enter|exit|begin|end)[A-Z]/;
  if (camelCaseVerbPattern.test(pattern)) {
    return { target: pattern, targetType: "function" };
  }

  // camelCase WITHOUT verb prefix = variable (e.g., sessionId, userData, configOptions)
  if (/^[a-z][a-zA-Z0-9]*$/.test(pattern) && /[A-Z]/.test(pattern)) {
    return { target: pattern, targetType: "variable" };
  }

  // Fallback: extract any identifier
  const identMatch = pattern.match(/\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/);
  if (identMatch) return { target: identMatch[1], targetType: "unknown" };

  return { target: null, targetType: "unknown" };
}

function suggestLayers(
  targetType: SearchContext["targetType"],
  queryType: QueryType,
): string[] {
  switch (targetType) {
    case "function":
      return ["ast", "call_graph", "cfg"];
    case "class":
      return ["ast", "call_graph"];
    case "variable":
      return ["ast", "dfg"];
    case "import":
      return ["ast"];
    case "decorator":
      return ["ast", "call_graph"];
    default:
      return queryType === "semantic"
        ? ["ast", "call_graph", "cfg"]
        : ["ast", "call_graph"];
  }
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision: "allow" | "deny" | "ask";
    permissionDecisionReason?: string;
  };
  systemMessage?: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

/**
 * Classifies query type for optimal tool routing
 */
function classifyQuery(pattern: string): QueryType {
  // STRUCTURAL: Code patterns that AST-grep handles best
  const structuralPatterns = [
    /^(class|function|def|async def|const|let|var|interface|type|export)\s+\w+/,
    /^(import|from|require)\s/,
    /^\w+\s*\([^)]*\)/, // function calls
    /^async\s+(function|def)/,
    /\$\w+/, // AST-grep metavariables
    /^@\w+/, // decorators
  ];

  if (structuralPatterns.some((p) => p.test(pattern))) {
    return "structural";
  }

  // LITERAL: Exact identifiers, regex, file paths
  // Regex patterns
  if (
    pattern.includes("\\") ||
    pattern.includes("[") ||
    /\([^)]*\|/.test(pattern)
  ) {
    return "literal";
  }

  // Exact identifier patterns (CamelCase, snake_case, SCREAMING_CASE)
  if (
    /^[A-Z][a-zA-Z0-9]*$/.test(pattern) ||
    /^[a-z_][a-z0-9_]*$/.test(pattern) ||
    /^[A-Z_][A-Z0-9_]*$/.test(pattern)
  ) {
    return "literal";
  }

  // File paths
  if (pattern.includes("/") || /\.(ts|py|js|go|rs|md)/.test(pattern)) {
    return "literal";
  }

  // Short patterns (1-2 words, no question words) are likely literal
  const words = pattern.split(/\s+/).filter((w) => w.length > 0);
  if (
    words.length <= 2 &&
    !/^(how|what|where|why|when|find|show|list)/i.test(pattern)
  ) {
    return "literal";
  }

  // SEMANTIC: Natural language, questions, conceptual
  const semanticPatterns = [
    /^(how|what|where|why|when|which)\s/i,
    /\?$/,
    /^(find|show|list|get|explain)\s+(all|the|every|any)/i,
    /works?$/i,
    /^.*\s+(implementation|architecture|flow|pattern|logic|system)$/i,
  ];

  if (semanticPatterns.some((p) => p.test(pattern))) {
    return "semantic";
  }

  // 3+ words without code indicators → likely semantic
  if (words.length >= 3) {
    return "semantic";
  }

  return "literal";
}

// LEANN functions removed - TLDR cross-file covers this use case

function getAstGrepSuggestion(
  pattern: string,
  lang: string = "python",
): string {
  // Convert natural language to AST-grep pattern hints
  const suggestions: Record<string, string> = {
    function: `def $FUNC($$$):`,
    async: `async def $FUNC($$$):`,
    class: `class $NAME:`,
    import: `import $MODULE`,
    decorator: `@$DECORATOR`,
  };

  for (const [keyword, astPattern] of Object.entries(suggestions)) {
    if (pattern.toLowerCase().includes(keyword)) {
      return astPattern;
    }
  }
  return `$PATTERN($$$)`;
}

async function main() {
  let input: PreToolUseInput;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    // Malformed JSON - exit silently
    console.log("{}");
    return;
  }

  // Only intercept Grep tool
  if (input.tool_name !== "Grep") {
    console.log("{}");
    return;
  }

  // Validate tool_input exists and has required fields
  if (!input.tool_input || typeof input.tool_input.pattern !== "string") {
    console.log("{}");
    return;
  }

  const pattern = input.tool_input.pattern;
  const queryType = classifyQuery(pattern);
  const sessionId = input.session_id || "default";

  // Extract target and store context for downstream hooks (tldr-read-enforcer)
  const { target, targetType } = extractTarget(pattern);
  const layers = suggestLayers(targetType, queryType);

  // Look up cross-file info from indexes
  const symbolInfo = target ? lookupSymbol(target) : null;
  const callers = target ? lookupCallers(target) : [];

  storeSearchContext(sessionId, {
    timestamp: Date.now(),
    queryType,
    pattern,
    target,
    targetType,
    suggestedLayers: layers,
    definitionLocation: symbolInfo?.location,
    callers: callers.slice(0, 20), // Limit to 20 callers for token efficiency
  });

  // Track hook activity (P8) - get project dir early for tracking
  const projectDir = process.env.CLAUDE_PROJECT_DIR || ".";

  // LITERAL: Suggest TLDR search (finds + enriches in one call)
  if (queryType === "literal") {
    trackHookActivitySync("smart-search-router", projectDir, true, {
      queries_routed: 1,
      literal_queries: 1,
    });

    const reason = `🔍 Use TLDR search for code exploration (95% token savings):

**Option 1 - TLDR Skill:**
/tldr-search ${pattern}

**Option 2 - Direct CLI:**
\`\`\`bash
tldr search "${pattern}" .
\`\`\`

**Option 3 - Read specific file (TLDR auto-enriches):**
Read the file containing "${pattern}" - the tldr-read-enforcer will return structured context.

TLDR finds location + provides call graph + docstrings in one call.`;

    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
    console.log(JSON.stringify(output));
    return;
  }

  // STRUCTURAL: Suggest AST-grep (most token-efficient for patterns)
  if (queryType === "structural") {
    trackHookActivitySync("smart-search-router", projectDir, true, {
      queries_routed: 1,
      structural_queries: 1,
    });

    const astPattern = getAstGrepSuggestion(pattern);
    const reason = `🎯 Structural query - Use AST-grep OR TLDR:

**Option 1 - AST-grep (pattern matching):**
ast-grep --pattern "${astPattern}" --lang python

**Option 2 - TLDR (richer context):**
/tldr-search ${target || pattern}

AST-grep: precise pattern match, file:line only
TLDR: finds + call graph + docstrings + complexity`;

    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
    console.log(JSON.stringify(output));
    return;
  }

  // SEMANTIC: Actually run semantic search via daemon
  trackHookActivitySync("smart-search-router", projectDir, true, {
    queries_routed: 1,
    semantic_queries: 1,
  });

  const semanticSearch = tldrSemantic(pattern, projectDir);

  let reason: string;
  if (semanticSearch.status === "ok" && semanticSearch.results.length > 0) {
    // We have results - provide them directly
    const resultsStr = semanticSearch.results
      .map((r) => {
        const loc = `${r.file}:${r.function || "module"}`;
        const score = r.score ? ` (${(r.score * 100).toFixed(0)}%)` : "";
        return `  - ${loc}${score}`;
      })
      .join("\n");

    reason = `🧠 **Semantic Search Results** (via TLDR daemon):

${resultsStr}

**Next steps:**
1. Read the most relevant file: \`Read ${semanticSearch.results[0].file}\`
2. For deeper analysis: \`/tldr-search ${target || pattern} --layer all\`

The results above are semantically similar to "${pattern}".`;
  } else if (semanticSearch.status === "no_index") {
    // Semantic index doesn't exist - offer to set it up
    reason = `🧠 **Semantic Search Not Set Up**

No semantic index found. To enable AI-powered code search:

\`\`\`bash
tldr semantic index . --lang all
\`\`\`

This creates embeddings for your codebase (one-time, ~30s).
After indexing, natural language queries like "${pattern}" will find relevant code.

**For now, use:**
- \`/tldr-search ${target || pattern}\` - structured search
- \`Task(subagent_type="Explore", prompt="${pattern}")\` - agent exploration`;
  } else if (semanticSearch.status === "daemon_unavailable") {
    // Daemon not running
    reason = `🧠 **TLDR Daemon Not Running**

Start the daemon for semantic search:
\`\`\`bash
tldr daemon start
\`\`\`

Then retry your query. The daemon provides fast, in-memory semantic search.

**For now, use:**
- \`/tldr-search ${target || pattern}\` - structured search (no daemon needed)`;
  } else if (semanticSearch.status === "indexing") {
    // Daemon is indexing
    reason = `🧠 **Semantic Index Building...**

The daemon is currently building the semantic index. This takes ~30s.
Retry in a moment, or use structured search for now:

\`/tldr-search ${target || pattern}\``;
  } else {
    // No results but system is working - genuinely no matches
    reason = `🧠 **No Semantic Matches**

No code semantically similar to "${pattern}" found in the index.

**Try:**
1. Rephrase the query with different keywords
2. Use structured search: \`/tldr-search ${target || pattern}\`
3. Explore with agent: \`Task(subagent_type="Explore", prompt="${pattern}")\``;
  }

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  console.log(JSON.stringify(output));
}

main().catch(console.error);
