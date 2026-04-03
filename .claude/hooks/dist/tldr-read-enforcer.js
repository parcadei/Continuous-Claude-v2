/**
 * TLDR Read Enforcer Hook - BLOCKING VERSION
 *
 * Intercepts Read tool calls for code files and BLOCKS with TLDR context.
 * Instead of reading 1000+ line files, returns structured L1 AST context.
 *
 * Result: 95% token savings (50-500 tokens vs 3000-20000 raw)
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { basename, extname } from "path";
const CONTEXT_DIR = "/tmp/claude-search-context";
const CONTEXT_MAX_AGE_MS = 30000; // 30 seconds - context expires after this
/**
 * Read search context from smart-search-router (if recent)
 */
function getSearchContext(sessionId) {
  try {
    const contextPath = `${CONTEXT_DIR}/${sessionId}.json`;
    if (!existsSync(contextPath)) return null;
    const context = JSON.parse(readFileSync(contextPath, "utf-8"));
    // Check if context is stale
    if (Date.now() - context.timestamp > CONTEXT_MAX_AGE_MS) {
      return null;
    }
    return context;
  } catch {
    return null;
  }
}
/**
 * Analyze recent transcript messages to infer intent
 */
function analyzeTranscript(transcriptPath) {
  try {
    if (!existsSync(transcriptPath)) return null;
    const content = readFileSync(transcriptPath, "utf-8");
    const lines = content.trim().split("\n").slice(-20); // Last 20 messages
    // Combine recent text for analysis
    let recentText = "";
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (msg.type === "human" || msg.type === "assistant") {
          const text =
            typeof msg.message === "string"
              ? msg.message
              : JSON.stringify(msg.message);
          recentText += " " + text;
        }
      } catch {
        /* ignore parse errors */
      }
    }
    recentText = recentText.toLowerCase();
    // Intent detection patterns
    const intentPatterns = [
      {
        patterns: [
          /debug/,
          /bug/,
          /fix\s+(the|this|a)?\s*(error|issue|problem)/,
          /investigate/,
          /broken/,
        ],
        layers: ["ast", "call_graph", "cfg"],
        name: "debugging",
      },
      {
        patterns: [
          /where\s+does/,
          /data\s*flow/,
          /variable/,
          /track\s+\w+/,
          /what\s+sets/,
        ],
        layers: ["ast", "dfg"],
        name: "data-flow",
      },
      {
        patterns: [
          /complexity/,
          /how\s+complex/,
          /refactor/,
          /simplify/,
          /control\s+flow/,
        ],
        layers: ["ast", "call_graph", "cfg"],
        name: "complexity",
      },
      {
        patterns: [/what\s+depends/, /impact/, /affects/, /slice/],
        layers: ["ast", "call_graph", "pdg"],
        name: "dependencies",
      },
      {
        patterns: [/understand/, /how\s+does.*work/, /explain/],
        layers: ["ast", "call_graph", "cfg"],
        name: "understanding",
      },
    ];
    for (const intent of intentPatterns) {
      if (intent.patterns.some((p) => p.test(recentText))) {
        // Try to extract a function/class name from recent text
        const funcMatch = recentText.match(
          /(?:function|method|def|class)\s+(\w+)/,
        );
        const target = funcMatch ? funcMatch[1] : null;
        return {
          layers: intent.layers,
          target,
          source: `transcript:${intent.name}`,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
// TLDR installation path
const TLDR_PATH = process.env.CLAUDE_PROJECT_DIR
  ? `${process.env.CLAUDE_PROJECT_DIR}/opc/packages/tldr-code`
  : "/Users/cosimo/.opc-dev/opc/packages/tldr-code";
const TLDR_VENV = `${TLDR_PATH}/.venv/bin/python`;
// Code file extensions that should use TLDR
const CODE_EXTENSIONS = new Set([
  ".py",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".go",
  ".rs",
]);
// Files that should always be allowed (bypass TLDR)
const ALLOWED_PATTERNS = [
  /\.json$/,
  /\.yaml$/,
  /\.yml$/,
  /\.toml$/,
  /\.md$/,
  /\.txt$/,
  /\.env/,
  /\.gitignore$/,
  /Makefile$/,
  /Dockerfile$/,
  /requirements\.txt$/,
  /package\.json$/,
  /tsconfig\.json$/,
  /pyproject\.toml$/,
  // Allow test files (need full context for implementation)
  /test_.*\.py$/,
  /.*_test\.py$/,
  /.*\.test\.(ts|js)$/,
  /.*\.spec\.(ts|js)$/,
  // Allow hooks/skills (we edit these)
  /\.claude\/hooks\//,
  /\.claude\/skills\//,
  /init-db\.sql$/,
  /migrations\//,
];
const ALLOWED_DIRS = ["/tmp/", "node_modules/", ".venv/", "__pycache__/"];
function isCodeFile(filePath) {
  return CODE_EXTENSIONS.has(extname(filePath));
}
function isAllowedFile(filePath) {
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(filePath)) return true;
  }
  for (const dir of ALLOWED_DIRS) {
    if (filePath.includes(dir)) return true;
  }
  return false;
}
function detectLanguage(filePath) {
  const ext = extname(filePath);
  const langMap = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
  };
  return langMap[ext] || "python";
}
function getTldrContext(
  filePath,
  language,
  layers = ["ast", "call_graph"],
  target = null,
) {
  if (!existsSync(TLDR_VENV)) return null;
  // Build Python code based on requested layers
  const layerCode = [];
  const fileName = basename(filePath);
  // Header
  layerCode.push(`print(f'# ${fileName}')`);
  layerCode.push(`print(f'Language: ${language}')`);
  layerCode.push(`print()`);
  // L1: AST (always included for structure)
  if (layers.includes("ast") || layers.includes("call_graph")) {
    layerCode.push(`
from tldr.hybrid_extractor import HybridExtractor
ext = HybridExtractor()
info = ext.extract('${filePath}')
if info.functions:
    print('## Functions')
    for fn in info.functions:
        params = ', '.join(fn.params) if fn.params else ''
        ret = f' -> {fn.return_type}' if fn.return_type else ''
        print(f'  {fn.name}({params}){ret}  [line {fn.line_number}]')
        if fn.docstring:
            doc = fn.docstring[:100].replace('\\\\n', ' ')
            print(f'    # {doc}')
if info.classes:
    print()
    print('## Classes')
    for cls in info.classes:
        print(f'  class {cls.name}  [line {cls.line_number}]')
        for m in cls.methods[:10]:
            print(f'    .{m.name}()')
`);
  }
  // L2: Call Graph
  if (layers.includes("call_graph")) {
    layerCode.push(`
if info.call_graph and info.call_graph.calls:
    print()
    print('## Call Graph')
    for caller, callees in list(info.call_graph.calls.items())[:15]:
        print(f'  {caller} -> {callees}')
`);
  }
  // L3: CFG (Control Flow Graph)
  if (layers.includes("cfg")) {
    const funcName = target || "main";
    layerCode.push(`
try:
    from tldr.cfg_extractor import extract_python_cfg
    src = open('${filePath}').read()
    cfg = extract_python_cfg(src, '${funcName}')
    if cfg and cfg.blocks:
        print()
        print('## CFG: ${funcName}')
        print(f'  Blocks: {len(cfg.blocks)}, Cyclomatic: {cfg.cyclomatic_complexity}')
        for b in cfg.blocks[:8]:
            print(f'    Block {b.id}: lines {b.start_line}-{b.end_line} ({b.block_type})')
except Exception:
    pass
`);
  }
  // L4: DFG (Data Flow Graph)
  if (layers.includes("dfg")) {
    const funcName = target || "main";
    layerCode.push(`
try:
    from tldr.dfg_extractor import extract_python_dfg
    src = open('${filePath}').read()
    dfg = extract_python_dfg(src, '${funcName}')
    if dfg and dfg.var_refs:
        print()
        print('## DFG: ${funcName}')
        defs = [r for r in dfg.var_refs if r.category == 'def'][:10]
        uses = [r for r in dfg.var_refs if r.category == 'use'][:10]
        if defs:
            print('  Definitions:')
            for r in defs:
                print(f'    {r.var_name} @ line {r.line}')
        if uses:
            print('  Uses:')
            for r in uses[:8]:
                print(f'    {r.var_name} @ line {r.line}')
except Exception:
    pass
`);
  }
  // L5: PDG (Program Dependency Graph)
  if (layers.includes("pdg")) {
    const funcName = target || "main";
    layerCode.push(`
try:
    from tldr.pdg_extractor import extract_python_pdg
    src = open('${filePath}').read()
    pdg = extract_python_pdg(src, '${funcName}')
    if pdg and pdg.nodes:
        print()
        print('## PDG: ${funcName}')
        ctrl = len([e for e in pdg.edges if e.dep_type == 'control'])
        data = len([e for e in pdg.edges if e.dep_type == 'data'])
        print(f'  Nodes: {len(pdg.nodes)}, Control deps: {ctrl}, Data deps: {data}')
        for n in pdg.nodes[:8]:
            print(f'    Line {n.line}: {n.node_type}')
except Exception:
    pass
`);
  }
  try {
    const pythonCode = layerCode.join("\n");
    const cmd = `cd "${TLDR_PATH}" && source .venv/bin/activate && python -c "
${pythonCode}
" 2>/dev/null`;
    const output = execSync(cmd, {
      encoding: "utf-8",
      timeout: 15000,
      shell: "/bin/bash",
    });
    return output.trim();
  } catch {
    return null;
  }
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  if (input.tool_name !== "Read") {
    console.log("{}");
    return;
  }
  const filePath = input.tool_input.file_path || "";
  // Allow non-code files
  if (!isCodeFile(filePath)) {
    console.log("{}");
    return;
  }
  // Allow explicitly permitted files
  if (isAllowedFile(filePath)) {
    console.log("{}");
    return;
  }
  // If requesting specific lines (offset/limit), allow - they know what they want
  if (
    input.tool_input.offset ||
    (input.tool_input.limit && input.tool_input.limit < 100)
  ) {
    console.log("{}");
    return;
  }
  // Get TLDR context instead of raw file
  const language = detectLanguage(filePath);
  // Try to detect intent from multiple sources (in priority order)
  let layers = ["ast", "call_graph"]; // Default layers
  let target = null;
  let contextSource = "default";
  // 1. Check for search context from smart-search-router (highest priority)
  const searchContext = getSearchContext(input.session_id);
  if (searchContext) {
    layers = searchContext.suggestedLayers;
    target = searchContext.target;
    contextSource = `${searchContext.targetType}: ${searchContext.target}`;
  }
  // 2. Analyze transcript for intent (fallback when no search context)
  else if (input.transcript_path) {
    const transcriptIntent = analyzeTranscript(input.transcript_path);
    if (transcriptIntent) {
      layers = transcriptIntent.layers;
      target = transcriptIntent.target;
      contextSource = transcriptIntent.source;
    }
  }
  const tldrContext = getTldrContext(filePath, language, layers, target);
  if (!tldrContext) {
    // TLDR failed, allow normal read
    console.log("{}");
    return;
  }
  // Format layer names for display
  const layerNames = layers
    .map((l) => {
      switch (l) {
        case "ast":
          return "L1:AST";
        case "call_graph":
          return "L2:CallGraph";
        case "cfg":
          return "L3:CFG";
        case "dfg":
          return "L4:DFG";
        case "pdg":
          return "L5:PDG";
        default:
          return l;
      }
    })
    .join(" + ");
  // Format cross-file usage (L6) if available
  let crossFileSection = "";
  if (searchContext?.callers && searchContext.callers.length > 0) {
    const callerLines = searchContext.callers.slice(0, 10).map((c) => {
      // Format: /full/path/file.py:123 → file.py:123
      const parts = c.split("/");
      const fileAndLine = parts[parts.length - 1];
      const dir = parts.length > 2 ? parts[parts.length - 2] : "";
      return `  ${dir ? dir + "/" : ""}${fileAndLine}`;
    });
    crossFileSection = `
## Cross-File Usage (${searchContext.callers.length} refs)
${callerLines.join("\n")}${searchContext.callers.length > 10 ? `\n  ... and ${searchContext.callers.length - 10} more` : ""}
`;
  }
  // Add definition location if different from current file
  let definitionSection = "";
  if (
    searchContext?.definitionLocation &&
    !searchContext.definitionLocation.includes(basename(filePath))
  ) {
    definitionSection = `\n📍 Defined at: ${searchContext.definitionLocation}\n`;
  }
  // BLOCK the read and return TLDR context
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `📊 TLDR Context (${layerNames}) - 95% token savings:
${searchContext ? `🔗 Context: ${contextSource}` : ""}${definitionSection}

${tldrContext}${crossFileSection}
---
To read specific lines, use: Read with offset/limit
To read full file anyway, use: Read ${basename(filePath)} (test files bypass this)`,
    },
  };
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error(`TLDR enforcer error: ${err.message}`);
  console.log("{}");
});
