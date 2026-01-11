/**
 * TLDR Context Injection Hook - Intent-Aware Version (DAEMON)
 *
 * Routes to different TLDR layers based on detected intent:
 * - "debug/investigate X" → Call Graph + CFG (what it calls, complexity)
 * - "where does Y come from" → DFG (data flow)
 * - "what affects line Z" → PDG (program slicing)
 * - "show structure" → AST only
 * - Default → Call Graph (navigation)
 *
 * Uses TLDR daemon for fast cached responses (50ms vs 500ms CLI).
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import {
  queryDaemonSync,
  contextDaemon,
  cfgDaemon,
  dfgDaemon,
  sliceDaemon,
  extractDaemon,
  DaemonResponse,
  trackHookActivitySync,
} from './daemon-client';

interface HookInput {
  session_id: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    prompt?: string;
    description?: string;
    subagent_type?: string;
  };
  cwd: string;
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
  };
  continue?: boolean;
  suppressOutput?: boolean;
}

// Intent detection patterns
type TldrLayer = 'call_graph' | 'cfg' | 'dfg' | 'pdg' | 'ast';

interface IntentPattern {
  patterns: RegExp[];
  layers: TldrLayer[];
  description: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
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
    layers: ['dfg'],
    description: 'data flow analysis'
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
    layers: ['pdg'],
    description: 'program slicing'
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
    layers: ['cfg'],
    description: 'control flow analysis'
  },
  {
    // Structure only
    patterns: [
      /list\s+(?:all\s+)?(?:functions?|methods?|classes?)/i,
      /show\s+structure/i,
      /what\s+(?:functions?|methods?)\s+(?:are\s+)?in/i,
      /overview\s+of/i,
    ],
    layers: ['ast'],
    description: 'structure overview'
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
    layers: ['call_graph', 'cfg'],
    description: 'debugging context'
  }
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
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'what', 'how',
  'can', 'you', 'fix', 'debug', 'investigate', 'look', 'check', 'analyze',
  'function', 'method', 'class', 'file', 'code', 'error', 'bug', 'issue',
  'please', 'help', 'need', 'want', 'should', 'could', 'would', 'make',
  'add', 'remove', 'update', 'change', 'modify', 'create', 'delete',
  'test', 'tests', 'run', 'build', 'install', 'start', 'stop',
  'where', 'does', 'come', 'from', 'affects', 'line', 'variable',
]);

// Detect intent from prompt
function detectIntent(prompt: string): { layers: TldrLayer[]; description: string } {
  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(prompt)) {
        return { layers: intent.layers, description: intent.description };
      }
    }
  }
  // Default: call graph for navigation
  return { layers: ['call_graph'], description: 'code navigation' };
}

// Detect language from project files
function detectLanguage(projectPath: string): string {
  const indicators: Record<string, string[]> = {
    python: ['pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile'],
    typescript: ['tsconfig.json', 'package.json'],
    rust: ['Cargo.toml'],
    go: ['go.mod', 'go.sum'],
  };

  for (const [lang, files] of Object.entries(indicators)) {
    for (const file of files) {
      if (existsSync(join(projectPath, file))) {
        return lang;
      }
    }
  }
  return 'python';
}

// Extract potential entry points from prompt
function extractEntryPoints(prompt: string): string[] {
  const candidates: Set<string> = new Set();

  for (const pattern of FUNCTION_PATTERNS) {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const candidate = match[1];
      if (candidate &&
          candidate.length > 2 &&
          !EXCLUDE_WORDS.has(candidate.toLowerCase())) {
        candidates.add(candidate);
      }
    }
  }

  return Array.from(candidates).sort((a, b) => {
    const aHasDot = a.includes('.');
    const bHasDot = b.includes('.');
    if (aHasDot && !bHasDot) return -1;
    if (bHasDot && !aHasDot) return 1;
    return b.length - a.length;
  });
}

// Extract line number if mentioned
function extractLineNumber(prompt: string): number | null {
  const match = prompt.match(/line\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// Extract variable name for DFG
function extractVariableName(prompt: string): string | null {
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

// Get TLDR context using daemon (fast, cached)
function getTldrContext(
  projectPath: string,
  entryPoint: string,
  language: string,
  layers: TldrLayer[],
  lineNumber?: number | null,
  varName?: string | null
): string | null {
  const results: string[] = [];

  try {
    for (const layer of layers) {
      switch (layer) {
        case 'call_graph': {
          // Use daemon context command
          const response = queryDaemonSync(
            { cmd: 'context', entry: entryPoint, language, depth: 2 },
            projectPath
          );
          if (response.status === 'ok' && response.result) {
            const ctx = response.result;
            const lines: string[] = [`## Context: ${entryPoint}`];
            if (ctx.entry_point) {
              lines.push(`📍 ${ctx.entry_point.file}:${ctx.entry_point.line}`);
              if (ctx.entry_point.signature) {
                lines.push(`  ${ctx.entry_point.signature}`);
              }
            }
            if (ctx.callees && ctx.callees.length > 0) {
              lines.push(`\nCalls:`);
              for (const c of ctx.callees.slice(0, 10)) {
                lines.push(`  → ${c.function} (${c.file}:${c.line})`);
              }
            }
            if (ctx.callers && ctx.callers.length > 0) {
              lines.push(`\nCalled by:`);
              for (const c of ctx.callers.slice(0, 10)) {
                lines.push(`  ← ${c.function} (${c.file}:${c.line})`);
              }
            }
            results.push(lines.join('\n'));
          }
          break;
        }

        case 'cfg': {
          // Use daemon cfg command - need to find file first
          const searchResp = queryDaemonSync(
            { cmd: 'search', pattern: `def ${entryPoint}` },
            projectPath
          );
          if (searchResp.results && searchResp.results.length > 0) {
            const file = searchResp.results[0].file;
            const cfgResp = queryDaemonSync(
              { cmd: 'cfg', file, function: entryPoint, language },
              projectPath
            );
            if (cfgResp.status === 'ok' && cfgResp.result) {
              const cfg = cfgResp.result;
              const lines: string[] = [`## CFG: ${entryPoint}`];
              lines.push(`Blocks: ${cfg.num_blocks || 'N/A'}`);
              lines.push(`Cyclomatic: ${cfg.cyclomatic_complexity || 'N/A'}`);
              if (cfg.blocks && Array.isArray(cfg.blocks)) {
                for (const b of cfg.blocks.slice(0, 8)) {
                  lines.push(`  Block ${b.id}: lines ${b.start_line}-${b.end_line} (${b.block_type})`);
                }
              }
              results.push(lines.join('\n'));
            }
          }
          break;
        }

        case 'dfg': {
          // Use daemon dfg command
          const funcForDfg = entryPoint.split('.').pop() || entryPoint;
          const searchResp = queryDaemonSync(
            { cmd: 'search', pattern: `def ${funcForDfg}` },
            projectPath
          );
          if (searchResp.results && searchResp.results.length > 0) {
            const file = searchResp.results[0].file;
            const dfgResp = queryDaemonSync(
              { cmd: 'dfg', file, function: funcForDfg, language },
              projectPath
            );
            if (dfgResp.status === 'ok' && dfgResp.result) {
              const dfg = dfgResp.result;
              const varTarget = varName || entryPoint;
              const lines: string[] = [`## DFG: ${varTarget} in ${funcForDfg}`];
              if (dfg.definitions && Array.isArray(dfg.definitions)) {
                lines.push('Definitions:');
                for (const d of dfg.definitions.slice(0, 10)) {
                  lines.push(`  ${d.var_name} @ line ${d.line}`);
                }
              }
              if (dfg.uses && Array.isArray(dfg.uses)) {
                lines.push('Uses:');
                for (const u of dfg.uses.slice(0, 8)) {
                  lines.push(`  ${u.var_name} @ line ${u.line}`);
                }
              }
              results.push(lines.join('\n'));
            }
          }
          break;
        }

        case 'pdg': {
          // Use daemon slice command for PDG
          const targetLine = lineNumber || 10;  // Default to line 10 if no line specified
          const searchResp = queryDaemonSync(
            { cmd: 'search', pattern: `def ${entryPoint}` },
            projectPath
          );
          if (searchResp.results && searchResp.results.length > 0) {
            const file = searchResp.results[0].file;
            const sliceResp = queryDaemonSync(
              { cmd: 'slice', file, function: entryPoint, line: targetLine, direction: 'backward' },
              projectPath
            );
            if (sliceResp.status === 'ok' && sliceResp.result) {
              const slice = sliceResp.result;
              const lines: string[] = [`## PDG Slice: ${entryPoint} @ line ${targetLine}`];
              if (slice.lines && Array.isArray(slice.lines)) {
                lines.push(`Slice lines: ${slice.lines.length}`);
                for (const ln of slice.lines.slice(0, 15)) {
                  lines.push(`  Line ${ln}`);
                }
              }
              if (slice.variables && Array.isArray(slice.variables)) {
                lines.push(`Variables: ${slice.variables.join(', ')}`);
              }
              results.push(lines.join('\n'));
            }
          }
          break;
        }

        case 'ast': {
          // Use daemon structure command
          const structResp = queryDaemonSync(
            { cmd: 'structure', language, max_results: 20 },
            projectPath
          );
          if (structResp.status === 'ok' && structResp.result) {
            const struct = structResp.result;
            const lines: string[] = [`## Structure Overview`];
            if (struct.files && Array.isArray(struct.files)) {
              for (const file of struct.files.slice(0, 10)) {
                lines.push(`\n### ${file.path || file.file}`);
                if (file.functions && Array.isArray(file.functions)) {
                  for (const fn of file.functions.slice(0, 8)) {
                    lines.push(`  fn ${fn.name}:${fn.line}`);
                  }
                }
                if (file.classes && Array.isArray(file.classes)) {
                  for (const cls of file.classes.slice(0, 5)) {
                    lines.push(`  class ${cls.name}:${cls.line}`);
                  }
                }
              }
            }
            results.push(lines.join('\n'));
          }
          break;
        }
      }
    }

    return results.length > 0 ? results.join('\n\n') : null;
  } catch {
    return null;
  }
}

// Find project root
function findProjectRoot(startPath: string): string {
  let current = startPath;
  const markers = ['.git', 'pyproject.toml', 'package.json', 'Cargo.toml', 'go.mod'];

  while (current !== '/') {
    for (const marker of markers) {
      if (existsSync(join(current, marker))) {
        return current;
      }
    }
    current = dirname(current);
  }
  return startPath;
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

async function main() {
  const input: HookInput = JSON.parse(readStdin());

  if (input.tool_name !== 'Task') {
    console.log('{}');
    return;
  }

  const prompt = input.tool_input.prompt || '';
  const description = input.tool_input.description || '';
  const fullText = `${prompt} ${description}`;

  // Skip if already has TLDR context
  if (prompt.includes('## Code Context:') || prompt.includes('## CFG:') || prompt.includes('## DFG:')) {
    console.log('{}');
    return;
  }

  // Detect intent → choose layers
  const { layers, description: intentDesc } = detectIntent(fullText);

  // Extract targets
  const entryPoints = extractEntryPoints(fullText);
  const lineNumber = extractLineNumber(fullText);
  const varName = extractVariableName(fullText);

  if (entryPoints.length === 0 && !varName && !lineNumber) {
    console.log('{}');
    return;
  }

  // Find project and language
  const projectRoot = findProjectRoot(input.cwd);
  const language = detectLanguage(projectRoot);

  // Get TLDR context for the appropriate layers
  let tldrContext: string | null = null;
  let usedTarget: string = varName || entryPoints[0] || `line ${lineNumber}`;

  for (const entryPoint of entryPoints.slice(0, 3)) {
    tldrContext = getTldrContext(projectRoot, entryPoint, language, layers, lineNumber, varName);
    if (tldrContext) {
      usedTarget = entryPoint;
      break;
    }
  }

  // Fallback: try with varName if we have it
  if (!tldrContext && varName) {
    tldrContext = getTldrContext(projectRoot, varName, language, layers, lineNumber, varName);
  }

  if (!tldrContext) {
    console.log('{}');
    return;
  }

  // Inject context
  const enhancedPrompt = `## TLDR Context (${intentDesc}: ${layers.join('+')})

${tldrContext}

---
ORIGINAL TASK:
${prompt}`;

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `Injected ${layers.join('+')} context for: ${usedTarget}`,
      updatedInput: {
        ...input.tool_input,
        prompt: enhancedPrompt,
      }
    }
  };

  // Track hook activity for flush threshold
  trackHookActivitySync('tldr-context-inject', projectRoot, true, {
    context_injected: 1,
    layers_used: layers.length,
  });

  console.log(JSON.stringify(output));
}

main().catch((err) => {
  console.error(`TLDR hook error: ${err.message}`);
  console.log('{}');
});
