/**
 * TLDR Context Injection Hook - Intent-Aware Version
 *
 * Routes to different TLDR layers based on detected intent:
 * - "debug/investigate X" → Call Graph + CFG (what it calls, complexity)
 * - "where does Y come from" → DFG (data flow)
 * - "what affects line Z" → PDG (program slicing)
 * - "show structure" → AST only
 * - Default → Call Graph (navigation)
 */
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
// TLDR installation path
const TLDR_PATH = process.env.CLAUDE_PROJECT_DIR
  ? `${process.env.CLAUDE_PROJECT_DIR}/opc/packages/tldr-code`
  : "/Users/cosimo/.opc-dev/opc/packages/tldr-code";
const TLDR_VENV = `${TLDR_PATH}/.venv/bin/python`;
const INTENT_PATTERNS = [
  {
    // Data flow questions
    patterns: [
      /where\s+does?\s+(\w+)\s+come\s+from/i,
      /what\s+sets?\s+(\w+)/i,
      /who\s+assigns?\s+(\w+)/i,
      /track\s+(?:the\s+)?(?:variable\s+)?(\w+)/i,
      /data\s+flow/i,
      /variable\s+(?:origin|source)/i,
    ],
    layers: ["dfg"],
    description: "data flow analysis",
  },
  {
    // Program slicing / dependency questions
    patterns: [
      /what\s+affects?\s+(?:line\s+)?(\d+)/i,
      /what\s+depends?\s+on/i,
      /slice\s+(?:at|from)/i,
      /dependencies?\s+(?:of|for)/i,
      /impact\s+(?:of|analysis)/i,
    ],
    layers: ["pdg"],
    description: "program slicing",
  },
  {
    // Complexity / control flow questions
    patterns: [
      /how\s+complex/i,
      /complexity\s+(?:of|for)/i,
      /control\s+flow/i,
      /branch(?:es|ing)/i,
      /cyclomatic/i,
      /paths?\s+through/i,
    ],
    layers: ["cfg"],
    description: "control flow analysis",
  },
  {
    // Structure only
    patterns: [
      /list\s+(?:all\s+)?(?:functions?|methods?|classes?)/i,
      /show\s+structure/i,
      /what\s+(?:functions?|methods?)\s+(?:are\s+)?in/i,
      /overview\s+of/i,
    ],
    layers: ["ast"],
    description: "structure overview",
  },
  {
    // Debug / investigate (default rich context)
    patterns: [
      /debug/i,
      /investigate/i,
      /fix\s+(?:the\s+)?(?:bug|issue|error)/i,
      /understand/i,
      /how\s+does?\s+(\w+)\s+work/i,
      /explain/i,
    ],
    layers: ["call_graph", "cfg"],
    description: "debugging context",
  },
];
// Function name extraction patterns
const FUNCTION_PATTERNS = [
  /(?:function|method|def|fn)\s+[`"']?(\w+)[`"']?/gi,
  /the\s+[`"']?(\w+)[`"']?\s+(?:function|method)/gi,
  /(?:fix|debug|investigate|look at|check|analyze)\s+[`"']?(\w+(?:\.\w+)?)[`"']?/gi,
  /[`"']?(\w+\.\w+)[`"']?/g,
  /[`"']?([a-z][a-z0-9_]{2,})[`"']?/g,
];
const EXCLUDE_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "what",
  "how",
  "can",
  "you",
  "fix",
  "debug",
  "investigate",
  "look",
  "check",
  "analyze",
  "function",
  "method",
  "class",
  "file",
  "code",
  "error",
  "bug",
  "issue",
  "please",
  "help",
  "need",
  "want",
  "should",
  "could",
  "would",
  "make",
  "add",
  "remove",
  "update",
  "change",
  "modify",
  "create",
  "delete",
  "test",
  "tests",
  "run",
  "build",
  "install",
  "start",
  "stop",
  "where",
  "does",
  "come",
  "from",
  "affects",
  "line",
  "variable",
]);
// Detect intent from prompt
function detectIntent(prompt) {
  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(prompt)) {
        return { layers: intent.layers, description: intent.description };
      }
    }
  }
  // Default: call graph for navigation
  return { layers: ["call_graph"], description: "code navigation" };
}
// Detect language from project files
function detectLanguage(projectPath) {
  const indicators = {
    python: ["pyproject.toml", "setup.py", "requirements.txt", "Pipfile"],
    typescript: ["tsconfig.json", "package.json"],
    rust: ["Cargo.toml"],
    go: ["go.mod", "go.sum"],
  };
  for (const [lang, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (existsSync(join(projectPath, file))) {
        return lang;
      }
    }
  }
  return "python";
}
// Extract potential entry points from prompt
function extractEntryPoints(prompt) {
  const candidates = new Set();
  for (const pattern of FUNCTION_PATTERNS) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const candidate = match[1];
      if (
        candidate &&
        candidate.length > 2 &&
        !EXCLUDE_WORDS.has(candidate.toLowerCase())
      ) {
        candidates.add(candidate);
      }
    }
  }
  return Array.from(candidates).sort((a, b) => {
    const aHasDot = a.includes(".");
    const bHasDot = b.includes(".");
    if (aHasDot && !bHasDot) return -1;
    if (bHasDot && !aHasDot) return 1;
    return b.length - a.length;
  });
}
// Extract line number if mentioned
function extractLineNumber(prompt) {
  const match = prompt.match(/line\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}
// Extract variable name for DFG
function extractVariableName(prompt) {
  const patterns = [
    /where\s+does?\s+[`"']?(\w+)[`"']?\s+come\s+from/i,
    /what\s+sets?\s+[`"']?(\w+)[`"']?/i,
    /track\s+(?:the\s+)?(?:variable\s+)?[`"']?(\w+)[`"']?/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) return match[1];
  }
  return null;
}
// Call TLDR API with specific layer
function getTldrContext(
  projectPath,
  entryPoint,
  language,
  layers,
  lineNumber,
  varName,
) {
  if (!existsSync(TLDR_VENV)) {
    return null;
  }
  const results = [];
  try {
    for (const layer of layers) {
      let cmd;
      let output;
      switch (layer) {
        case "call_graph":
          // Default unified API (includes call graph + signatures + CFG metrics)
          cmd = `cd "${TLDR_PATH}" && source .venv/bin/activate && python -m tldr.api "${projectPath}" "${entryPoint}" 2 "${language}" 2>/dev/null`;
          output = execSync(cmd, {
            encoding: "utf-8",
            timeout: 10000,
            shell: "/bin/bash",
          });
          if (output.includes("📍")) {
            results.push(output.trim());
          }
          break;
        case "cfg":
          // CFG-specific: get complexity details
          cmd = `cd "${TLDR_PATH}" && source .venv/bin/activate && python -c "
from tldr.cfg_extractor import extract_${language}_cfg
from pathlib import Path
import sys

# Find file containing function
for f in Path('${projectPath}').rglob('*.py' if '${language}' == 'python' else '*.ts'):
    try:
        src = f.read_text()
        if '${entryPoint}'.split('.')[-1] in src:
            cfg = extract_${language}_cfg(src, '${entryPoint}'.split('.')[-1])
            if cfg and cfg.blocks:
                print(f'## CFG: ${entryPoint}')
                print(f'Blocks: {len(cfg.blocks)}')
                print(f'Cyclomatic: {cfg.cyclomatic_complexity}')
                for i, b in enumerate(cfg.blocks[:10]):
                    print(f'  Block {i}: lines {b.start_line}-{b.end_line}')
                break
    except: pass
" 2>/dev/null`;
          output = execSync(cmd, {
            encoding: "utf-8",
            timeout: 10000,
            shell: "/bin/bash",
          });
          if (output.includes("CFG:")) {
            results.push(output.trim());
          }
          break;
        case "dfg":
          // DFG: track variable within a function
          const varTarget = varName || entryPoint;
          const funcForDfg = entryPoint.split(".").pop() || entryPoint;
          cmd = `cd "${TLDR_PATH}" && source .venv/bin/activate && python -c "
from tldr.dfg_extractor import extract_${language}_dfg
from pathlib import Path

for f in Path('${projectPath}').rglob('*.py' if '${language}' == 'python' else '*.ts'):
    if '.venv' in str(f) or 'node_modules' in str(f):
        continue
    try:
        src = f.read_text()
        if '${funcForDfg}' in src:
            dfg = extract_${language}_dfg(src, '${funcForDfg}')
            if dfg and dfg.var_refs:
                print(f'## DFG: ${varTarget} in ${funcForDfg}')
                refs = [r for r in dfg.var_refs if r.var_name == '${varTarget}' or '${varTarget}' in r.var_name]
                for r in refs[:15]:
                    print(f'  {r.category}: {r.var_name} @ line {r.line}')
                edges = [e for e in dfg.edges if '${varTarget}' in e.var_name]
                for e in edges[:10]:
                    print(f'  Flow: {e.var_name} from line {e.def_ref.line} -> {e.use_ref.line}')
                if refs or edges:
                    break
    except: pass
" 2>/dev/null`;
          output = execSync(cmd, {
            encoding: "utf-8",
            timeout: 10000,
            shell: "/bin/bash",
          });
          if (output.includes("DFG:")) {
            results.push(output.trim());
          }
          break;
        case "pdg":
          // PDG: program slice
          const targetLine = lineNumber || 0;
          cmd = `cd "${TLDR_PATH}" && source .venv/bin/activate && python -c "
from tldr.pdg_extractor import extract_${language}_pdg
from pathlib import Path

for f in Path('${projectPath}').rglob('*.py' if '${language}' == 'python' else '*.ts'):
    try:
        src = f.read_text()
        if '${entryPoint}'.split('.')[-1] in src:
            pdg = extract_${language}_pdg(src, '${entryPoint}'.split('.')[-1])
            if pdg and pdg.nodes:
                print(f'## PDG: ${entryPoint}')
                print(f'Nodes: {len(pdg.nodes)}')
                print(f'Control deps: {len([e for e in pdg.edges if e.dep_type == \"control\"])}')
                print(f'Data deps: {len([e for e in pdg.edges if e.dep_type == \"data\"])}')
                # Show nodes near target line
                if ${targetLine} > 0:
                    nearby = [n for n in pdg.nodes if abs(n.line - ${targetLine}) < 10]
                    for n in nearby[:10]:
                        print(f'  Line {n.line}: {n.node_type}')
                break
    except Exception as e:
        pass
" 2>/dev/null`;
          output = execSync(cmd, {
            encoding: "utf-8",
            timeout: 10000,
            shell: "/bin/bash",
          });
          if (output.includes("PDG:")) {
            results.push(output.trim());
          }
          break;
        case "ast":
          // AST: structure only
          cmd = `cd "${TLDR_PATH}" && source .venv/bin/activate && python -c "
from tldr.hybrid_extractor import HybridExtractor
from pathlib import Path

ext = HybridExtractor()
for f in Path('${projectPath}').rglob('*.py' if '${language}' == 'python' else '*.ts'):
    if '.venv' in str(f) or 'node_modules' in str(f):
        continue
    try:
        info = ext.extract(str(f))
        if info.functions or info.classes:
            print(f'## {f.name}')
            for fn in info.functions[:10]:
                print(f'  fn {fn.name}:{fn.line_number}')
            for cls in info.classes[:5]:
                print(f'  class {cls.name}:{cls.line_number}')
                for m in cls.methods[:5]:
                    print(f'    .{m.name}:{m.line_number}')
    except: pass
" 2>/dev/null | head -50`;
          output = execSync(cmd, {
            encoding: "utf-8",
            timeout: 10000,
            shell: "/bin/bash",
          });
          if (output.includes("##")) {
            results.push(output.trim());
          }
          break;
      }
    }
    return results.length > 0 ? results.join("\n\n") : null;
  } catch {
    return null;
  }
}
// Find project root
function findProjectRoot(startPath) {
  let current = startPath;
  const markers = [
    ".git",
    "pyproject.toml",
    "package.json",
    "Cargo.toml",
    "go.mod",
  ];
  while (current !== "/") {
    for (const marker of markers) {
      if (existsSync(join(current, marker))) {
        return current;
      }
    }
    current = dirname(current);
  }
  return startPath;
}
function readStdin() {
  return readFileSync(0, "utf-8");
}
async function main() {
  const input = JSON.parse(readStdin());
  if (input.tool_name !== "Task") {
    console.log("{}");
    return;
  }
  const prompt = input.tool_input.prompt || "";
  const description = input.tool_input.description || "";
  const fullText = `${prompt} ${description}`;
  // Skip if already has TLDR context
  if (
    prompt.includes("## Code Context:") ||
    prompt.includes("## CFG:") ||
    prompt.includes("## DFG:")
  ) {
    console.log("{}");
    return;
  }
  // Detect intent → choose layers
  const { layers, description: intentDesc } = detectIntent(fullText);
  // Extract targets
  const entryPoints = extractEntryPoints(fullText);
  const lineNumber = extractLineNumber(fullText);
  const varName = extractVariableName(fullText);
  if (entryPoints.length === 0 && !varName && !lineNumber) {
    console.log("{}");
    return;
  }
  // Find project and language
  const projectRoot = findProjectRoot(input.cwd);
  const language = detectLanguage(projectRoot);
  // Get TLDR context for the appropriate layers
  let tldrContext = null;
  let usedTarget = varName || entryPoints[0] || `line ${lineNumber}`;
  for (const entryPoint of entryPoints.slice(0, 3)) {
    tldrContext = getTldrContext(
      projectRoot,
      entryPoint,
      language,
      layers,
      lineNumber,
      varName,
    );
    if (tldrContext) {
      usedTarget = entryPoint;
      break;
    }
  }
  // Fallback: try with varName if we have it
  if (!tldrContext && varName) {
    tldrContext = getTldrContext(
      projectRoot,
      varName,
      language,
      layers,
      lineNumber,
      varName,
    );
  }
  if (!tldrContext) {
    console.log("{}");
    return;
  }
  // Inject context
  const enhancedPrompt = `## TLDR Context (${intentDesc}: ${layers.join("+")})

${tldrContext}

---
ORIGINAL TASK:
${prompt}`;
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: `Injected ${layers.join("+")} context for: ${usedTarget}`,
      updatedInput: {
        ...input.tool_input,
        prompt: enhancedPrompt,
      },
    },
  };
  console.log(JSON.stringify(output));
}
main().catch((err) => {
  console.error(`TLDR hook error: ${err.message}`);
  console.log("{}");
});
