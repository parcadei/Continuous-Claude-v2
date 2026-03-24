#!/usr/bin/env node
// Browser Automation Test Suite — validates documentation consistency across
// browser-automation rule, browser-dev-cycle skill, and supporting references
// Smoke tier only: file existence and content checks

import { readFileSync } from 'fs';
import {
  describe, test,
  assertTruthy, assertFileExists, assertContains, fileContains, run,
} from '../harness.mjs';

const ROOT = 'C:/Users/david.hayes/continuous-claude';
const RULES = `${ROOT}/.claude/rules`;
const SKILL = `${ROOT}/.claude/skills/browser-dev-cycle`;

describe('browser-automation smoke', () => {
  test('browser-automation.md rule exists', () => {
    assertFileExists(`${RULES}/browser-automation.md`);
  });

  test('browser-automation.md contains CDP CLI', () => {
    assertTruthy(
      fileContains(`${RULES}/browser-automation.md`, 'CDP CLI'),
      'browser-automation.md should reference CDP CLI',
    );
  });

  test('browser-automation.md Tier 2 row does not reference Chrome DevTools MCP', () => {
    // Read the file and check the Tier 2 table row specifically
    const content = readFileSync(`${RULES}/browser-automation.md`, 'utf8');
    const lines = content.split('\n');
    const tier2Lines = lines.filter(l => l.includes('| 2 |') || l.includes('Tier 2'));
    const tier2Text = tier2Lines.join(' ');
    assertTruthy(
      !tier2Text.includes('Chrome DevTools MCP'),
      'Tier 2 row should not reference Chrome DevTools MCP',
    );
  });

  test('tier2-devtools.md reference exists', () => {
    assertFileExists(`${SKILL}/references/tier2-devtools.md`);
  });

  test('tier2-devtools.md contains cdp.mjs', () => {
    assertTruthy(
      fileContains(`${SKILL}/references/tier2-devtools.md`, 'cdp.mjs'),
      'tier2-devtools.md should reference cdp.mjs',
    );
  });

  test('browser-dev-cycle SKILL.md contains CDP CLI', () => {
    assertTruthy(
      fileContains(`${SKILL}/SKILL.md`, 'CDP CLI'),
      'SKILL.md should reference CDP CLI',
    );
  });

  test('tool-comparison.md contains CDP CLI', () => {
    assertTruthy(
      fileContains(`${SKILL}/references/tool-comparison.md`, 'CDP CLI'),
      'tool-comparison.md should reference CDP CLI',
    );
  });

  test('workflow-recipes.md does not contain devtools_ prefix', () => {
    assertTruthy(
      !fileContains(`${SKILL}/references/workflow-recipes.md`, 'devtools_'),
      'workflow-recipes.md should not contain devtools_ prefix (deprecated tool names)',
    );
  });
});

await run('browser-automation');
