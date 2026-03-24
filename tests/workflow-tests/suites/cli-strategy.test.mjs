#!/usr/bin/env node
// CLI integration strategy document completeness tests
import { describe, test, setTier, assertFileExists, assertContains, assertNotContains,
         assertTruthy, execCmd, fileContains, skip, run } from '../harness.mjs';
import { readFileSync } from 'fs';

const STRATEGY = 'C:/Users/david.hayes/continuous-claude/.claude/rules/cli-integration-strategy.md';

describe('CLI Integration Strategy', () => {
  test('strategy file exists', () => {
    assertFileExists(STRATEGY, 'cli-integration-strategy.md missing');
  });

  test('contains 6-tier decision tree', () => {
    const content = readFileSync(STRATEGY, 'utf8');
    const tiers = ['Native CLI', 'OpenCLI', 'MCP', 'CLI-Anything', 'wrapper', 'browser automation'];
    const found = tiers.filter(t => content.toLowerCase().includes(t.toLowerCase()));
    assertTruthy(found.length >= 4, `Only found ${found.length}/6 tiers: ${found.join(', ')}`);
  });

  test('Railway marked DONE', () => {
    const content = readFileSync(STRATEGY, 'utf8');
    assertContains(content, 'DONE', 'Railway should be marked DONE');
    assertNotContains(content, 'Not integrated', 'Should not contain "Not integrated" for Railway');
  });

  test('neonctl marked DONE', () => {
    const content = readFileSync(STRATEGY, 'utf8');
    // Both Railway and neonctl are DONE — verify neonctl appears near DONE
    assertTruthy(
      content.includes('neonctl') && content.includes('DONE'),
      'neonctl should appear alongside DONE status'
    );
  });

  test('inventory contains railway', () => {
    assertTruthy(fileContains(STRATEGY, 'railway'), 'railway missing from inventory');
  });

  test('inventory contains neonctl', () => {
    assertTruthy(fileContains(STRATEGY, 'neonctl'), 'neonctl missing from inventory');
  });

  test('inventory contains cdp.mjs', () => {
    assertTruthy(fileContains(STRATEGY, 'cdp.mjs'), 'cdp.mjs missing from inventory');
  });

  test('inventory contains opencli', () => {
    assertTruthy(fileContains(STRATEGY, 'opencli'), 'opencli missing from inventory');
  });

  test('does NOT reference Chrome DevTools MCP', () => {
    const content = readFileSync(STRATEGY, 'utf8');
    assertNotContains(content, 'Chrome DevTools MCP', 'Stale Chrome DevTools MCP reference found');
  });

  setTier('integration');

  test('railway --help exits 0', () => {
    const r = execCmd('railway --help');
    if (!r.success) skip('railway CLI not on PATH');
  });

  test('neonctl --help exits 0', () => {
    const r = execCmd('neonctl --help');
    if (!r.success) skip('neonctl not on PATH');
  });

  test('gh --version exits 0', () => {
    const r = execCmd('gh --version');
    if (!r.success) skip('gh CLI not on PATH');
  });

  test('vercel --version exits 0', () => {
    const r = execCmd('vercel --version');
    if (!r.success) skip('vercel CLI not on PATH');
  });
});

await run('cli-strategy');
