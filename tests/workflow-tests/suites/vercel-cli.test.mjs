#!/usr/bin/env node
// Vercel CLI — smoke + integration tests
import {
  describe, test, setTier,
  assertEqual, assertTruthy, assertContains, assertGte,
  assertFileExists, execCmd, fileContains, skip, run
} from '../harness.mjs';

const ROOT = 'C:/Users/david.hayes/continuous-claude';
const SKILL = `${ROOT}/.claude/skills/vercel-cli`;

describe('vercel-cli smoke', () => {
  test('vercel --version exits 0', () => {
    const r = execCmd('vercel --version');
    assertEqual(r.exitCode, 0, `vercel --version exited ${r.exitCode}: ${r.stderr}`);
  });

  test('SKILL.md exists', () => {
    assertFileExists(`${SKILL}/SKILL.md`);
  });

  test('at least 10 reference files', () => {
    const r = execCmd(`ls "${SKILL}/references/" | wc -l`);
    assertTruthy(r.success, `Could not list references: ${r.stderr}`);
    const count = parseInt(r.stdout.trim(), 10);
    assertGte(count, 10, `Expected >= 10 reference files, got ${count}`);
  });

  test('deployer agent mentions Vercel', () => {
    const agentPath = `${ROOT}/.claude/agents/deployer.md`;
    assertFileExists(agentPath);
    assertTruthy(
      fileContains(agentPath, 'Vercel'),
      'deployer.md does not mention "Vercel"'
    );
  });
});

describe('vercel-cli integration', () => {
  setTier('integration');

  test('vercel whoami returns username', () => {
    const r = execCmd('vercel whoami');
    if (!r.success) skip('vercel not authenticated');
    assertTruthy(r.stdout.trim().length > 0, 'whoami returned empty');
  });
});

await run('vercel-cli');
