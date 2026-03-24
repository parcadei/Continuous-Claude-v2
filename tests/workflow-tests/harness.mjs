#!/usr/bin/env node
// Workflow Test Harness — shared test framework for CLI integration tests
// Usage: import { describe, test, assertEqual, run } from '../harness.mjs'

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, 'results');

// Test registry
const suites = [];
let currentSuite = null;

// --- Public API ---

export function describe(name, fn) {
  currentSuite = { name, tests: [], tier: 'smoke' };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

export function test(name, fn) {
  if (!currentSuite) throw new Error('test() must be called inside describe()');
  currentSuite.tests.push({ name, fn, tier: currentSuite.tier });
}

export function setTier(tier) {
  if (currentSuite) currentSuite.tier = tier;
}

// --- Assertions ---

export function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertTruthy(val, msg) {
  if (!val) throw new Error(msg || `Expected truthy, got ${JSON.stringify(val)}`);
}

export function assertContains(str, sub, msg) {
  if (typeof str !== 'string' || !str.includes(sub)) {
    throw new Error(msg || `Expected string to contain "${sub}", got: ${String(str).slice(0, 100)}`);
  }
}

export function assertNotContains(str, sub, msg) {
  if (typeof str === 'string' && str.includes(sub)) {
    throw new Error(msg || `Expected string NOT to contain "${sub}"`);
  }
}

export function assertJsonValid(str, msg) {
  try {
    JSON.parse(str);
  } catch {
    throw new Error(msg || `Invalid JSON: ${String(str).slice(0, 100)}`);
  }
}

export function assertFileExists(path, msg) {
  if (!existsSync(path)) {
    throw new Error(msg || `File not found: ${path}`);
  }
}

export function assertGte(actual, expected, msg) {
  if (actual < expected) {
    throw new Error(msg || `Expected >= ${expected}, got ${actual}`);
  }
}

export function assertType(val, type, msg) {
  if (typeof val !== type) {
    throw new Error(msg || `Expected type ${type}, got ${typeof val}`);
  }
}

// --- CLI Helpers ---

export function execCmd(cmd, opts = {}) {
  try {
    const result = spawnSync('bash', ['-c', cmd], {
      encoding: 'utf8',
      timeout: opts.timeout || 30000,
      maxBuffer: opts.maxBuffer || 5 * 1024 * 1024,
    });
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.status,
      success: result.status === 0,
    };
  } catch (e) {
    return { stdout: '', stderr: e.message, exitCode: 1, success: false };
  }
}

export function execJson(cmd, opts = {}) {
  const result = execCmd(cmd, opts);
  if (!result.success) return { ...result, json: null };
  try {
    return { ...result, json: JSON.parse(result.stdout.trim()) };
  } catch {
    return { ...result, json: null };
  }
}

export function grepDir(dir, pattern) {
  const result = execCmd(`grep -r "${pattern}" "${dir}" 2>/dev/null | head -20`);
  return result.stdout.trim();
}

export function fileContains(path, text) {
  if (!existsSync(path)) return false;
  return readFileSync(path, 'utf8').includes(text);
}

export function skip(reason) {
  throw new SkipError(reason);
}

class SkipError extends Error {
  constructor(reason) { super(reason); this.isSkip = true; }
}

// --- Runner ---

export async function run(suiteName) {
  const startTime = Date.now();
  const results = { suite: suiteName, timestamp: new Date().toISOString(), tests: [] };
  let pass = 0, fail = 0, skipped = 0;

  for (const suite of suites) {
    for (const t of suite.tests) {
      const tStart = Date.now();
      try {
        await t.fn();
        results.tests.push({ name: t.name, status: 'pass', duration_ms: Date.now() - tStart, tier: suite.tier });
        pass++;
        process.stderr.write(`  PASS  ${t.name}\n`);
      } catch (e) {
        if (e.isSkip) {
          results.tests.push({ name: t.name, status: 'skip', reason: e.message, tier: suite.tier });
          skipped++;
          process.stderr.write(`  SKIP  ${t.name} (${e.message})\n`);
        } else {
          results.tests.push({ name: t.name, status: 'fail', error: e.message, duration_ms: Date.now() - tStart, tier: suite.tier });
          fail++;
          process.stderr.write(`  FAIL  ${t.name}: ${e.message}\n`);
        }
      }
    }
  }

  const total = pass + fail + skipped;
  const passRate = total > 0 ? (pass / (total - skipped)) * 100 : 100;
  const grade = passRate === 100 ? 'A' : passRate >= 90 ? 'B' : passRate >= 80 ? 'C' : passRate >= 70 ? 'D' : 'F';

  results.summary = { total, pass, fail, skip: skipped };
  results.grade = grade;
  results.duration_ms = Date.now() - startTime;

  // Write results
  mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resultPath = join(RESULTS_DIR, `${suiteName}-${ts}.json`);
  writeFileSync(resultPath, JSON.stringify(results, null, 2));

  // Console summary
  process.stderr.write(`\n--- ${suiteName} ---\n`);
  process.stderr.write(`Total: ${total} | Pass: ${pass} | Fail: ${fail} | Skip: ${skipped} | Grade: ${grade}\n`);
  process.stderr.write(`Results: ${resultPath}\n\n`);

  // Stdout: JSON for run-all.mjs to collect
  console.log(JSON.stringify(results));

  return results;
}
