/**
 * Sentry Deploy Release Hook (PostToolUse: Bash)
 *
 * After deploy commands (vercel deploy, railway up, etc.), injects context
 * reminding to create a Sentry release for error tracking.
 *
 * Performance targets:
 * - Non-deploy Bash commands: <1ms (string check only)
 * - Non-Sentry projects: <5ms (file existence checks)
 * - Sentry deploy: <10ms (context string construction)
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
// DEPLOY_PATTERN: matches deploy commands
// Handles: vercel --prod, vercel deploy, vercel promote,
//          railway up, railway redeploy
// Does NOT match: vercel status, railway logs, git push
// ---------------------------------------------------------------------------

const DEPLOY_PATTERN = /(?:^|&&\s*|;\s*)(?:vercel\s+(?:--prod|deploy|promote)|railway\s+(?:up|redeploy))(?:\s|$)/;

// ---------------------------------------------------------------------------
// Exported functions (testable units)
// ---------------------------------------------------------------------------

/**
 * Detect if a command string contains a deploy invocation.
 */
export function isDeployCommand(command: unknown): boolean {
  if (typeof command !== 'string' || command.length === 0) return false;
  return DEPLOY_PATTERN.test(command);
}

/**
 * Check if a directory has Sentry SDK in its dependencies.
 * Checks: package.json (@sentry/*), requirements.txt (sentry-sdk),
 *         pyproject.toml (sentry-sdk)
 */
export function hasSentryInProject(dir: unknown): boolean {
  if (typeof dir !== 'string' || dir.length === 0) return false;
  try {
    // Check package.json for @sentry/*
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const content = readFileSync(pkgPath, 'utf-8');
      if (content.includes('@sentry/')) return true;
    }

    // Check requirements.txt for sentry-sdk
    const reqPath = join(dir, 'requirements.txt');
    if (existsSync(reqPath)) {
      const content = readFileSync(reqPath, 'utf-8');
      if (content.includes('sentry-sdk')) return true;
    }

    // Check pyproject.toml for sentry-sdk
    const pyprojectPath = join(dir, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, 'utf-8');
      if (content.includes('sentry-sdk')) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Build the Sentry release context string.
 */
export function buildReleaseContext(): string {
  return `[Sentry Release] Deploy detected. Create a release to track errors:
  sentry-cli releases new $(git rev-parse HEAD)
  sentry-cli releases set-commits $(git rev-parse HEAD) --auto
  sentry-cli deploys new -e production -r $(git rev-parse HEAD)
  sentry-cli releases finalize $(git rev-parse HEAD)

Check for post-deploy errors:
  sentry-cli issues list --query "firstSeen:>now-5m"`;
}

/**
 * Main handler: process a PostToolUse event for Bash deploy commands.
 * Returns null if no context should be injected, or HookOutput otherwise.
 */
export function handleDeployPostToolUse(input: HookInput, cwd?: string): HookOutput | null {
  try {
    if (!input || typeof input !== 'object') return null;

    // Fast exit: not Bash
    if (input.tool_name !== 'Bash') return null;

    // Fast exit: no command or not a deploy
    const command = input.tool_input?.command;
    if (!isDeployCommand(command)) return null;

    // Check Sentry in project
    const projectDir = cwd || process.cwd();
    if (!hasSentryInProject(projectDir)) return null;

    // Build and return context
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: buildReleaseContext(),
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

  const result = handleDeployPostToolUse(input);

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
