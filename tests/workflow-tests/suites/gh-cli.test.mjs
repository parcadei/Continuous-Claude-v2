#!/usr/bin/env node
// GitHub CLI — smoke + integration tests
import {
  describe, test, setTier,
  assertEqual, assertTruthy,
  execCmd, skip, run
} from '../harness.mjs';

describe('gh-cli smoke', () => {
  test('gh --version exits 0', () => {
    const r = execCmd('gh --version');
    assertEqual(r.exitCode, 0, `gh --version exited ${r.exitCode}: ${r.stderr}`);
  });
});

describe('gh-cli integration', () => {
  setTier('integration');

  test('gh api user returns login', () => {
    const auth = execCmd('gh auth status');
    if (!auth.success) skip('gh not authenticated');
    const r = execCmd('gh api user --jq .login');
    assertTruthy(r.success, `gh api user failed: ${r.stderr}`);
    assertTruthy(r.stdout.trim().length > 0, 'gh api user returned empty login');
  });
});

await run('gh-cli');
