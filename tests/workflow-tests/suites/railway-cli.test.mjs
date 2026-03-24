#!/usr/bin/env node
// Railway CLI — smoke + integration tests
import {
  describe, test, setTier,
  assertEqual, assertTruthy, assertContains,
  assertFileExists, execCmd, fileContains, skip, run
} from '../harness.mjs';

const ROOT = 'C:/Users/david.hayes/continuous-claude';
const SKILL = `${ROOT}/.claude/skills/railway-cli`;

describe('railway-cli smoke', () => {
  test('railway --help exits 0', () => {
    const r = execCmd('railway --help');
    assertEqual(r.exitCode, 0, `railway --help exited ${r.exitCode}: ${r.stderr}`);
  });

  test('railway -V outputs version', () => {
    const r = execCmd('railway -V');
    assertTruthy(r.stdout.trim().length > 0, 'No version output');
  });

  test('SKILL.md exists', () => {
    assertFileExists(`${SKILL}/SKILL.md`);
  });

  test('references/deployment.md exists', () => {
    assertFileExists(`${SKILL}/references/deployment.md`);
  });

  test('references/environment.md exists', () => {
    assertFileExists(`${SKILL}/references/environment.md`);
  });

  test('references/monitoring.md exists', () => {
    assertFileExists(`${SKILL}/references/monitoring.md`);
  });

  test('references/services.md exists', () => {
    assertFileExists(`${SKILL}/references/services.md`);
  });

  test('railway-deploy rule exists', () => {
    assertFileExists(`${ROOT}/.claude/rules/railway-deploy.md`);
  });

  test('SKILL.md contains name: railway-cli', () => {
    assertTruthy(
      fileContains(`${SKILL}/SKILL.md`, 'name: railway-cli'),
      'SKILL.md missing "name: railway-cli"'
    );
  });
});

describe('railway-cli integration', () => {
  setTier('integration');

  test('railway whoami returns username', () => {
    const auth = execCmd('railway whoami');
    if (!auth.success) skip('railway not authenticated');
    assertTruthy(auth.stdout.trim().length > 0, 'whoami returned empty');
  });
});

await run('railway-cli');
