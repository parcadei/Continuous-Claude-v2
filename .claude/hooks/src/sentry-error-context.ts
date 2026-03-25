/**
 * Sentry Error Context Hook (UserPromptSubmit)
 *
 * When user mentions production errors, suggests checking Sentry
 * for recent issues and using Sentry MCP for investigation.
 *
 * Performance targets:
 * - Non-matching messages: <1ms (regex test only)
 * - Matching messages: <1ms (string construction)
 */
import { readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserPromptInput {
  user_message: string;
  session_id: string;
}

interface HookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    additionalContext: string;
  };
}

// ---------------------------------------------------------------------------
// ERROR_KEYWORDS: regex to detect production error mentions
// ---------------------------------------------------------------------------

const ERROR_KEYWORDS = /\b(production error|prod bug|crash|exception|500 error|failing in prod|sentry issue|sentry error)\b/i;

// ---------------------------------------------------------------------------
// Exported functions (testable units)
// ---------------------------------------------------------------------------

/**
 * Detect if user message mentions production errors or Sentry.
 */
export function shouldSuggestSentry(message: unknown): boolean {
  if (typeof message !== 'string' || message.length === 0) return false;
  return ERROR_KEYWORDS.test(message);
}

/**
 * Build the Sentry error investigation context string.
 */
export function buildErrorContext(): string {
  return `[Sentry] Consider checking Sentry for recent production errors:
  sentry-cli issues list --query "is:unresolved" --json
Or use Sentry MCP for interactive investigation with Seer AI analysis.`;
}

/**
 * Main handler: process a UserPromptSubmit event.
 * Returns null if no context should be injected, or HookOutput otherwise.
 */
export function handleUserPrompt(input: UserPromptInput): HookOutput | null {
  try {
    if (!input || typeof input !== 'object') return null;

    const message = input.user_message;
    if (!shouldSuggestSentry(message)) return null;

    return {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext: buildErrorContext(),
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

  let input: UserPromptInput;
  try {
    input = JSON.parse(raw);
  } catch {
    console.log('{}');
    return;
  }

  const result = handleUserPrompt(input);

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
