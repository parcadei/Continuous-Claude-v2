#!/usr/bin/env node
/**
 * Structural validation test for win-preflight skill.
 * Verifies:
 *  1. SKILL.md exists with correct frontmatter
 *  2. SKILL.md is under 404 lines
 *  3. All 6 checks are documented
 *  4. Output format section exists
 *  5. references/windows-antipatterns.md exists
 *  6. References doc covers all 6 patterns
 *  7. Trigger keywords are present in frontmatter/description
 *  8. Git diff scoping is documented
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname);
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md');
const REF_DIR = path.join(SKILL_DIR, 'references');
const REF_FILE = path.join(REF_DIR, 'windows-antipatterns.md');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === true) {
      passed++;
      results.push({ name, status: 'PASS' });
    } else {
      failed++;
      results.push({ name, status: 'FAIL', reason: result || 'returned falsy' });
    }
  } catch (e) {
    failed++;
    results.push({ name, status: 'FAIL', reason: e.message });
  }
}

// Test 1: SKILL.md exists
test('SKILL.md exists', () => {
  return fs.existsSync(SKILL_FILE);
});

// Test 2: SKILL.md has frontmatter with name and description
test('SKILL.md has frontmatter', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  if (!content.startsWith('---')) return 'missing frontmatter delimiter';
  const fmEnd = content.indexOf('---', 3);
  if (fmEnd === -1) return 'missing closing frontmatter delimiter';
  const fm = content.slice(3, fmEnd);
  if (!fm.includes('name:')) return 'missing name field';
  if (!fm.includes('description:')) return 'missing description field';
  return true;
});

// Test 3: SKILL.md is under 404 lines
test('SKILL.md is under 404 lines', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const lines = content.split('\n').length;
  if (lines > 404) return `${lines} lines exceeds 404 limit`;
  return true;
});

// Test 4: All 6 checks documented in SKILL.md
test('Check 1 (Unicode/emoji) documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('Unicode') || content.includes('unicode') || content.includes('emoji') || content.includes('non-ASCII');
});

test('Check 2 (python3) documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('python3');
});

test('Check 3 (bare /Users/ paths) documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('/Users/') || content.includes('drive letter');
});

test('Check 4 (npx without cmd) documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('npx') && (content.includes('cmd') || content.includes('MCP'));
});

test('Check 5 (net.Socket) documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('net.Socket') || content.includes('Socket');
});

test('Check 6 (encoding) documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('cp1252') || content.includes('encoding');
});

// Test 5: Output format section exists
test('Output format section exists', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('Output') && (content.includes('PASS') || content.includes('FAIL'));
});

// Test 6: references/windows-antipatterns.md exists
test('references/windows-antipatterns.md exists', () => {
  return fs.existsSync(REF_FILE);
});

// Test 7: References doc covers all 6 patterns
test('References covers Unicode pattern', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  return content.includes('Unicode') || content.includes('unicode') || content.includes('cp1252');
});

test('References covers python3 pattern', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  return content.includes('python3');
});

test('References covers bare paths pattern', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  return content.includes('/Users/') || content.includes('drive letter');
});

test('References covers npx pattern', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  return content.includes('npx');
});

test('References covers net.Socket pattern', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  return content.includes('net.Socket') || content.includes('Socket');
});

test('References covers encoding pattern', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  return content.includes('encoding') || content.includes('cp1252');
});

// Test 8: Trigger keywords present
test('Trigger keywords in description', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  const triggers = ['windows check', 'win preflight', 'platform check', 'windows preflight'];
  const desc = content.toLowerCase();
  const found = triggers.filter(t => desc.includes(t));
  if (found.length < 2) return `only found ${found.length} of 4 trigger phrases`;
  return true;
});

// Test 9: Git diff scoping documented
test('Git diff scoping documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('git diff') || content.includes('--name-only');
});

// Test 10: Full scan option documented
test('Full scan option documented', () => {
  const content = fs.readFileSync(SKILL_FILE, 'utf-8');
  return content.includes('full scan') || content.includes('scan all');
});

// Test 11: Each reference pattern has error message, fix, and example
test('References has error messages for patterns', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  // Should have multiple "Error" or "error" references describing failure messages
  const errorCount = (content.match(/error|Error|ERROR/g) || []).length;
  if (errorCount < 3) return `only ${errorCount} error references, expected 3+`;
  return true;
});

test('References has fix instructions', () => {
  const content = fs.readFileSync(REF_FILE, 'utf-8');
  const fixCount = (content.match(/[Ff]ix|[Ss]olution|[Rr]esolve/g) || []).length;
  if (fixCount < 6) return `only ${fixCount} fix references, expected 6+`;
  return true;
});

// Print results
console.log('\nWindows Pre-flight Skill - Structural Validation');
console.log('='.repeat(50));
for (const r of results) {
  const icon = r.status === 'PASS' ? '[PASS]' : '[FAIL]';
  const detail = r.reason ? ` -- ${r.reason}` : '';
  console.log(`  ${icon} ${r.name}${detail}`);
}
console.log('='.repeat(50));
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
