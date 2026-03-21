import { describe, it, expect } from 'vitest';
import { detectWebFailure, buildSuggestion, handlePostToolUse } from '../web-lookup-advisor.js';

describe('web-lookup-advisor', () => {
  const SESSION = 'test-web-advisor';

  describe('detectWebFailure', () => {
    it('detects HTTP 404 in WebFetch response', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com/api' },
        tool_response: { status: 404, body: 'Not Found' }
      };
      expect(detectWebFailure(input)).toBe(true);
    });

    it('detects HTTP 403 forbidden', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://twitter.com/api' },
        tool_response: { status: 403, body: 'Forbidden' }
      };
      expect(detectWebFailure(input)).toBe(true);
    });

    it('detects error field in response', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebSearch',
        tool_input: { query: 'twitter trending' },
        tool_response: { error: 'Request timed out' }
      };
      expect(detectWebFailure(input)).toBe(true);
    });

    it('detects null response as failure', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com' },
        tool_response: null
      };
      expect(detectWebFailure(input)).toBe(true);
    });

    it('detects undefined response as failure', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com' },
        tool_response: undefined
      };
      expect(detectWebFailure(input)).toBe(true);
    });

    it('does not false-positive on error field with non-string value', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com' },
        tool_response: { status: 200, error: false, data: 'ok' }
      };
      expect(detectWebFailure(input)).toBe(false);
    });

    it('detects failure patterns in short error text', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com' },
        tool_response: 'Connection timed out after 30s'
      };
      expect(detectWebFailure(input)).toBe(true);
    });

    it('ignores successful 200 responses', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com' },
        tool_response: { status: 200, body: '<html>Full page content here with lots of data...</html>' }
      };
      expect(detectWebFailure(input)).toBe(false);
    });

    it('ignores non-web tools', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'Read',
        tool_input: { file_path: '/foo/bar.ts' },
        tool_response: 'file contents here'
      };
      expect(detectWebFailure(input)).toBe(false);
    });

    it('ignores Grep tool', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'Grep',
        tool_input: { pattern: 'error' },
        tool_response: { matches: [] }
      };
      expect(detectWebFailure(input)).toBe(false);
    });

    it('does not false-positive on long successful responses containing error words', () => {
      const longBody = 'x'.repeat(600) + ' error handling documentation ' + 'x'.repeat(600);
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com/docs' },
        tool_response: { status: 200, body: longBody }
      };
      expect(detectWebFailure(input)).toBe(false);
    });
  });

  describe('buildSuggestion', () => {
    it('includes site-specific hint for twitter.com', () => {
      const suggestion = buildSuggestion('https://twitter.com/search?q=AI');
      expect(suggestion).toContain('opencli twitter');
    });

    it('includes site-specific hint for x.com', () => {
      const suggestion = buildSuggestion('https://x.com/elonmusk');
      expect(suggestion).toContain('opencli twitter');
    });

    it('includes site-specific hint for news.ycombinator.com', () => {
      const suggestion = buildSuggestion('https://news.ycombinator.com/item?id=123');
      expect(suggestion).toContain('opencli hackernews');
    });

    it('includes site-specific hint for reddit.com', () => {
      const suggestion = buildSuggestion('https://www.reddit.com/r/ClaudeAI');
      expect(suggestion).toContain('opencli reddit');
    });

    it('includes generic opencli suggestion for unknown URLs', () => {
      const suggestion = buildSuggestion('https://unknown-site.com/data');
      expect(suggestion).toContain('opencli list');
      expect(suggestion).toContain('opencli generate');
    });

    it('handles undefined URL gracefully', () => {
      const suggestion = buildSuggestion(undefined);
      expect(suggestion).toContain('opencli');
    });

    it('handles invalid URL gracefully', () => {
      const suggestion = buildSuggestion('not-a-url');
      expect(suggestion).toContain('opencli');
    });
  });

  describe('handlePostToolUse', () => {
    it('returns null for successful responses', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://example.com' },
        tool_response: { status: 200, body: 'OK' }
      };
      expect(handlePostToolUse(input)).toBeNull();
    });

    it('returns additionalContext for failures', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebFetch',
        tool_input: { url: 'https://twitter.com/api/timeline' },
        tool_response: { status: 403, body: 'Forbidden' }
      };
      const result = handlePostToolUse(input) as any;
      expect(result).not.toBeNull();
      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(result.hookSpecificOutput.additionalContext).toContain('opencli twitter');
    });

    it('returns null for non-web tools', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'Bash',
        tool_input: { command: 'curl https://example.com' },
        tool_response: 'error: connection refused'
      };
      expect(handlePostToolUse(input)).toBeNull();
    });

    it('uses query field for WebSearch inputs', () => {
      const input = {
        session_id: SESSION,
        tool_name: 'WebSearch',
        tool_input: { query: 'reddit AI agents' },
        tool_response: { error: 'Rate limited' }
      };
      const result = handlePostToolUse(input) as any;
      expect(result).not.toBeNull();
      expect(result.hookSpecificOutput.additionalContext).toContain('opencli');
    });
  });
});
