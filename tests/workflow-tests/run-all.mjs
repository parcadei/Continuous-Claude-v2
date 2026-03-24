#!/usr/bin/env node
// Combined test runner — executes all workflow test suites and produces a combined report

import { execSync } from 'child_process';
import { readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITES_DIR = join(__dirname, 'suites');
const RESULTS_DIR = join(__dirname, 'results');

mkdirSync(RESULTS_DIR, { recursive: true });

const suiteFiles = readdirSync(SUITES_DIR)
  .filter(f => f.endsWith('.test.mjs'))
  .sort();

console.error(`\n=== Workflow Tests: ${suiteFiles.length} suites ===\n`);

const results = [];
let totalPass = 0, totalFail = 0, totalSkip = 0, totalTests = 0;

for (const file of suiteFiles) {
  const suitePath = join(SUITES_DIR, file);
  const suiteName = file.replace('.test.mjs', '');
  console.error(`Running: ${suiteName}...`);

  try {
    const output = execSync(`node "${suitePath}"`, {
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'inherit'], // stderr passes through for live output
    });

    // Parse the last line of stdout as JSON (harness outputs JSON on stdout)
    const lines = output.trim().split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1];
    try {
      const suiteResult = JSON.parse(lastLine);
      results.push(suiteResult);
      totalPass += suiteResult.summary.pass;
      totalFail += suiteResult.summary.fail;
      totalSkip += suiteResult.summary.skip;
      totalTests += suiteResult.summary.total;
    } catch {
      results.push({ suite: suiteName, error: 'Failed to parse results', raw: lastLine });
      totalFail++;
      totalTests++;
    }
  } catch (e) {
    console.error(`  ERROR: ${suiteName} crashed: ${e.message.slice(0, 100)}`);
    results.push({ suite: suiteName, error: e.message.slice(0, 200), summary: { total: 1, pass: 0, fail: 1, skip: 0 }, grade: 'F' });
    totalFail++;
    totalTests++;
  }
}

// Calculate overall grade
const graded = totalTests - totalSkip;
const passRate = graded > 0 ? (totalPass / graded) * 100 : 100;
const overallGrade = passRate === 100 ? 'A' : passRate >= 90 ? 'B' : passRate >= 80 ? 'C' : passRate >= 70 ? 'D' : 'F';

const combined = {
  timestamp: new Date().toISOString(),
  overall: { total: totalTests, pass: totalPass, fail: totalFail, skip: totalSkip, grade: overallGrade, passRate: Math.round(passRate * 10) / 10 },
  suites: results.map(r => ({
    name: r.suite,
    total: r.summary?.total || 0,
    pass: r.summary?.pass || 0,
    fail: r.summary?.fail || 0,
    skip: r.summary?.skip || 0,
    grade: r.grade || 'F',
    error: r.error || undefined,
  })),
};

// Write combined report
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const combinedPath = join(RESULTS_DIR, `combined-${ts}.json`);
writeFileSync(combinedPath, JSON.stringify(combined, null, 2));

// Console summary table
console.error('\n' + '='.repeat(60));
console.error('COMBINED RESULTS');
console.error('='.repeat(60));
console.error(`${'Suite'.padEnd(25)} ${'Pass'.padStart(5)} ${'Fail'.padStart(5)} ${'Skip'.padStart(5)} ${'Grade'.padStart(6)}`);
console.error('-'.repeat(60));
for (const s of combined.suites) {
  const name = (s.name || 'unknown').padEnd(25);
  console.error(`${name} ${String(s.pass).padStart(5)} ${String(s.fail).padStart(5)} ${String(s.skip).padStart(5)} ${(s.grade || 'F').padStart(6)}`);
}
console.error('-'.repeat(60));
console.error(`${'TOTAL'.padEnd(25)} ${String(totalPass).padStart(5)} ${String(totalFail).padStart(5)} ${String(totalSkip).padStart(5)} ${overallGrade.padStart(6)}`);
console.error(`\nPass rate: ${combined.overall.passRate}%`);
console.error(`Results: ${combinedPath}\n`);

// Stdout: combined JSON
console.log(JSON.stringify(combined));
