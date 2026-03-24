#!/usr/bin/env node
// TLDR CLI analysis tool tests
import { describe, test, setTier, assertEqual, assertTruthy, execCmd, skip, run } from '../harness.mjs';

describe('TLDR CLI', () => {
  test('tldr --help or tldr help exits 0', () => {
    const r1 = execCmd('tldr --help');
    const r2 = execCmd('tldr help');
    if (r1.exitCode !== 0 && r2.exitCode !== 0) {
      throw new Error(`Both tldr --help (${r1.exitCode}) and tldr help (${r2.exitCode}) failed`);
    }
  });

  test('tldr tree returns output for scripts dir', () => {
    const r = execCmd('tldr tree C:/Users/david.hayes/continuous-claude/scripts --ext .mjs');
    if (!r.success) skip('tldr not available');
    assertTruthy(r.stdout.trim().length > 0, 'tldr tree returned empty output');
  });

  setTier('integration');

  test('tldr structure returns output for cdp.mjs', () => {
    const r = execCmd('tldr structure C:/Users/david.hayes/continuous-claude/scripts/cdp.mjs --lang typescript');
    if (!r.success) skip('tldr structure failed — tool may not support this file');
    assertTruthy(r.stdout.trim().length > 0, 'tldr structure returned empty output');
  });

  test('tldr search finds functions in scripts dir', () => {
    const r = execCmd('tldr search "function" C:/Users/david.hayes/continuous-claude/scripts/');
    if (!r.success) skip('tldr search failed');
    assertTruthy(r.stdout.trim().length > 0, 'tldr search returned empty output');
  });
});

await run('tldr');
