/**
 * Tests for dashboard-reporter PostToolUse hook.
 *
 * The dashboard-reporter hook fires after every tool use and POSTs event data
 * to the local dashboard API at http://127.0.0.1:3434/api/hook-events.
 *
 * Exported functions under test:
 *   - buildPayload(input): builds the POST body from hook input
 *   - postEvent(payload, url, timeoutMs): sends the event via fetch (fire-and-forget)
 *   - parseInput(raw): safely parses stdin JSON
 *
 * Design principles:
 *   - Fail silently if dashboard is not running (fire-and-forget)
 *   - Never block or slow down the hook pipeline
 *   - No state files needed (stateless reporter)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  buildPayload,
  postEvent,
  parseInput,
  DASHBOARD_URL,
  TIMEOUT_MS,
} from '../dashboard-reporter.js';

// =============================================================================
// Test 1: Constants
// =============================================================================

describe('constants', () => {
  it('DASHBOARD_URL points to localhost:3434 hook-events endpoint', () => {
    expect(DASHBOARD_URL).toBe('http://127.0.0.1:3434/api/hook-events');
  });

  it('TIMEOUT_MS is a reasonable value (1-5 seconds)', () => {
    expect(TIMEOUT_MS).toBeGreaterThanOrEqual(1000);
    expect(TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });
});

// =============================================================================
// Test 2: parseInput -- safely parses stdin JSON
// =============================================================================

describe('parseInput', () => {
  it('parses valid JSON input', () => {
    const raw = JSON.stringify({
      session_id: 'test-session',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    });
    const result = parseInput(raw);
    expect(result).not.toBeNull();
    expect(result!.session_id).toBe('test-session');
    expect(result!.tool_name).toBe('Bash');
  });

  it('returns null for empty string', () => {
    expect(parseInput('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseInput('not valid json{{{')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(parseInput('   \n  ')).toBeNull();
  });

  it('handles missing optional fields gracefully', () => {
    const raw = JSON.stringify({ session_id: 'abc' });
    const result = parseInput(raw);
    expect(result).not.toBeNull();
    expect(result!.session_id).toBe('abc');
    expect(result!.tool_name).toBeUndefined();
  });
});

// =============================================================================
// Test 3: buildPayload -- constructs POST body for the API
// =============================================================================

describe('buildPayload', () => {
  it('maps tool_name to hook_name', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_name: 'Read',
      tool_input: { file_path: '/tmp/test.ts' },
    });
    expect(payload.hook_name).toBe('dashboard-reporter');
  });

  it('sets event_type to "tool_use"', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_name: 'Bash',
      tool_input: {},
    });
    expect(payload.event_type).toBe('tool_use');
  });

  it('includes tool_name in details', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_name: 'Grep',
      tool_input: { pattern: 'foo' },
    });
    expect(payload.details.tool_name).toBe('Grep');
  });

  it('includes session_id in details', () => {
    const payload = buildPayload({
      session_id: 'my-session',
      tool_name: 'Edit',
      tool_input: {},
    });
    expect(payload.details.session_id).toBe('my-session');
  });

  it('includes timestamp in details as ISO string', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_name: 'Write',
      tool_input: {},
    });
    expect(payload.details.timestamp).toBeDefined();
    // Should be a valid ISO date string
    const date = new Date(payload.details.timestamp as string);
    expect(date.getTime()).not.toBeNaN();
  });

  it('includes blocked:false in details by default', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_name: 'Bash',
      tool_input: {},
    });
    expect(payload.details.blocked).toBe('false');
  });

  it('handles missing tool_name gracefully', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_input: {},
    });
    expect(payload.details.tool_name).toBe('unknown');
  });

  it('handles missing session_id gracefully', () => {
    const payload = buildPayload({
      tool_name: 'Bash',
      tool_input: {},
    });
    expect(payload.details.session_id).toBe('unknown');
  });

  it('sets skill_matched to null', () => {
    const payload = buildPayload({
      session_id: 'sess-1',
      tool_name: 'Bash',
      tool_input: {},
    });
    expect(payload.skill_matched).toBeNull();
  });
});

// =============================================================================
// Test 4: postEvent -- fire-and-forget POST to dashboard
// =============================================================================

describe('postEvent', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls fetch with correct URL and method', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const payload = {
      hook_name: 'dashboard-reporter',
      event_type: 'tool_use',
      skill_matched: null as string | null,
      details: { tool_name: 'Bash', session_id: 'sess-1', timestamp: new Date().toISOString(), blocked: 'false' },
    };

    await postEvent(payload, DASHBOARD_URL, TIMEOUT_MS);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(DASHBOARD_URL);
    expect(options.method).toBe('POST');
  });

  it('sends payload as JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const payload = {
      hook_name: 'dashboard-reporter',
      event_type: 'tool_use',
      skill_matched: null as string | null,
      details: { tool_name: 'Read', session_id: 's', timestamp: '2026-01-01T00:00:00Z', blocked: 'false' },
    };

    await postEvent(payload, DASHBOARD_URL, TIMEOUT_MS);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.hook_name).toBe('dashboard-reporter');
    expect(body.details.tool_name).toBe('Read');
  });

  it('uses AbortSignal with timeout', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    const payload = {
      hook_name: 'dashboard-reporter',
      event_type: 'tool_use',
      skill_matched: null as string | null,
      details: { tool_name: 'Bash', session_id: 's', timestamp: '2026-01-01T00:00:00Z', blocked: 'false' },
    };

    await postEvent(payload, DASHBOARD_URL, 2000);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.signal).toBeDefined();
  });

  it('does not throw when fetch rejects (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const payload = {
      hook_name: 'dashboard-reporter',
      event_type: 'tool_use',
      skill_matched: null as string | null,
      details: { tool_name: 'Bash', session_id: 's', timestamp: '2026-01-01T00:00:00Z', blocked: 'false' },
    };

    // Should not throw
    await expect(postEvent(payload, DASHBOARD_URL, TIMEOUT_MS)).resolves.not.toThrow();
  });

  it('does not throw when fetch returns non-ok status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const payload = {
      hook_name: 'dashboard-reporter',
      event_type: 'tool_use',
      skill_matched: null as string | null,
      details: { tool_name: 'Bash', session_id: 's', timestamp: '2026-01-01T00:00:00Z', blocked: 'false' },
    };

    await expect(postEvent(payload, DASHBOARD_URL, TIMEOUT_MS)).resolves.not.toThrow();
  });

  it('does not throw on timeout (AbortError)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const payload = {
      hook_name: 'dashboard-reporter',
      event_type: 'tool_use',
      skill_matched: null as string | null,
      details: { tool_name: 'Bash', session_id: 's', timestamp: '2026-01-01T00:00:00Z', blocked: 'false' },
    };

    await expect(postEvent(payload, DASHBOARD_URL, TIMEOUT_MS)).resolves.not.toThrow();
  });
});

// =============================================================================
// Test 5: Integration -- buildPayload produces valid API payload
// =============================================================================

describe('integration: payload shape matches API', () => {
  it('payload has all required API fields', () => {
    const payload = buildPayload({
      session_id: 'integration-test',
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
    });

    // These are the fields HookEventPayload expects
    expect(payload).toHaveProperty('hook_name');
    expect(payload).toHaveProperty('event_type');
    expect(payload).toHaveProperty('skill_matched');
    expect(payload).toHaveProperty('details');
    expect(typeof payload.hook_name).toBe('string');
    expect(typeof payload.event_type).toBe('string');
    expect(typeof payload.details).toBe('object');
  });

  it('hook_name is within max field length (256)', () => {
    const payload = buildPayload({
      session_id: 'test',
      tool_name: 'Bash',
      tool_input: {},
    });
    expect(payload.hook_name.length).toBeLessThanOrEqual(256);
  });

  it('details has at most 20 keys', () => {
    const payload = buildPayload({
      session_id: 'test',
      tool_name: 'Bash',
      tool_input: {},
    });
    expect(Object.keys(payload.details).length).toBeLessThanOrEqual(20);
  });
});
