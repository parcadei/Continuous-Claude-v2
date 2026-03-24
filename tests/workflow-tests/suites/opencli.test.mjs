#!/usr/bin/env node
// OpenCLI Test Suite — validates opencli installation, adapter count, and live queries
// Smoke: version, adapter list, skill/rule file checks
// Integration: doctor health check, hackernews adapter, adapter listing

import {
  describe, test, setTier,
  assertTruthy, assertGte, assertContains, assertNotContains,
  assertFileExists, fileContains,
  execCmd, execJson, skip, run,
} from '../harness.mjs';

const ROOT = 'C:/Users/david.hayes/continuous-claude';

// ---- Smoke tier ----

describe('opencli smoke', () => {
  test('opencli --version exits 0', () => {
    const r = execCmd('opencli --version');
    assertTruthy(r.success, `opencli --version failed: ${r.stderr}`);
  });

  test('opencli list returns 30+ lines (44+ adapters)', () => {
    const r = execCmd('opencli list');
    assertTruthy(r.success, `opencli list failed: ${r.stderr}`);
    const lines = r.stdout.trim().split('\n').filter(l => l.trim().length > 0);
    assertGte(lines.length, 30, `Expected >= 30 lines, got ${lines.length}`);
  });

  test('SKILL.md exists', () => {
    assertFileExists(`${ROOT}/.claude/skills/opencli/SKILL.md`);
  });

  test('opencli-first.md rule exists', () => {
    assertFileExists(`${ROOT}/.claude/rules/opencli-first.md`);
  });

  test('opencli-first.md does not reference Chrome DevTools MCP', () => {
    const contains = fileContains(`${ROOT}/.claude/rules/opencli-first.md`, 'Chrome DevTools MCP');
    assertTruthy(!contains, 'opencli-first.md should not contain "Chrome DevTools MCP"');
  });
});

// ---- Integration tier ----

describe('opencli integration', () => {
  setTier('integration');

  let daemonRunning = false;

  test('opencli doctor exits 0', () => {
    const r = execCmd('opencli doctor', { timeout: 15000 });
    if (!r.success) {
      daemonRunning = false;
      skip('opencli daemon not running');
    }
    daemonRunning = true;
    assertTruthy(r.success, 'opencli doctor should exit 0');
  });

  test('hackernews top returns JSON array with >= 1 item', () => {
    if (!daemonRunning) skip('opencli daemon not running');
    const r = execJson('opencli hackernews top -f json --limit 3', { timeout: 30000 });
    assertTruthy(r.json, `hackernews did not return valid JSON: ${r.stdout.slice(0, 200)}`);
    assertTruthy(Array.isArray(r.json), 'hackernews result should be an array');
    assertGte(r.json.length, 1, 'hackernews array should have >= 1 item');
  });

  test('opencli list contains hackernews adapter', () => {
    if (!daemonRunning) skip('opencli daemon not running');
    const r = execCmd('opencli list');
    assertTruthy(r.success, 'opencli list failed');
    assertContains(r.stdout, 'hackernews', 'list output should contain hackernews');
  });
});

await run('opencli');
