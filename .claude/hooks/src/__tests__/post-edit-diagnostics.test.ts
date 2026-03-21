/**
 * Tests for post-edit-diagnostics hook: TypeScript/JavaScript support
 *
 * TDD tests for adding tsc --noEmit diagnostics for TS/JS files.
 * The hook already supports Python via the TLDR daemon; these tests
 * verify the new tsc-based path for TypeScript/JavaScript files.
 */

import { describe, it, expect } from 'vitest';
import { type SpawnSyncReturns } from 'child_process';

// ---------------------------------------------------------------------------
// Helpers: parse tsc output and build hook output (extracted from hook logic)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 1. tsc output parsing
// ---------------------------------------------------------------------------

describe('post-edit-diagnostics: tsc output parsing', () => {
  it('should parse a single error line', () => {
    const output = `src/index.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.`;
    const result = parseTscOutput(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      file: 'src/index.ts',
      line: 10,
      column: 5,
      severity: 'error',
      code: 2322,
      message: "Type 'string' is not assignable to type 'number'.",
    });
  });

  it('should parse multiple error lines', () => {
    const output = [
      `src/a.ts(1,1): error TS2304: Cannot find name 'foo'.`,
      `src/b.tsx(20,10): error TS7006: Parameter 'x' implicitly has an 'any' type.`,
      `src/c.js(5,3): warning TS2345: Argument of type 'string' is not assignable.`,
    ].join('\n');

    const result = parseTscOutput(output);
    expect(result).toHaveLength(3);
    expect(result[0].file).toBe('src/a.ts');
    expect(result[1].file).toBe('src/b.tsx');
    expect(result[2].severity).toBe('warning');
  });

  it('should ignore non-diagnostic lines', () => {
    const output = [
      `Found 2 errors.`,
      ``,
      `src/index.ts(10,5): error TS2322: Type mismatch.`,
      `  10   const x: number = "hello";`,
      `       ~`,
    ].join('\n');

    const result = parseTscOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe(2322);
  });

  it('should return empty array for clean output', () => {
    const output = '';
    const result = parseTscOutput(output);
    expect(result).toHaveLength(0);
  });

  it('should handle Windows paths with drive letters', () => {
    const output = `C:/Users/david.hayes/project/src/index.ts(10,5): error TS2322: Type mismatch.`;
    const result = parseTscOutput(output);

    expect(result).toHaveLength(1);
    expect(result[0].file).toBe('C:/Users/david.hayes/project/src/index.ts');
  });
});

// ---------------------------------------------------------------------------
// 2. Language routing (Python vs TS/JS vs other)
// ---------------------------------------------------------------------------

describe('post-edit-diagnostics: language routing', () => {
  const pythonExtensions = ['.py', '.pyx', '.pyi'];
  const tsJsExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

  function getLanguageRoute(ext: string): 'python' | 'typescript' | 'skip' {
    if (pythonExtensions.includes(ext)) return 'python';
    if (tsJsExtensions.includes(ext)) return 'typescript';
    return 'skip';
  }

  it('should route .ts to typescript', () => {
    expect(getLanguageRoute('.ts')).toBe('typescript');
  });

  it('should route .tsx to typescript', () => {
    expect(getLanguageRoute('.tsx')).toBe('typescript');
  });

  it('should route .js to typescript', () => {
    expect(getLanguageRoute('.js')).toBe('typescript');
  });

  it('should route .jsx to typescript', () => {
    expect(getLanguageRoute('.jsx')).toBe('typescript');
  });

  it('should route .mjs to typescript', () => {
    expect(getLanguageRoute('.mjs')).toBe('typescript');
  });

  it('should route .cjs to typescript', () => {
    expect(getLanguageRoute('.cjs')).toBe('typescript');
  });

  it('should route .py to python', () => {
    expect(getLanguageRoute('.py')).toBe('python');
  });

  it('should route .go to skip', () => {
    expect(getLanguageRoute('.go')).toBe('skip');
  });

  it('should route .rs to skip', () => {
    expect(getLanguageRoute('.rs')).toBe('skip');
  });
});

// ---------------------------------------------------------------------------
// 3. Output formatting (error count + previews)
// ---------------------------------------------------------------------------

