/**
 * Pre-Edit Context Injection Hook
 *
 * Injects file structure from TLDR before Claude edits a file.
 * Uses TLDR daemon for fast code extraction (replaces CLI spawning).
 */

import { readFileSync } from 'fs';
import { basename } from 'path';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    old_string?: string;
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

interface TLDRFunction {
  name: string;
  signature: string;
  params: string[];
}

interface TLDRExtract {
  file_path: string;
  language: string;
  classes: Array<{ name: string }>;
  functions: TLDRFunction[];
  imports: string[];
}

interface TLDRImport {
  module: string;
  names?: string[];
  alias?: string;
}

/**
 * Get imports for a file using TLDR daemon.
 */
function getTLDRImports(filePath: string): TLDRImport[] {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const response = queryDaemonSync(
      { cmd: 'imports', file: filePath },
      projectDir
    );

    if (response.indexing || response.status === 'unavailable' || response.status === 'error') {
      return [];
    }

    if (response.imports && Array.isArray(response.imports)) {
      return response.imports as TLDRImport[];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Get file structure using TLDR daemon extract command.
 * @param sessionId - Optional session ID for token tracking
 */
function getTLDRExtract(filePath: string, sessionId?: string): TLDRExtract | null {
  try {
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const response = queryDaemonSync(
      { cmd: 'extract', file: filePath, session: sessionId },
      projectDir
    );

    // Skip if daemon is indexing or unavailable
    if (response.indexing || response.status === 'unavailable' || response.status === 'error') {
      return null;
    }

    if (response.result) {
      return response.result as TLDRExtract;
    }

    return null;
  } catch {
    return null;
  }
}

async function main() {
  const input: HookInput = JSON.parse(readFileSync(0, 'utf-8'));

  if (input.tool_name !== 'Edit') {
    console.log('{}');
    return;
  }

  const filePath = input.tool_input.file_path;
  if (!filePath) {
    console.log('{}');
    return;
  }

  // Get file structure from TLDR (pass session_id for token tracking)
  const extract = getTLDRExtract(filePath, input.session_id);
  const imports = getTLDRImports(filePath);

  const classCount = extract?.classes?.length || 0;
  const funcCount = extract?.functions?.length || 0;
  const importCount = imports.length;
  const total = classCount + funcCount;

  if (total === 0 && importCount === 0) {
    console.log('{}');
    return;
  }

  // Build compact context message
  const parts: string[] = [];

  // Show imports first - important for understanding dependencies
  if (importCount > 0) {
    const importModules = imports.slice(0, 8).map(i => i.module);
    parts.push(`Dependencies: ${importModules.join(', ')}${importCount > 8 ? '...' : ''}`);
  }

  if (classCount > 0 && extract) {
    const classNames = extract.classes.map(c => c.name).slice(0, 10);
    parts.push(`Classes: ${classNames.join(', ')}${classCount > 10 ? '...' : ''}`);
  }

  if (funcCount > 0 && extract) {
    // Show function names with param counts for quick reference
    const funcSummaries = extract.functions.slice(0, 12).map(f => {
      const paramCount = f.params?.length || 0;
      return paramCount > 0 ? `${f.name}(${paramCount})` : f.name;
    });
    parts.push(`Functions: ${funcSummaries.join(', ')}${funcCount > 12 ? '...' : ''}`);
  }

  const symbolInfo = total > 0 ? `${total} symbols` : '';
  const depInfo = importCount > 0 ? `${importCount} deps` : '';
  const summary = [symbolInfo, depInfo].filter(Boolean).join(', ');

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: `[Edit context: ${basename(filePath)} - ${summary}]\n${parts.join('\n')}`
    }
  };

  // Track hook activity for flush threshold
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  trackHookActivitySync('edit-context-inject', projectDir, true, {
    edits_processed: 1,
    symbols_shown: total,
  });

  console.log(JSON.stringify(output));
}

main().catch(() => console.log('{}'));
