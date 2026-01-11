/**
 * PreToolUse Hook: Architecture Context Injection
 *
 * When a Task prompt mentions planning, design, or architecture keywords,
 * this hook runs `tldr arch` and injects the architectural layer information
 * into the prompt.
 *
 * This gives agents/subagents architectural context for better planning.
 */

import { readFileSync, existsSync } from 'fs';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

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
}

interface ArchLayers {
  entry?: string[];
  service?: string[];
  util?: string[];
  leaf?: string[];
  [key: string]: string[] | undefined;
}

interface ArchResult {
  layers: ArchLayers;
  circular?: string[];
}

// Planning-related keywords that trigger arch injection
const PLANNING_PATTERNS = [
  /\bplan\b/i,
  /\bdesign\b/i,
  /\barchitecture\b/i,
  /\brefactor\b/i,
  /\brestructure\b/i,
  /\breorganize\b/i,
  /\bmodularize\b/i,
  /\bsplit\s+(?:into|up)\b/i,
  /\bextract\s+(?:to|into)\b/i,
  /\bcreate\s+(?:new\s+)?(?:module|package|service)\b/i,
];

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

// Detect if prompt mentions planning/architecture
function hasPlanningIntent(text: string): boolean {
  return PLANNING_PATTERNS.some(pattern => pattern.test(text));
}

// Query daemon for architecture analysis (fast - uses in-memory indexes)
function getArchitecture(projectPath: string): ArchResult | null {
  try {
    const response = queryDaemonSync({ cmd: 'arch', language: 'python' }, projectPath);

    // Handle daemon unavailable or errors
    if (response.status === 'unavailable' || response.status === 'error') {
      return null;
    }

    // Handle indexing state
    if (response.indexing) {
      return null;
    }

    // Parse result from daemon
    const result = response.result;
    if (!result) {
      return null;
    }

    const layers: ArchLayers = {};

    // Entry layer functions
    if (result.entry_layer && Array.isArray(result.entry_layer)) {
      layers.entry = result.entry_layer.slice(0, 15).map((f: { file: string; function: string }) =>
        `${f.file}:${f.function}`
      );
    }

    // Leaf layer functions
    if (result.leaf_layer && Array.isArray(result.leaf_layer)) {
      layers.leaf = result.leaf_layer.slice(0, 15).map((f: { file: string; function: string }) =>
        `${f.file}:${f.function}`
      );
    }

    // Circular dependencies
    const circular = result.circular_dependencies?.map((c: { a: string; b: string }) =>
      `${c.a} <-> ${c.b}`
    );

    if (Object.keys(layers).length === 0) {
      return null;
    }

    return { layers, circular };
  } catch {
    return null;
  }
}

// Format architecture context for injection
function formatArchContext(arch: ArchResult): string {
  const lines: string[] = ['## Architecture Layers'];

  for (const [layer, files] of Object.entries(arch.layers)) {
    if (!files || files.length === 0) continue;

    lines.push('');
    lines.push(`### ${layer.toUpperCase()}`);
    for (const file of files.slice(0, 10)) {
      lines.push(`- ${file}`);
    }
    if (files.length > 10) {
      lines.push(`- ... and ${files.length - 10} more`);
    }
  }

  if (arch.circular && arch.circular.length > 0) {
    lines.push('');
    lines.push('### Circular Dependencies (WARNING)');
    for (const dep of arch.circular.slice(0, 5)) {
      lines.push(`- ${dep}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  const input: HookInput = JSON.parse(readStdin());

  // Only intercept Task tool
  if (input.tool_name !== 'Task') {
    console.log('{}');
    return;
  }

  const prompt = input.tool_input.prompt || '';
  const description = input.tool_input.description || '';
  const fullText = `${prompt} ${description}`;

  // Skip if no planning intent detected
  if (!hasPlanningIntent(fullText)) {
    console.log('{}');
    return;
  }

  // Skip if already has architecture context
  if (prompt.includes('## Architecture') || prompt.includes('### ENTRY') || prompt.includes('### SERVICE')) {
    console.log('{}');
    return;
  }

  // Get project path
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;

  if (!projectDir || !existsSync(projectDir)) {
    console.log('{}');
    return;
  }

  // Get architecture
  const arch = getArchitecture(projectDir);

  if (!arch) {
    console.log('{}');
    return;
  }

  // Format and inject context
  const archContext = formatArchContext(arch);

  const enhancedPrompt = `${archContext}

---

${prompt}`;

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Injected architecture context for planning task',
      updatedInput: {
        ...input.tool_input,
        prompt: enhancedPrompt,
      },
    },
  };

  // Track hook activity for flush threshold
  trackHookActivitySync('arch-context-inject', projectDir, true, {
    tasks_processed: 1,
    arch_injected: 1,
  });

  console.log(JSON.stringify(output));
}

main().catch(() => {
  // Silent fail - don't block task execution
  console.log('{}');
});
