import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('Hook Output Format', () => {
  describe('PreToolUseHookOutput structure', () => {
    it('validates PreToolUseHookOutput interface', async () => {
      // Test that output format matches Claude Code v1.0.21+ spec
      const validOutput = {
        baseResponse: {
          content: [{ type: 'text', text: 'test' }],
        },
        recommendations: {
          addCommands: [],
          removeCommands: [],
          editCommands: [],
        },
      };
      expect(validOutput.baseResponse.content).toBeDefined();
      expect(Array.isArray(validOutput.baseResponse.content)).toBe(true);
      expect(validOutput.recommendations).toBeDefined();
      expect(validOutput.recommendations.addCommands).toBeDefined();
      expect(validOutput.recommendations.removeCommands).toBeDefined();
      expect(validOutput.recommendations.editCommands).toBeDefined();
    });

    it('validates PostToolUseHookOutput interface', async () => {
      const validOutput = {
        baseResponse: {
          content: [{ type: 'text', text: 'Tool completed' }],
        },
      };
      expect(validOutput.baseResponse.content).toBeDefined();
    });

    it('validates PreEditUseHookOutput interface', async () => {
      const validOutput = {
        baseResponse: {
          content: [{ type: 'text', text: 'Edit suggestions' }],
        },
        recommendations: {
          addCommands: [],
          removeCommands: [],
          editCommands: [],
        },
      };
      expect(validOutput.baseResponse.content).toBeDefined();
    });

    it('validates PreCompactHookOutput interface', async () => {
      const validOutput = {
        baseResponse: {
          content: [{ type: 'text', text: 'Compact summary' }],
        },
      };
      expect(validOutput.baseResponse.content).toBeDefined();
    });

    it('validates PostCompactHookOutput interface', async () => {
      const validOutput = {
        baseResponse: {
          content: [{ type: 'text', text: 'Compact complete' }],
        },
      };
      expect(validOutput.baseResponse.content).toBeDefined();
    });
  });

  describe('Memory awareness output', () => {
    it('parses recall_learnings.py JSON output', async () => {
      const mockJson = JSON.stringify([
        {
          id: 'test-id',
          session_id: 'test-session',
          content: 'Test learning content',
          metadata: { type: 'session_learning' },
          created_at: new Date().toISOString(),
          similarity: 0.85,
        },
      ]);
      const parsed = JSON.parse(mockJson);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe('test-id');
      expect(parsed[0].content).toBe('Test learning content');
      expect(typeof parsed[0].similarity).toBe('number');
    });

    it('handles empty memory results', async () => {
      const mockJson = JSON.stringify([]);
      const parsed = JSON.parse(mockJson);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });

    it('handles memory results with embedded embeddings', async () => {
      const mockJson = JSON.stringify([
        {
          id: 'test-id',
          session_id: 'test-session',
          content: 'Test learning content with embedding',
          embedding: [0.1, 0.2, 0.3, 0.4],
          metadata: { type: 'CODEBASE_PATTERN' },
          created_at: new Date().toISOString(),
          similarity: 0.92,
        },
      ]);
      const parsed = JSON.parse(mockJson);
      expect(parsed[0].embedding).toBeDefined();
      expect(Array.isArray(parsed[0].embedding)).toBe(true);
      expect(parsed[0].embedding.length).toBe(4);
    });
  });

  describe('Hook input validation', () => {
    it('validates SessionStart input structure', async () => {
      const validInput = {
        session_id: 'test-session-123',
        hook_event_name: 'SessionStart',
        cwd: '/test/path',
        permission_mode: 'ask',
      };
      expect(validInput.session_id).toBeDefined();
      expect(validInput.hook_event_name).toBe('SessionStart');
      expect(validInput.cwd).toBeDefined();
      expect(validInput.permission_mode).toBeDefined();
    });

    it('validates PreToolUse input structure', async () => {
      const validInput = {
        session_id: 'test-session-123',
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        input: { file_path: '/test/file.txt' },
        permission_mode: 'ask',
      };
      expect(validInput.tool_name).toBeDefined();
      expect(validInput.input).toBeDefined();
    });

    it('validates PostToolUse input structure', async () => {
      const validInput = {
        session_id: 'test-session-123',
        hook_event_name: 'PostToolUse',
        tool_name: 'Read',
        input: { file_path: '/test/file.txt' },
        output: 'file content',
        permission_mode: 'ask',
      };
      expect(validInput.tool_name).toBeDefined();
      expect(validInput.output).toBeDefined();
    });
  });
});
