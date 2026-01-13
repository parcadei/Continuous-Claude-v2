/**
 * PreToolUse:Edit Hook - Check and claim files for conflict prevention.
 *
 * This hook:
 * 1. Checks if another session has claimed the file
 * 2. Warns if file is being edited by another session
 * 3. Claims the file for the current session
 *
 * Part of the coordination layer architecture (Phase 1).
 */

import { readFileSync } from 'fs';
import { checkFileClaim, claimFileAtomic } from './shared/db-utils-pg.js';
import type { PreToolUseInput, HookOutput } from './shared/types.js';

// Get session ID from environment (set by session-register hook)
function getSessionId(): string {
  return process.env.COORDINATION_SESSION_ID ||
         process.env.BRAINTRUST_SPAN_ID?.slice(0, 8) ||
         `s-${Date.now().toString(36)}`;
}

// Get project from environment
function getProject(): string {
  return process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

export function main(): void {
  // Read hook input from stdin
  let input: PreToolUseInput;
  try {
    const stdinContent = readFileSync(0, 'utf-8');
    input = JSON.parse(stdinContent) as PreToolUseInput;
  } catch {
    // If we can't read input, continue silently
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  // Only process Edit tool
  if (input.tool_name !== 'Edit') {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  // Extract file path from input
  const filePath = input.tool_input?.file_path as string;
  if (!filePath) {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  const sessionId = getSessionId();
  const project = getProject();

  // Atomically claim the file (no TOCTOU race condition)
  const claimResult = claimFileAtomic(filePath, project, sessionId);

  let output: HookOutput;

  if (claimResult.claimed) {
    // We successfully claimed the file
    output = { result: 'continue' };
  } else if (claimResult.claimedBy) {
    // Another session claimed it
    const fileName = filePath.split('/').pop() || filePath;
    output = {
      result: 'continue',  // Allow edit, just warn
      message: `\u26A0\uFE0F **File Conflict Warning**
\`${fileName}\` is being edited by Session ${claimResult.claimedBy}
Consider coordinating with the other session to avoid conflicts.`,
    };
  } else {
    // Claim failed for other reasons, allow the edit
    output = { result: 'continue' };
  }

  console.log(JSON.stringify(output));
}

// Run if executed directly
main();
