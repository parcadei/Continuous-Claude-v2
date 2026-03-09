#!/usr/bin/env node
/**
 * Structural validation tests for the memory-curate skill.
 * Tests: frontmatter, required sections, references/, line limits, safety requirements.
 *
 * Usage: node test-skill-structure.js
 * Exit 0 = all pass, Exit 1 = failures
 */

const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname);
const SKILL_PATH = path.join(SKILL_DIR, 'SKILL.md');
const REFS_DIR = path.join(SKILL_DIR, 'references');
const RUBRIC_PATH = path.join(REFS_DIR, 'scoring-rubric.md');

let passed = 0;
let failed = 0;

function test(name, condition, detail) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// --- SKILL.md existence and structure ---

console.log('\n=== SKILL.md Structure ===');

test('SKILL.md exists', fs.existsSync(SKILL_PATH));

if (!fs.existsSync(SKILL_PATH)) {
  console.log('\nSkipping remaining tests -- SKILL.md not found.\n');
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(1);
}

const skill = fs.readFileSync(SKILL_PATH, 'utf8');
const skillLines = skill.split('\n');

// Frontmatter
test('Has YAML frontmatter', skill.startsWith('---') && skill.indexOf('---', 3) > 3);

const frontmatter = skill.slice(3, skill.indexOf('---', 3));
test('Frontmatter has name field', frontmatter.includes('name:'));
test('Frontmatter name is memory-curate', frontmatter.includes('name: memory-curate'));
test('Frontmatter has description', frontmatter.includes('description:'));

// Line count (v5 Hybrid: under 404 lines)
test('Under 404 lines', skillLines.length <= 404, `${skillLines.length} lines`);

// Required sections
const requiredSections = [
  'Usage',
  'Triggers',
  'Workflow',
  'Safety',
];

console.log('\n=== Required Sections ===');
for (const section of requiredSections) {
  // Match ## Section or # Section -- case insensitive
  const pattern = new RegExp(`^#+\\s+.*${section}`, 'im');
  test(`Has "${section}" section`, pattern.test(skill));
}

// Trigger keywords
console.log('\n=== Trigger Keywords ===');
const triggerKeywords = ['curate memory', 'clean memory', 'memory audit', 'memory curate'];
for (const kw of triggerKeywords) {
  test(`Contains trigger: "${kw}"`, skill.toLowerCase().includes(kw.toLowerCase()));
}

// Docker connection pattern
console.log('\n=== Docker Connection ===');
test('References docker exec postgres command',
  skill.includes('docker exec continuous-claude-postgres') || skill.includes('docker exec'));

// SQL commands
console.log('\n=== SQL Operations ===');
test('Contains SELECT query for archival_memory',
  skill.includes('SELECT') && skill.includes('archival_memory'));
test('Contains scoring/classification logic',
  skill.includes('KEEP') && skill.includes('REVIEW') && skill.includes('ARCHIVE'));
test('Contains report format section',
  skill.includes('Total entries') || skill.includes('Curation Report') || skill.includes('report'));

// Safety requirements
console.log('\n=== Safety Requirements ===');
test('Default is dry-run/report-only',
  skill.toLowerCase().includes('dry-run') || skill.toLowerCase().includes('report only') || skill.toLowerCase().includes('dry run'));
test('Requires user confirmation for destructive ops',
  skill.toLowerCase().includes('confirm') || skill.toLowerCase().includes('confirmation'));
test('Archives before deleting',
  skill.includes('archival_memory_archived') || (skill.includes('archive') && skill.includes('DELETE')));
test('Has restore capability',
  skill.toLowerCase().includes('restore'));

// References pointer
console.log('\n=== References ===');
test('Points to references/ directory',
  skill.includes('references/') || skill.includes('references\\'));

// --- references/scoring-rubric.md ---

console.log('\n=== references/scoring-rubric.md ===');

test('references/ directory exists', fs.existsSync(REFS_DIR));
test('scoring-rubric.md exists', fs.existsSync(RUBRIC_PATH));

if (fs.existsSync(RUBRIC_PATH)) {
  const rubric = fs.readFileSync(RUBRIC_PATH, 'utf8');
  const rubricLines = rubric.split('\n');

  // Scoring criteria
  test('Has scoring criteria (+3 manual store)',
    rubric.includes('+3') || rubric.includes('manual'));
  test('Has scoring criteria (+2 unique content)',
    rubric.includes('+2') || rubric.includes('unique'));
  test('Has scoring criteria (-2 periodic extraction)',
    rubric.includes('-2') || rubric.includes('periodic'));
  test('Has scoring criteria (-1 near-duplicate)',
    rubric.includes('-1') || rubric.includes('duplicate'));

  // Classification thresholds
  test('Has KEEP threshold (>= 3)',
    rubric.includes('>= 3') || rubric.includes('>=3') || (rubric.includes('KEEP') && rubric.includes('3')));
  test('Has REVIEW threshold (1-2)',
    rubric.includes('1-2') || (rubric.includes('REVIEW') && rubric.includes('1')));
  test('Has ARCHIVE threshold (<= 0)',
    rubric.includes('<= 0') || rubric.includes('<=0') || (rubric.includes('ARCHIVE') && rubric.includes('0')));

  // Signal vs noise examples
  test('Has signal examples',
    rubric.toLowerCase().includes('signal') || rubric.toLowerCase().includes('high-quality') || rubric.toLowerCase().includes('example'));
  test('Has noise examples',
    rubric.toLowerCase().includes('noise') || rubric.toLowerCase().includes('low-quality'));

  // SQL commands
  test('Has SQL for querying entries',
    rubric.includes('SELECT') && rubric.includes('archival_memory'));
  test('Has SQL for creating archive table',
    rubric.includes('CREATE TABLE') && rubric.includes('archival_memory_archived'));
  test('Has SQL for archiving (INSERT INTO ... SELECT)',
    rubric.includes('INSERT INTO') && rubric.includes('SELECT'));
  test('Has SQL for deleting archived entries',
    rubric.includes('DELETE FROM'));
  test('Has SQL for restore operation',
    rubric.toLowerCase().includes('restore') && rubric.includes('INSERT'));
}

// --- Summary ---

console.log(`\n=== SUMMARY ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

process.exit(failed > 0 ? 1 : 0);
