/**
 * Vercel Deploy Context Hook (PostToolUse: Bash)
 *
 * Injects Vercel deployment context after git push commands
 * in Vercel-linked projects (those with .vercel/project.json).
 *
 * Performance targets:
 * - Non-push Bash commands: <1ms (string check only)
 * - Non-Vercel projects: <5ms (one existsSync)
 * - Vercel push: <10ms (context string construction)
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
// GIT_PUSH_PATTERN: matches `git push` with optional flags/args
// Handles: git push, git push origin main, git push -u origin feature/x,
//          git push --force, chained commands with && containing git push
// Does NOT match: echo "git push", git pull, git commit
// ---------------------------------------------------------------------------

const GIT_PUSH_PATTERN = /(?:^|&&\s*|;\s*)git\s+push(?:\s|$)/;

// ---------------------------------------------------------------------------
// Exported functions (testable units)
// ---------------------------------------------------------------------------

/**
 * Detect if a command string contains a git push invocation.
 */
export function isGitPush(command: unknown): boolean {
  if (typeof command !== 'string' || command.length === 0) return false;
  return GIT_PUSH_PATTERN.test(command);
}

/**
 * Check if a directory is a Vercel-linked project.
 */
export function isVercelProject(dir: unknown): boolean {
  if (typeof dir !== 'string' || dir.length === 0) return false;
  try {
    return existsSync(join(dir, '.vercel', 'project.json'));
  } catch {
    return false;
  }
}

/**
 * Build the Vercel deployment context string.
 */
export function buildDeployContext(): string {
  return `[Vercel Deploy Context]
Git push detected in Vercel-linked project. Deployment is now in progress.

Monitor deployment:
- Check status: mcp__claude_ai_Vercel__list_deployments (teamId from .vercel/project.json)
- Build logs: mcp__claude_ai_Vercel__get_deployment_build_logs
- Runtime logs: mcp__claude_ai_Vercel__get_runtime_logs

Review feedback:
- Toolbar threads: mcp__claude_ai_Vercel__list_toolbar_threads

For operations (env vars, promote, rollback): use Vercel CLI via /vercel-cli skill.`;
}

/**
 * Main handler: process a PostToolUse event for Bash.
 * Returns null if no context should be injected, or HookOutput otherwise.
 *
 * @param input  The hook input from stdin
 * @param cwd    Override for the working directory (for testing)
 */
export function handleBashPostToolUse(input: HookInput, cwd?: string): HookOutput | null {
  try {
    if (!input || typeof input !== 'object') return null;

    // Fast exit: not Bash
    if (input.tool_name !== 'Bash') return null;

    // Fast exit: no command or not a push
    const command = input.tool_input?.command;
    if (!isGitPush(command)) return null;

    // Check Vercel linkage
    const projectDir = cwd || process.cwd();
    if (!isVercelProject(projectDir)) return null;

    // Build and return context
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: buildDeployContext(),
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

  const result = handleBashPostToolUse(input);

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
