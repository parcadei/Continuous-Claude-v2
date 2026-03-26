/**
 * Tests for sentry-error-context UserPromptSubmit hook.
 *
 * This hook fires on UserPromptSubmit. When the user mentions production
 * errors, it suggests checking Sentry for recent issues.
 *
 * Behavior:
 * - Error-related prompts: inject Sentry suggestion context
 * - Non-error prompts: exit immediately with {}
 * - Fails open: any error -> output {}
 */

import { describe, it, expect } from 'vitest';

import {
  shouldSuggestSentry,
  buildErrorContext,
  handleUserPrompt,
} from '../sentry-error-context.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_SESSION = 'sentry-error-context-session';

// =============================================================================
// Test 1: shouldSuggestSentry -- detect error-related messages
// =============================================================================

describe('shouldSuggestSentry', () => {
  it('returns true for "production error"', () => {
    expect(shouldSuggestSentry('there is a production error in the app')).toBe(true);
  });

  it('returns true for "prod bug"', () => {
    expect(shouldSuggestSentry('we have a prod bug that needs fixing')).toBe(true);
  });

  it('returns true for "crash"', () => {
    expect(shouldSuggestSentry('the app is crash when users log in')).toBe(true);
  });

  it('returns true for "exception"', () => {
    expect(shouldSuggestSentry('seeing an exception in the API')).toBe(true);
  });

  it('returns true for "500 error"', () => {
    expect(shouldSuggestSentry('users are getting a 500 error')).toBe(true);
  });

  it('returns true for "failing in prod"', () => {
    expect(shouldSuggestSentry('the checkout is failing in prod')).toBe(true);
  });

  it('returns true for "sentry issue"', () => {
    expect(shouldSuggestSentry('check this sentry issue for me')).toBe(true);
  });

  it('returns true for "sentry error"', () => {
    expect(shouldSuggestSentry('there is a sentry error we need to fix')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(shouldSuggestSentry('PRODUCTION ERROR detected')).toBe(true);
    expect(shouldSuggestSentry('Sentry Issue needs triage')).toBe(true);
  });

  it('returns false for "add a button"', () => {
    expect(shouldSuggestSentry('add a button to the dashboard')).toBe(false);
  });

  it('returns false for "deploy to vercel"', () => {
    expect(shouldSuggestSentry('deploy to vercel')).toBe(false);
  });

  it('returns false for "fix the typo"', () => {
    expect(shouldSuggestSentry('fix the typo in the readme')).toBe(false);
  });

  it('returns false for "run tests"', () => {
    expect(shouldSuggestSentry('run tests for the auth module')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(shouldSuggestSentry('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(shouldSuggestSentry(undefined as any)).toBe(false);
  });

  it('returns false for null', () => {
    expect(shouldSuggestSentry(null as any)).toBe(false);
  });
});

// =============================================================================
// Test 2: buildErrorContext -- context message construction
// =============================================================================

describe('buildErrorContext', () => {
  it('includes Sentry header', () => {
    const ctx = buildErrorContext();
    expect(ctx).toContain('[Sentry]');
  });

  it('includes sentry-cli issues list command', () => {
    const ctx = buildErrorContext();
    expect(ctx).toContain('sentry-cli issues list');
  });

  it('mentions Sentry MCP', () => {
    const ctx = buildErrorContext();
    expect(ctx).toContain('Sentry MCP');
  });

  it('mentions Seer AI analysis', () => {
    const ctx = buildErrorContext();
    expect(ctx).toContain('Seer AI');
  });
});

// =============================================================================
// Test 3: handleUserPrompt -- integration
// =============================================================================

describe('handleUserPrompt', () => {
  it('returns context for error-related prompt', () => {
    const input = {
      user_message: 'there is a production error crashing the app',
      session_id: TEST_SESSION,
    };
    const result = handleUserPrompt(input);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('hookSpecificOutput');
    expect(result!.hookSpecificOutput).toHaveProperty('additionalContext');
    expect(result!.hookSpecificOutput.additionalContext).toContain('[Sentry]');
  });

  it('returns context for 500 error prompt', () => {
    const input = {
      user_message: 'users are getting a 500 error on the API',
      session_id: TEST_SESSION,
    };
    const result = handleUserPrompt(input);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.additionalContext).toContain('sentry-cli');
  });

  it('returns null for non-error prompt', () => {
    const input = {
      user_message: 'add a new feature to the dashboard',
      session_id: TEST_SESSION,
    };
    expect(handleUserPrompt(input)).toBeNull();
  });

  it('returns null for empty message', () => {
    const input = {
      user_message: '',
      session_id: TEST_SESSION,
    };
    expect(handleUserPrompt(input)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(handleUserPrompt(null as any)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(handleUserPrompt(undefined as any)).toBeNull();
  });

  it('returns null when user_message is missing', () => {
    const input = {
      session_id: TEST_SESSION,
    };
    expect(handleUserPrompt(input as any)).toBeNull();
  });

  it('includes hookEventName UserPromptSubmit', () => {
    const input = {
      user_message: 'there is a sentry error in production',
      session_id: TEST_SESSION,
    };
    const result = handleUserPrompt(input);
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
  });
});
