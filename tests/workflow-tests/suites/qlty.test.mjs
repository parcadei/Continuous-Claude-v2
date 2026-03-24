#!/usr/bin/env node
// Qlty code quality CLI tests
import { describe, test, execCmd, assertFileExists, skip, run } from '../harness.mjs';

describe('Qlty CLI', () => {
  test('qlty --version exits 0', () => {
    const r = execCmd('qlty --version');
    if (!r.success) skip('qlty not installed');
  });

  test('qlty skill file exists', () => {
    assertFileExists(
      'C:/Users/david.hayes/continuous-claude/.claude/skills/qlty-check/SKILL.md',
      'qlty-check SKILL.md not found in repo'
    );
  });
});

await run('qlty');
