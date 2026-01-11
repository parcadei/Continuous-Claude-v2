/**
 * Signature Helper Hook (PreToolUse:Edit)
 *
 * When Claude edits code containing function calls, inject the function signatures.
 * Uses TLDR daemon for fast function lookup (replaces CLI spawning).
 */

import { readFileSync } from 'fs';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    new_string?: string;
  };
  session_id?: string;
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

interface TLDRSearchResult {
  file: string;
  line: number;
  content: string;
}

interface TLDRFunction {
  name: string;
  signature: string;
  params: string[];
}

interface TLDRExtract {
  functions: TLDRFunction[];
}

// Keywords and builtins to skip
const SKIP_NAMES = new Set([
  'if', 'for', 'while', 'with', 'except', 'match', 'case',
  'print', 'len', 'str', 'int', 'list', 'dict', 'set', 'tuple',
  'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
  'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'super',
  'open', 'input', 'any', 'all', 'min', 'max', 'sum', 'abs',
  'require', 'import', 'export', 'return', 'const', 'let', 'var',
  'function', 'async', 'await', 'new', 'this', 'class', 'extends'
]);

function extractFunctionCalls(code: string): string[] {
  // Match function calls: name(
  const callRe = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const calls = new Set<string>();
  let match;
  while ((match = callRe.exec(code)) !== null) {
    const name = match[1];
    if (!SKIP_NAMES.has(name)) {
      calls.add(name);
    }
  }
  return Array.from(calls);
}

/**
 * Find the file containing a function definition using TLDR daemon.
 */
function findFunctionFile(funcName: string, projectDir: string): string | null {
  try {
    const response = queryDaemonSync(
      { cmd: 'search', pattern: `def ${funcName}` },
      projectDir
    );

    // Skip if daemon is indexing or unavailable
    if (response.indexing || response.status === 'unavailable' || response.status === 'error') {
      return null;
    }

    if (response.results && response.results.length > 0) {
      return `${projectDir}/${response.results[0].file}`;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Get function signature from TLDR daemon extract.
 */
function getSignatureFromTLDR(funcName: string, filePath: string): string | null {
  try {
    const projectDir = getProjectDir();
    const response = queryDaemonSync(
      { cmd: 'extract', file: filePath },
      projectDir
    );

    // Skip if daemon is indexing or unavailable
    if (response.indexing || response.status === 'unavailable' || response.status === 'error') {
      return null;
    }

    const extract = response.result as TLDRExtract | undefined;
    if (!extract?.functions) {
      return null;
    }

    for (const func of extract.functions) {
      if (func.name === funcName || func.name === `async ${funcName}`) {
        return func.signature;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function getProjectDir(): string {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

async function main() {
  const input: HookInput = JSON.parse(readFileSync(0, 'utf-8'));

  if (input.tool_name !== 'Edit') {
    console.log('{}');
    return;
  }

  const newCode = input.tool_input.new_string || '';
  if (!newCode || newCode.length < 10) {
    console.log('{}');
    return;
  }

  // Find function calls in the new code
  const calls = extractFunctionCalls(newCode);
  if (calls.length === 0) {
    console.log('{}');
    return;
  }

  const projectDir = getProjectDir();
  const signatures: string[] = [];

  // Look up signatures for first 5 calls (limit for performance)
  for (const call of calls.slice(0, 5)) {
    const filePath = findFunctionFile(call, projectDir);
    if (filePath) {
      const sig = getSignatureFromTLDR(call, filePath);
      if (sig) {
        signatures.push(sig);
      }
    }
  }

  if (signatures.length === 0) {
    console.log('{}');
    return;
  }

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `[Signatures from TLDR]\n${signatures.join('\n')}`
    }
  };

  // Track hook activity for flush threshold
  trackHookActivitySync('signature-helper', projectDir, true, {
    edits_checked: 1,
    signatures_found: signatures.length,
  });

  console.log(JSON.stringify(output));
}

main().catch(() => console.log('{}'));
