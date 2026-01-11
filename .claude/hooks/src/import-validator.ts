/**
 * Import Validator Hook (PostToolUse)
 *
 * After Write/Edit, checks if imports reference symbols that exist.
 * Uses TLDR daemon for fast symbol lookup (replaces CLI spawning).
 */

import { readFileSync } from 'fs';
import { basename } from 'path';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
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

/**
 * Search for a pattern using TLDR daemon.
 * Returns empty array if daemon is unavailable or indexing.
 */
function tldrSearch(pattern: string, projectDir: string = '.'): TLDRSearchResult[] {
  try {
    const response = queryDaemonSync({ cmd: 'search', pattern }, projectDir);

    // Skip if daemon is indexing or unavailable
    if (response.indexing || response.status === 'unavailable' || response.status === 'error') {
      return [];
    }

    if (response.results) {
      return response.results as TLDRSearchResult[];
    }

    return [];
  } catch {
    return [];
  }
}

function extractPythonImports(code: string): Array<{module: string, symbols: string[]}> {
  const imports: Array<{module: string, symbols: string[]}> = [];

  // from X import Y, Z
  const fromImportRe = /from\s+([\w.]+)\s+import\s+([^#\n]+)/g;
  let match;
  while ((match = fromImportRe.exec(code)) !== null) {
    const module = match[1];
    const symbols = match[2].split(',').map(s => s.trim().split(' as ')[0].trim()).filter(s => s && s !== '*');
    if (symbols.length > 0) {
      imports.push({ module, symbols });
    }
  }

  return imports;
}

function checkSymbolExists(symbol: string): { exists: boolean, location?: string } {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';

  // Search for function or class definition
  const funcResults = tldrSearch(`def ${symbol}`, projectDir);
  if (funcResults.length > 0) {
    return { exists: true, location: `${funcResults[0].file}:${funcResults[0].line}` };
  }

  const classResults = tldrSearch(`class ${symbol}`, projectDir);
  if (classResults.length > 0) {
    return { exists: true, location: `${classResults[0].file}:${classResults[0].line}` };
  }

  return { exists: false };
}

async function main() {
  const input: HookInput = JSON.parse(readFileSync(0, 'utf-8'));

  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') {
    console.log('{}');
    return;
  }

  // Get the code that was written/edited
  const code = input.tool_input.content || input.tool_input.new_string || '';
  if (!code) {
    console.log('{}');
    return;
  }

  // Only check Python files for now
  const filePath = input.tool_input.file_path || '';
  if (!filePath.endsWith('.py')) {
    console.log('{}');
    return;
  }

  // Extract and validate imports
  const imports = extractPythonImports(code);
  const warnings: string[] = [];

  for (const imp of imports) {
    for (const symbol of imp.symbols) {
      const check = checkSymbolExists(symbol);
      if (check.exists && check.location) {
        // Check if import path matches actual location
        const expectedModule = imp.module.replace(/\./g, '/');
        if (!check.location.includes(expectedModule)) {
          const actualFile = basename(check.location.split(':')[0]);
          warnings.push(`${symbol}: imported from ${imp.module} but defined in ${actualFile}`);
        }
      }
    }
  }

  if (warnings.length === 0) {
    console.log('{}');
    return;
  }

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `[Import check]\n${warnings.join('\n')}`
    }
  };

  // Track hook activity for flush threshold
  const projectDir = process.env.CLAUDE_PROJECT_DIR || '.';
  trackHookActivitySync('import-validator', projectDir, true, {
    writes_validated: 1,
    warnings_found: warnings.length,
  });

  console.log(JSON.stringify(output));
}

main().catch(() => console.log('{}'));
