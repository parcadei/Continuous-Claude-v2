#!/usr/bin/env node
// Deployer Agent — smoke-only structure tests
import {
  describe, test,
  assertTruthy, assertContains,
  assertFileExists, fileContains, run
} from '../harness.mjs';
import { readFileSync } from 'fs';

const ROOT = 'C:/Users/david.hayes/continuous-claude';
const AGENT = `${ROOT}/.claude/agents/deployer.md`;

describe('deployer-agent smoke', () => {
  test('deployer.md exists', () => {
    assertFileExists(AGENT);
  });

  test('starts with YAML frontmatter', () => {
    const content = readFileSync(AGENT, 'utf8');
    assertTruthy(content.startsWith('---'), 'deployer.md does not start with "---"');
  });

  test('contains name: deployer', () => {
    assertTruthy(fileContains(AGENT, 'name: deployer'), 'missing "name: deployer"');
  });

  test('contains model: sonnet', () => {
    assertTruthy(fileContains(AGENT, 'model: sonnet'), 'missing "model: sonnet"');
  });

  test('Vercel routing table present', () => {
    assertTruthy(fileContains(AGENT, 'Vercel'), 'missing "Vercel" routing');
  });

  test('Railway routing table present', () => {
    assertTruthy(fileContains(AGENT, 'Railway'), 'missing "Railway" routing');
  });

  test('WARNING near railway down', () => {
    assertTruthy(fileContains(AGENT, 'WARNING'), 'missing "WARNING" for destructive commands');
  });

  test('.vercel/ platform detection', () => {
    assertTruthy(fileContains(AGENT, '.vercel/'), 'missing ".vercel/" platform detection');
  });

  test('.railway/ platform detection', () => {
    assertTruthy(fileContains(AGENT, '.railway/'), 'missing ".railway/" platform detection');
  });

  test('tie-breaking rule mentions ask', () => {
    const content = readFileSync(AGENT, 'utf8').toLowerCase();
    assertTruthy(content.includes('ask'), 'missing "ask" tie-breaking rule');
  });

  test('Ralph output contract present', () => {
    const content = readFileSync(AGENT, 'utf8');
    assertTruthy(
      content.includes('ralph_status') || content.includes('deploy_status'),
      'missing ralph_status or deploy_status output contract'
    );
  });
});

await run('deployer-agent');
