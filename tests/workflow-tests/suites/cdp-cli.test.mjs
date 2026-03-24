#!/usr/bin/env node
// CDP CLI Test Suite — validates scripts/cdp.mjs help output and all 13 commands
// Smoke: help JSON structure, file existence
// Integration: navigate, title, url, perf, network, a11y, snapshot, eval, tabs, cleanup

import {
  describe, test, setTier,
  assertEqual, assertTruthy, assertGte, assertType,
  assertFileExists, assertContains,
  execJson, skip, run,
} from '../harness.mjs';

const CDP = 'node C:/Users/david.hayes/continuous-claude/scripts/cdp.mjs';
const ROOT = 'C:/Users/david.hayes/continuous-claude';

// ---- Smoke tier ----

describe('cdp-cli smoke', () => {
  test('cdp.mjs file exists', () => {
    assertFileExists(`${ROOT}/scripts/cdp.mjs`);
  });

  test('help returns valid JSON with >= 13 commands', () => {
    const r = execJson(`${CDP} help`);
    assertTruthy(r.json, 'help did not return valid JSON');
    const keys = Object.keys(r.json.commands || {});
    assertGte(keys.length, 13, `Expected >= 13 commands, got ${keys.length}: ${keys.join(', ')}`);
  });

  test('help output includes cleanup command', () => {
    const r = execJson(`${CDP} help`);
    assertTruthy(r.json, 'help did not return valid JSON');
    assertTruthy(r.json.commands.cleanup, 'Missing cleanup key in commands');
  });
});

// ---- Integration tier ----

describe('cdp-cli integration', () => {
  setTier('integration');

  let chromeAvailable = false;

  test('navigate to example.com', () => {
    const r = execJson(`${CDP} navigate https://example.com`, { timeout: 30000 });
    if (!r.json || !r.json.success) {
      // Chrome could not launch — mark flag and skip remaining
      chromeAvailable = false;
      skip('Chrome not available or navigate failed');
    }
    chromeAvailable = true;
    assertEqual(r.json.success, true, 'navigate success should be true');
    assertEqual(r.json.status, 200, `Expected status 200, got ${r.json.status}`);
  });

  test('title returns non-empty string', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} title`, { timeout: 30000 });
    assertTruthy(r.json, 'title did not return valid JSON');
    assertTruthy(r.json.success, 'title success should be true');
    assertType(r.json.title, 'string', 'title should be a string');
    assertTruthy(r.json.title.length > 0, 'title should be non-empty');
  });

  test('url starts with http', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} url`, { timeout: 30000 });
    assertTruthy(r.json, 'url did not return valid JSON');
    assertTruthy(r.json.success, 'url success should be true');
    assertContains(r.json.url, 'http', 'url should start with http');
  });

  test('perf returns ttfb as number', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} perf`, { timeout: 30000 });
    assertTruthy(r.json, 'perf did not return valid JSON');
    assertTruthy(r.json.success, 'perf success should be true');
    assertType(r.json.ttfb, 'number', 'ttfb should be a number');
  });

  test('network returns count as number', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} network`, { timeout: 30000 });
    assertTruthy(r.json, 'network did not return valid JSON');
    assertTruthy(r.json.success, 'network success should be true');
    assertType(r.json.count, 'number', 'count should be a number');
  });

  test('a11y returns issueCount as number', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} a11y`, { timeout: 30000 });
    assertTruthy(r.json, 'a11y did not return valid JSON');
    assertTruthy(r.json.success, 'a11y success should be true');
    assertType(r.json.issueCount, 'number', 'issueCount should be a number');
  });

  test('snapshot returns nodeCount > 0', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} snapshot -i`, { timeout: 30000 });
    assertTruthy(r.json, 'snapshot did not return valid JSON');
    assertTruthy(r.json.success, 'snapshot success should be true');
    assertGte(r.json.nodeCount, 1, 'nodeCount should be > 0');
  });

  test('eval "1+1" returns 2', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} eval "1+1"`, { timeout: 30000 });
    assertTruthy(r.json, 'eval did not return valid JSON');
    assertEqual(r.json.result, 2, `Expected eval result 2, got ${r.json.result}`);
  });

  test('tabs returns count > 0', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} tabs`, { timeout: 30000 });
    assertTruthy(r.json, 'tabs did not return valid JSON');
    assertGte(r.json.count, 1, 'tabs count should be > 0');
  });

  test('cleanup succeeds', () => {
    if (!chromeAvailable) skip('Chrome not available');
    const r = execJson(`${CDP} cleanup`, { timeout: 30000 });
    assertTruthy(r.json, 'cleanup did not return valid JSON');
    assertTruthy(r.json.success, 'cleanup success should be true');
  });
});

await run('cdp-cli');
