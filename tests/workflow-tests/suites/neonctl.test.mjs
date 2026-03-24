#!/usr/bin/env node
// neonctl — smoke + integration tests
import {
  describe, test, setTier,
  assertEqual, assertTruthy, assertContains,
  assertFileExists, assertJsonValid,
  execCmd, fileContains, skip, run
} from '../harness.mjs';

const ROOT = 'C:/Users/david.hayes/continuous-claude';
const SKILL = `${ROOT}/.claude/skills/neonctl`;

describe('neonctl smoke', () => {
  test('neonctl --help exits 0', () => {
    const r = execCmd('neonctl --help');
    assertEqual(r.exitCode, 0, `neonctl --help exited ${r.exitCode}: ${r.stderr}`);
  });

  test('neonctl -v outputs version', () => {
    const r = execCmd('neonctl -v');
    assertTruthy(r.stdout.trim().length > 0, 'No version output');
  });

  test('SKILL.md exists', () => {
    assertFileExists(`${SKILL}/SKILL.md`);
  });

  test('references/branches.md exists', () => {
    assertFileExists(`${SKILL}/references/branches.md`);
  });

  test('references/connection.md exists', () => {
    assertFileExists(`${SKILL}/references/connection.md`);
  });

  test('references/sql.md exists', () => {
    assertFileExists(`${SKILL}/references/sql.md`);
  });

  test('references/projects.md exists', () => {
    assertFileExists(`${SKILL}/references/projects.md`);
  });

  test('neonctl-safety rule exists', () => {
    assertFileExists(`${ROOT}/.claude/rules/neonctl-safety.md`);
  });

  test('SKILL.md contains -o json', () => {
    assertTruthy(
      fileContains(`${SKILL}/SKILL.md`, '-o json'),
      'SKILL.md missing "-o json"'
    );
  });

  test('databases skill references neonctl', () => {
    const dbSkill = `${ROOT}/.claude/skills/databases/SKILL.md`;
    assertFileExists(dbSkill);
    assertTruthy(
      fileContains(dbSkill, 'neonctl'),
      'databases SKILL.md does not mention "neonctl"'
    );
  });
});

describe('neonctl integration', () => {
  setTier('integration');

  test('neonctl me -o json returns valid JSON', () => {
    const auth = execCmd('neonctl me');
    if (!auth.success) skip('neonctl not authenticated');
    const r = execCmd('neonctl me -o json');
    assertTruthy(r.success, `neonctl me -o json failed: ${r.stderr}`);
    assertJsonValid(r.stdout.trim(), 'neonctl me -o json did not return valid JSON');
  });
});

await run('neonctl');
