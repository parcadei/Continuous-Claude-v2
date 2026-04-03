/**
 * PreToolUse:Bash Hook - OPC Script Directory Guard
 *
 * Prevents running scripts from `scripts/(mcp|core)/` without first
 * changing to $CLAUDE_OPC_DIR. When Claude runs these scripts from the
 * wrong directory, `uv run` misses `opc/pyproject.toml` and its
 * dependencies, causing ModuleNotFoundError.
 *
 * Detection: any Bash command referencing `scripts/(mcp|core)/` paths
 * Allowed: commands prefixed with `cd $CLAUDE_OPC_DIR &&` (or resolved path)
 * Denied: returns corrected command in the reason message
 *
 * Fixes: #148
 */

import { readFileSync } from 'fs';
import { getOpcDir } from './shared/opc-path.js';
import type { PreToolUseInput, PreToolUseHookOutput } from './shared/types.js';

/**
 * Pattern matching scripts/(mcp|core)/ references in Bash commands.
 * Captures the path for use in the corrected command suggestion.
 */
const SCRIPT_PATH_PATTERN = /\bscripts\/(mcp|core)\//;

/**
 * Pattern matching a proper cd prefix to OPC dir.
 * Accepts:
 *   cd $CLAUDE_OPC_DIR &&
 *   cd ${CLAUDE_OPC_DIR} &&
 *   cd /resolved/opc/path &&
 */
function buildCdPrefixPattern(opcDir: string | null): RegExp {
  const escapedDir = opcDir ? opcDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  // Match: cd <opc-dir-variant> && (with flexible whitespace)
  const variants = [
    '\\$CLAUDE_OPC_DIR',
    '\\$\\{CLAUDE_OPC_DIR\\}',
  ];
  if (escapedDir) {
    variants.push(escapedDir);
  }
  return new RegExp(`^\\s*cd\\s+(${variants.join('|')})\\s*&&`);
}

function main(): void {
  let input: PreToolUseInput;
  try {
    const stdinContent = readFileSync(0, 'utf-8');
    input = JSON.parse(stdinContent) as PreToolUseInput;
  } catch {
    // Can't read input - allow through
    console.log('{}');
    return;
  }

  // Only process Bash tool
  if (input.tool_name !== 'Bash') {
    console.log('{}');
    return;
  }

  const command = input.tool_input?.command as string;
  if (!command) {
    console.log('{}');
    return;
  }

  // Check if command references OPC script paths
  if (!SCRIPT_PATH_PATTERN.test(command)) {
    // No script path reference - allow through
    console.log('{}');
    return;
  }

  const opcDir = getOpcDir();
  const cdPrefix = buildCdPrefixPattern(opcDir);

  // Check if command already has the correct cd prefix
  if (cdPrefix.test(command)) {
    console.log('{}');
    return;
  }

  // Build corrected command suggestion
  const dirRef = opcDir || '$CLAUDE_OPC_DIR';
  const corrected = `cd ${dirRef} && ${command.trimStart()}`;

  const output: PreToolUseHookOutput = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `OPC directory guard: commands referencing scripts/(mcp|core)/ must ` +
        `run from the OPC directory so uv can find pyproject.toml.\n\n` +
        `Blocked command:\n  ${command.trim()}\n\n` +
        `Corrected command:\n  ${corrected}`,
    },
  };

  console.log(JSON.stringify(output));
}

main();
