#!/usr/bin/env node
// skill-rules.json consistency and content tests
import { readFileSync } from 'fs';
import { describe, test, assertFileExists, assertTruthy, assertGte, assertEqual, run } from '../harness.mjs';

const REPO_PATH = 'C:/Users/david.hayes/continuous-claude/.claude/skills/skill-rules.json';
const ACTIVE_PATH = 'C:/Users/david.hayes/.claude/skills/skill-rules.json';

describe('skill-rules.json', () => {
  test('repo copy exists', () => {
    assertFileExists(REPO_PATH, 'skill-rules.json missing from repo');
  });

  test('active copy exists', () => {
    assertFileExists(ACTIVE_PATH, 'skill-rules.json missing from active ~/.claude');
  });

  test('repo copy has railway-cli key', () => {
    const data = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    assertTruthy(data['railway-cli'], 'railway-cli key missing from skill-rules.json');
  });

  test('repo copy has neonctl key', () => {
    const data = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    assertTruthy(data['neonctl'], 'neonctl key missing from skill-rules.json');
  });

  test('railway-cli score >= 80', () => {
    const data = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    assertGte(data['railway-cli'].score, 80, `railway-cli score too low: ${data['railway-cli'].score}`);
  });

  test('neonctl score >= 80', () => {
    const data = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    assertGte(data['neonctl'].score, 80, `neonctl score too low: ${data['neonctl'].score}`);
  });

  test('railway-cli keywords include "railway"', () => {
    const data = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    const kws = data['railway-cli'].keywords || [];
    assertTruthy(kws.includes('railway'), `railway-cli keywords missing "railway": ${JSON.stringify(kws)}`);
  });

  test('neonctl keywords include "neonctl"', () => {
    const data = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    const kws = data['neonctl'].keywords || [];
    assertTruthy(kws.includes('neonctl'), `neonctl keywords missing "neonctl": ${JSON.stringify(kws)}`);
  });

  test('active copy matches repo copy for railway-cli and neonctl', () => {
    const repo = JSON.parse(readFileSync(REPO_PATH, 'utf8'));
    const active = JSON.parse(readFileSync(ACTIVE_PATH, 'utf8'));
    assertEqual(
      JSON.stringify(repo['railway-cli']),
      JSON.stringify(active['railway-cli']),
      'railway-cli mismatch between repo and active copies'
    );
    assertEqual(
      JSON.stringify(repo['neonctl']),
      JSON.stringify(active['neonctl']),
      'neonctl mismatch between repo and active copies'
    );
  });
});

await run('skill-rules');
