#!/usr/bin/env node
// Stale reference detection — no dead tool references in skills/rules
import { readFileSync, existsSync } from 'fs';
import { describe, test, assertEqual, assertTruthy, assertContains,
         grepDir, fileContains, skip, run } from '../harness.mjs';

const BROWSER_SKILL = 'C:/Users/david.hayes/continuous-claude/.claude/skills/browser-dev-cycle';
const RULES_DIR = 'C:/Users/david.hayes/continuous-claude/.claude/rules';
const BROWSER_RULE = 'C:/Users/david.hayes/continuous-claude/.claude/rules/browser-automation.md';
const GLOBAL_MCP = 'C:/Users/david.hayes/.mcp.json';
const USER_MCP = 'C:/Users/david.hayes/.claude/mcp.json';

describe('Stale References', () => {
  test('no "Chrome DevTools MCP" in browser-dev-cycle skill', () => {
    const matches = grepDir(BROWSER_SKILL, 'Chrome DevTools MCP');
    assertEqual(matches, '', `Stale "Chrome DevTools MCP" found in browser-dev-cycle:\n${matches}`);
  });

  test('no "devtools_" tool refs in browser-dev-cycle skill', () => {
    const matches = grepDir(BROWSER_SKILL, 'devtools_');
    assertEqual(matches, '', `Stale "devtools_" references in browser-dev-cycle:\n${matches}`);
  });

  test('no "Chrome DevTools MCP" in rules dir', () => {
    const matches = grepDir(RULES_DIR, 'Chrome DevTools MCP');
    assertEqual(matches, '', `Stale "Chrome DevTools MCP" found in rules:\n${matches}`);
  });

  test('~/.mcp.json does not have chrome-devtools key', () => {
    if (!existsSync(GLOBAL_MCP)) skip('~/.mcp.json not found');
    const data = JSON.parse(readFileSync(GLOBAL_MCP, 'utf8'));
    const servers = data.mcpServers || {};
    assertTruthy(
      !servers['chrome-devtools'],
      'chrome-devtools key still present in ~/.mcp.json'
    );
  });

  test('~/.claude/mcp.json does not have chrome-devtools key', () => {
    if (!existsSync(USER_MCP)) skip('~/.claude/mcp.json not found');
    const data = JSON.parse(readFileSync(USER_MCP, 'utf8'));
    const servers = data.mcpServers || {};
    assertTruthy(
      !servers['chrome-devtools'],
      'chrome-devtools key still present in ~/.claude/mcp.json'
    );
  });

  test('browser-automation.md Tier 2 references CDP CLI', () => {
    assertTruthy(
      fileContains(BROWSER_RULE, 'CDP CLI'),
      'browser-automation.md Tier 2 should reference "CDP CLI"'
    );
  });
});

await run('stale-refs');
