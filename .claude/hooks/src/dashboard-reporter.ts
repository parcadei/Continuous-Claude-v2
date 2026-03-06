/**
 * Dashboard Reporter Hook - PostToolUse:*
 *
 * Fires after every tool use and POSTs event data to the local dashboard API.
 * This feeds the "Recent Hook Events" section in the Skills panel.
 *
 * Design:
 *   - Fire-and-forget: never blocks the hook pipeline
 *   - Fail-silent: if dashboard is not running, swallows errors
 *   - Stateless: no state files, no side effects beyond the POST
 *   - Lightweight: minimal processing, fast exit
 *
 * API target: POST http://127.0.0.1:3434/api/hook-events
 * Payload shape: { hook_name, event_type, skill_matched, details }
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DASHBOARD_URL = 'http://127.0.0.1:3434/api/hook-events';
export const TIMEOUT_MS = 2000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HookInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
}

export interface EventPayload {
  hook_name: string;
  event_type: string;
  skill_matched: string | null;
  details: Record<string, string>;
}

// ---------------------------------------------------------------------------
// parseInput -- safely parse stdin JSON
// ---------------------------------------------------------------------------

/**
 * Safely parse raw stdin content into a HookInput.
 * Returns null if input is empty, whitespace-only, or invalid JSON.
 */
export function parseInput(raw: string): HookInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as HookInput;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// buildPayload -- construct the POST body for the API
// ---------------------------------------------------------------------------

/**
 * Build an EventPayload from hook input.
 * Handles missing fields gracefully with sensible defaults.
 */
export function buildPayload(input: HookInput): EventPayload {
  return {
    hook_name: 'dashboard-reporter',
    event_type: 'tool_use',
    skill_matched: null,
    details: {
      tool_name: input.tool_name || 'unknown',
      session_id: input.session_id || 'unknown',
      timestamp: new Date().toISOString(),
      blocked: 'false',
    },
  };
}

// ---------------------------------------------------------------------------
// postEvent -- fire-and-forget POST to dashboard
// ---------------------------------------------------------------------------

/**
 * POST the event payload to the dashboard API.
 * Never throws -- all errors are swallowed silently.
 */
export async function postEvent(
  payload: EventPayload,
  url: string,
  timeoutMs: number,
): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    // Fail silently -- dashboard may not be running
  }
}

// ---------------------------------------------------------------------------
// Main entrypoint (stdin-driven)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;

  const input = parseInput(raw);
  if (!input) {
    console.log('{}');
    return;
  }

  const payload = buildPayload(input);

  // Fire-and-forget: don't await in the critical path output
  // But we do await to ensure the request goes out before process exits
  await postEvent(payload, DASHBOARD_URL, TIMEOUT_MS);

  // PostToolUse hooks output empty JSON to indicate no-op (no blocking, no system message)
  console.log('{}');
}

if (!process.env.VITEST) {
  main().catch(() => {
    console.log('{}');
  });
}
