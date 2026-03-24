#!/usr/bin/env node
// Docker & Postgres container health tests
import { describe, test, setTier, assertEqual, assertTruthy, execCmd, skip, run } from '../harness.mjs';

describe('Docker CLI', () => {
  test('docker --version exits 0', () => {
    const r = execCmd('docker --version');
    assertEqual(r.exitCode, 0, `docker --version failed: ${r.stderr}`);
  });

  test('docker compose version exits 0', () => {
    const r = execCmd('docker compose version');
    assertEqual(r.exitCode, 0, `docker compose version failed: ${r.stderr}`);
  });

  setTier('integration');

  test('docker ps exits 0 (daemon running)', () => {
    const r = execCmd('docker ps');
    if (!r.success) skip('Docker daemon not running');
    assertEqual(r.exitCode, 0, 'docker ps failed');
  });

  test('Postgres container healthy (pg_isready)', () => {
    const check = execCmd('docker ps');
    if (!check.success) skip('Docker daemon not running');
    const r = execCmd('docker exec continuous-claude-postgres pg_isready -U claude');
    assertEqual(r.exitCode, 0, `pg_isready failed: ${r.stderr}`);
  });
});

await run('docker');
