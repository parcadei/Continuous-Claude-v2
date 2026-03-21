/**
 * Post-Edit Diagnostics Hook
 *
 * Runs shift-left diagnostics after file edits.
 * - Python: Queries TLDR daemon for pyright + ruff diagnostics
 * - TypeScript/JavaScript: Runs tsc --noEmit directly
 * Provides early feedback before tests run.
 */

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { queryDaemonSync, trackHookActivitySync } from './daemon-client.js';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
  };
  tool_result?: {
    success?: boolean;
  };
}

interface HookOutput {
  hookSpecificOutput?: {
    hookEventName: string;
    additionalContext?: string;
  };
}

async function main() {
  const input: HookInput = JSON.parse(readFileSync(0, 'utf-8'));

  // Only run on Edit and Write operations
  if (input.tool_name !== 'Edit' && input.tool_name !== 'Write') {
    console.log('{}');
    return;
  }

  const filePath = input.tool_input?.file_path;
  if (!filePath) {
    console.log('{}');
    return;
  }

  // Code file extensions we care about
  const codeExtensions = [
    // Python (has linters: pyright + ruff)
    '.py', '.pyx', '.pyi',
    // TypeScript/JavaScript (has linter: tsc --noEmit)
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    // Go (TODO: add go vet)
    '.go',
    // Rust (TODO: add clippy)
    '.rs',
    // Java
    '.java',
    // C/C++
    '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.hh',
    // Ruby
    '.rb',
    // C#
    '.cs',
  ];

  const ext = filePath.substring(filePath.lastIndexOf('.'));

  // Skip non-code files entirely
  if (!codeExtensions.includes(ext)) {
    console.log('{}');
    return;
  }

  // Language-aware routing
  const pythonExtensions = ['.py', '.pyx', '.pyi'];
  const tsJsExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  if (pythonExtensions.includes(ext)) {
    // Python path: query TLDR daemon for pyright + ruff diagnostics
    runPythonDiagnostics(filePath, projectDir);
  } else if (tsJsExtensions.includes(ext)) {
    // TypeScript/JavaScript path: run tsc --noEmit directly
    runTscDiagnostics(filePath, projectDir);
  } else {
    // Other code extensions: no linter configured yet
    console.log('{}');
  }
}

/** Run Python diagnostics via TLDR daemon (pyright + ruff) */
function runPythonDiagnostics(filePath: string, projectDir: string): void {
  try {
    const response = queryDaemonSync(
      { cmd: 'diagnostics', file: filePath },
      projectDir
    );

    // If daemon is unavailable or no errors, silently succeed
    if (response.status === 'unavailable' || response.error) {
      console.log('{}');
      return;
    }

    // Handle both direct response and summary-wrapped response formats
    const summary = (response as any).summary || response;
    const typeErrors = summary.type_errors || 0;
    const lintIssues = summary.lint_errors || summary.lint_issues || 0;
    const errors = response.errors || [];

    // Track hook activity
    trackHookActivitySync('post-edit-diagnostics', projectDir, true, {
      edits_analyzed: 1,
      type_errors: typeErrors,
      lint_issues: lintIssues,
    });

    // No errors - silent success
    if (typeErrors === 0 && lintIssues === 0) {
      console.log('{}');
      return;
    }

    // Build error summary
    const lines: string[] = [];
    lines.push(`Diagnostics: ${typeErrors} type errors, ${lintIssues} lint issues`);

    const maxPreviews = 5;
    const previews = errors.slice(0, maxPreviews);

    for (const err of previews) {
      const location = err.column
        ? `${err.file}:${err.line}:${err.column}`
        : `${err.file}:${err.line}`;
      lines.push(`   - ${location}: ${err.message}`);
    }

    if (errors.length > maxPreviews) {
      const remaining = errors.length - maxPreviews;
      lines.push(`   ... and ${remaining} more`);
    }

    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: lines.join('\n')
      }
    };
    console.log(JSON.stringify(output));
  } catch {
    // Daemon error - silently ignore (graceful degradation)
    console.log('{}');
  }
}

/** Regex for parsing tsc --noEmit --pretty false output lines */
const TSC_LINE_REGEX = /^(.+)\((\d+),(\d+)\): (error|warning) TS(\d+): (.+)$/;

interface TscDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  code: number;
  message: string;
}

/** Parse tsc --pretty false output into structured diagnostics */
function parseTscOutput(stdout: string): TscDiagnostic[] {
  const diagnostics: TscDiagnostic[] = [];
  for (const line of stdout.split('\n')) {
    const match = line.match(TSC_LINE_REGEX);
    if (match) {
      diagnostics.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: match[4] as 'error' | 'warning',
        code: parseInt(match[5], 10),
        message: match[6],
      });
    }
  }
  return diagnostics;
}

/** Run TypeScript/JavaScript diagnostics via tsc --noEmit */
function runTscDiagnostics(filePath: string, projectDir: string): void {
  try {
    const result = spawnSync('tsc', ['--noEmit', '--pretty', 'false'], {
      cwd: projectDir,
      timeout: 30000,
      encoding: 'utf-8',
    });

    // tsc not found or process error - silently skip
    if (result.error || result.status === null) {
      console.log('{}');
      return;
    }

    // Parse tsc output (tsc returns non-zero on type errors, which is expected)
    const diagnostics = parseTscOutput(result.stdout || '');

    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

    // Track hook activity
    trackHookActivitySync('post-edit-diagnostics', projectDir, true, {
      edits_analyzed: 1,
      type_errors: errorCount,
      lint_issues: warningCount,
    });

    // No diagnostics - silent success
    if (diagnostics.length === 0) {
      console.log('{}');
      return;
    }

    // Build error summary
    const lines: string[] = [];
    lines.push(`Diagnostics: ${errorCount} type errors, ${warningCount} warnings`);

    const maxPreviews = 5;
    const previews = diagnostics.slice(0, maxPreviews);

    for (const d of previews) {
      lines.push(`   - ${d.file}:${d.line}:${d.column}: ${d.message}`);
    }

    if (diagnostics.length > maxPreviews) {
      const remaining = diagnostics.length - maxPreviews;
      lines.push(`   ... and ${remaining} more`);
    }

    const output: HookOutput = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: lines.join('\n')
      }
    };
    console.log(JSON.stringify(output));
  } catch {
    // tsc error - silently ignore (graceful degradation)
    console.log('{}');
  }
}

main().catch(() => console.log('{}'));
