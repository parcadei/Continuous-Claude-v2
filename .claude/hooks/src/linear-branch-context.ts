/**
 * Linear Branch Context Hook (PostToolUse: Bash)
 *
 * When creating a branch with LIN-XXX in the name, injects Linear issue
 * context including a link to the issue and status update suggestion.
 *
 * Performance targets:
 * - Non-branch Bash commands: <1ms (regex test only)
 * - Non-LIN branches: <1ms (regex test only)
 * - LIN branch: <1ms (string construction)
 */
import { readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    additionalContext: string;
  };
}

// ---------------------------------------------------------------------------
// BRANCH_CREATE: matches git checkout -b or git switch -c with LIN-XXX
// ---------------------------------------------------------------------------

const BRANCH_CREATE = /(?:git\s+(?:checkout\s+-b|switch\s+-c))\s+\S*LIN-(\d+)/i;

// ---------------------------------------------------------------------------
// Exported functions (testable units)
// ---------------------------------------------------------------------------

/**
 * Extract Linear issue number from a branch creation command.
 * Returns the issue number string, or null if not a LIN- branch creation.
 */
export function extractLinearIssue(command: unknown): string | null {
  if (typeof command !== 'string' || command.length === 0) return null;
  const match = command.match(BRANCH_CREATE);
  return match ? match[1] : null;
}

/**
 * Build the Linear branch context string for a given issue number.
 */
export function buildBranchContext(issueNumber: string): string {
  const workspace = process.env.LINEAR_WORKSPACE ?? 'minions-lab';
  return `[Linear] Branch linked to issue LIN-${issueNumber}.
View: https://linear.app/${workspace}/issue/LIN-${issueNumber}
Consider updating issue status to "In Progress":
  linearis issue update LIN-${issueNumber} --status "In Progress" --json`;
}

/**
 * Main handler: process a PostToolUse event for Bash branch creation.
 * Returns null if no context should be injected, or HookOutput otherwise.
 */
export function handleBranchPostToolUse(input: HookInput): HookOutput | null {
  try {
    if (!input || typeof input !== 'object') return null;

    // Fast exit: not Bash
    if (input.tool_name !== 'Bash') return null;

    // Fast exit: no command or not a LIN- branch creation
    const command = input.tool_input?.command;
    const issueNumber = extractLinearIssue(command);
    if (!issueNumber) return null;

    // Build and return context
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: buildBranchContext(issueNumber),
      },
    };
  } catch {
    // Fail open
    return null;
  }
}

// ---------------------------------------------------------------------------
// Entry point: read stdin, process, write stdout
// ---------------------------------------------------------------------------

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

async function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    console.log('{}');
    return;
  }

  let input: HookInput;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log('{}');
    return;
  }

  const result = handleBranchPostToolUse(input);

  if (result) {
    console.log(JSON.stringify(result));
  } else {
    console.log('{}');
  }
}

// Guard: don't run main() during vitest imports
if (!process.env.VITEST) {
  main().catch(() => {
    console.log('{}');
  });
}