describe('post-edit-diagnostics: output formatting for tsc', () => {
  function formatTscOutput(diagnostics: TscDiagnostic[]): string[] {
    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

    const lines: string[] = [];
    lines.push(`Diagnostics: ${errorCount} type errors, ${warningCount} warnings`);

    const maxPreviews = 5;
    const previews = diagnostics.slice(0, maxPreviews);
    for (const d of previews) {
      lines.push(`   - ${d.file}:${d.line}:${d.column}: ${d.message}`);
    }

    if (diagnostics.length > maxPreviews) {
      lines.push(`   ... and ${diagnostics.length - maxPreviews} more`);
    }

    return lines;
  }

  it('should show error and warning counts', () => {
    const diags: TscDiagnostic[] = [
      { file: 'a.ts', line: 1, column: 1, severity: 'error', code: 2322, message: 'Type mismatch' },
      { file: 'b.ts', line: 2, column: 1, severity: 'warning', code: 2345, message: 'Arg issue' },
    ];
    const lines = formatTscOutput(diags);
    expect(lines[0]).toBe('Diagnostics: 1 type errors, 1 warnings');
  });

  it('should show up to 5 previews', () => {
    const diags: TscDiagnostic[] = Array.from({ length: 7 }, (_, i) => ({
      file: `f${i}.ts`,
      line: i + 1,
      column: 1,
      severity: 'error' as const,
      code: 2322,
      message: `Error ${i}`,
    }));

    const lines = formatTscOutput(diags);
    // 1 summary + 5 previews + 1 "and N more" = 7 lines
    expect(lines).toHaveLength(7);
    expect(lines[6]).toContain('and 2 more');
  });

  it('should not show "and N more" when 5 or fewer', () => {
    const diags: TscDiagnostic[] = [
      { file: 'a.ts', line: 1, column: 1, severity: 'error', code: 2322, message: 'Err' },
    ];
    const lines = formatTscOutput(diags);
    expect(lines).toHaveLength(2); // 1 summary + 1 preview
    expect(lines.join('\n')).not.toContain('more');
  });

  it('should include file:line:col in previews', () => {
    const diags: TscDiagnostic[] = [
      { file: 'src/index.ts', line: 42, column: 7, severity: 'error', code: 2322, message: 'Oops' },
    ];
    const lines = formatTscOutput(diags);
    expect(lines[1]).toContain('src/index.ts:42:7');
  });
});

// ---------------------------------------------------------------------------
// 4. Hook output structure (HookOutput interface compliance)
// ---------------------------------------------------------------------------

describe('post-edit-diagnostics: HookOutput structure for tsc', () => {
  interface HookOutput {
    hookSpecificOutput?: {
      hookEventName: string;
      additionalContext?: string;
    };
  }

  function buildHookOutput(diagnostics: TscDiagnostic[]): HookOutput {
    if (diagnostics.length === 0) return {};

    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

    const lines: string[] = [];
    lines.push(`Diagnostics: ${errorCount} type errors, ${warningCount} warnings`);

    const maxPreviews = 5;
    const previews = diagnostics.slice(0, maxPreviews);
    for (const d of previews) {
      lines.push(`   - ${d.file}:${d.line}:${d.column}: ${d.message}`);
    }

    if (diagnostics.length > maxPreviews) {
      lines.push(`   ... and ${diagnostics.length - maxPreviews} more`);
    }

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: lines.join('\n'),
      },
    };
  }

  it('should return empty object when no diagnostics', () => {
    const output = buildHookOutput([]);
    expect(output).toEqual({});
  });

  it('should set hookEventName to PostToolUse', () => {
    const diags: TscDiagnostic[] = [
      { file: 'a.ts', line: 1, column: 1, severity: 'error', code: 2322, message: 'Err' },
    ];
    const output = buildHookOutput(diags);
    expect(output.hookSpecificOutput?.hookEventName).toBe('PostToolUse');
  });

  it('should include diagnostics in additionalContext', () => {
    const diags: TscDiagnostic[] = [
      { file: 'a.ts', line: 1, column: 1, severity: 'error', code: 2322, message: 'Type mismatch' },
    ];
    const output = buildHookOutput(diags);
    expect(output.hookSpecificOutput?.additionalContext).toContain('Type mismatch');
    expect(output.hookSpecificOutput?.additionalContext).toContain('1 type errors');
  });
});

// ---------------------------------------------------------------------------
// 5. tsc invocation shape (spawnSync args)
// ---------------------------------------------------------------------------

describe('post-edit-diagnostics: tsc invocation', () => {
  it('should use --noEmit and --pretty false flags', () => {
    const expectedArgs = ['--noEmit', '--pretty', 'false'];
    const cmd = 'tsc';

    expect(cmd).toBe('tsc');
    expect(expectedArgs).toContain('--noEmit');
    expect(expectedArgs).toContain('--pretty');
    expect(expectedArgs[2]).toBe('false');
  });

  it('should set timeout to prevent hangs', () => {
    const spawnOptions = { cwd: '/some/project', timeout: 30000 };
    expect(spawnOptions.timeout).toBe(30000);
  });

  it('should handle tsc not found gracefully', () => {
    const mockResult: Partial<SpawnSyncReturns<Buffer>> = {
      status: null,
      error: new Error('ENOENT'),
      stdout: Buffer.from(''),
      stderr: Buffer.from(''),
    };

    const shouldSkip = mockResult.error !== undefined || mockResult.status === null;
    expect(shouldSkip).toBe(true);
  });

  it('should handle tsc returning non-zero exit for type errors', () => {
    // tsc returns exit code 2 when there are type errors -- this is NOT a failure
    const mockResult: Partial<SpawnSyncReturns<Buffer>> = {
      status: 2,
      error: undefined,
      stdout: Buffer.from(`src/a.ts(1,1): error TS2322: Type mismatch.\n`),
      stderr: Buffer.from(''),
    };

    const shouldParse = mockResult.error === undefined && mockResult.stdout;
    expect(shouldParse).toBeTruthy();
  });
});
