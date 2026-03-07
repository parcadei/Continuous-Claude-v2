#!/usr/bin/env node
/**
 * Phase 6: Cross-Skill Collision Testing
 *
 * Feeds ALL "should-trigger" queries through the hook and identifies
 * multi-skill matches (collisions). Reports collision pairs with frequency.
 *
 * Usage:
 *   node collision-test.js              # Run collision analysis
 *   node collision-test.js --verbose    # Show each collision detail
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'C:/Users/david.hayes/.claude/skills';
const EVAL_DIR = path.join(SKILLS_DIR, '_eval');
const HOOK_PATH = 'C:/Users/david.hayes/.claude/hooks/dist/skill-activation-prompt.mjs';
const CWD = 'C:/Users/david.hayes/continuous-claude';

const verbose = process.argv.includes('--verbose');

// Reuse runHook and extractMatchedSkills from eval-harness
function runHook(prompt) {
  const input = JSON.stringify({
    session_id: 'collision-test',
    transcript_path: '',
    cwd: CWD,
    permission_mode: 'default',
    prompt: prompt,
  });

  const result = spawnSync('node', [HOOK_PATH], {
    input,
    encoding: 'utf-8',
    timeout: 10000,
    env: {
      ...process.env,
      HOME: 'C:/Users/david.hayes',
      USERPROFILE: 'C:/Users/david.hayes',
      CLAUDE_PROJECT_DIR: CWD,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return { error: true };
  }
}

function extractMatchedSkills(hookOutput) {
  if (!hookOutput || hookOutput.error) return { skills: [], workflow: null };

  const message = hookOutput.message || hookOutput.reason || '';
  const skills = [];
  let workflow = null;

  const workflowMatch = message.match(/WORKFLOW DETECTED:\s*\/(\S+)/);
  if (workflowMatch) workflow = workflowMatch[1];

  const skillPattern = /^\s+(?:\u2192|->)+\s+(\S+)/gm;
  let m;
  while ((m = skillPattern.exec(message)) !== null) {
    if (!skills.includes(m[1])) skills.push(m[1]);
  }

  const ambigPattern = /^\s+(?:\u2022|\*)\s+(\S+)/gm;
  while ((m = ambigPattern.exec(message)) !== null) {
    if (!skills.includes(m[1])) skills.push(m[1]);
  }

  return { skills, workflow };
}

// Load eval sets
const evalSetsPath = path.join(EVAL_DIR, 'eval-sets.json');
const evalSets = JSON.parse(fs.readFileSync(evalSetsPath, 'utf-8'));

// Collect all should-trigger prompts
const positivePrompts = [];
for (const [skillName, evalSet] of Object.entries(evalSets)) {
  for (const c of evalSet.cases) {
    if (c.shouldTrigger) {
      positivePrompts.push({
        prompt: c.prompt,
        expectedSkill: skillName,
      });
    }
  }
}

console.log(`Testing ${positivePrompts.length} should-trigger prompts for collisions...\n`);

// Track collisions
const collisionPairs = {};  // "skillA|skillB" -> count
const collisionDetails = []; // Full detail for verbose mode
let totalCollisions = 0;
let totalTests = 0;

for (const { prompt, expectedSkill } of positivePrompts) {
  totalTests++;
  const hookOutput = runHook(prompt);
  const { skills, workflow } = extractMatchedSkills(hookOutput);

  // Combine all matched: workflow + skills
  const allMatched = [...skills];
  if (workflow && !allMatched.includes(workflow)) {
    allMatched.unshift(workflow);
  }

  // A collision = more than 1 skill matched
  if (allMatched.length > 1) {
    totalCollisions++;

    // Record all pairs
    for (let i = 0; i < allMatched.length; i++) {
      for (let j = i + 1; j < allMatched.length; j++) {
        const pair = [allMatched[i], allMatched[j]].sort().join(' | ');
        collisionPairs[pair] = (collisionPairs[pair] || 0) + 1;
      }
    }

    if (verbose) {
      console.log(`  COLLISION: "${prompt.slice(0, 60)}"`);
      console.log(`    Expected: ${expectedSkill}`);
      console.log(`    Got: [${allMatched.join(', ')}]`);
      console.log();
    }

    collisionDetails.push({
      prompt: prompt.slice(0, 80),
      expected: expectedSkill,
      matched: allMatched,
    });
  }
}

// Sort collision pairs by frequency
const sortedPairs = Object.entries(collisionPairs)
  .sort(([, a], [, b]) => b - a);

console.log('=' .repeat(60));
console.log('COLLISION ANALYSIS');
console.log('=' .repeat(60));
console.log(`\nTotal prompts tested: ${totalTests}`);
console.log(`Prompts with collisions: ${totalCollisions} (${(totalCollisions/totalTests*100).toFixed(1)}%)`);
console.log(`Unique collision pairs: ${sortedPairs.length}`);

console.log('\n--- Collision Pairs (by frequency) ---\n');

for (const [pair, count] of sortedPairs) {
  console.log(`  ${pair}: ${count} occurrence(s)`);
}

// Categorize collisions
console.log('\n--- Expected vs Unexpected Collisions ---\n');

const expectedCollisions = new Set([
  // Same-domain collisions (semantically correct co-activation)
  // Debug domain
  'debug | debug-agent',
  'debug | fix',
  'debug | systematic-debugging',
  'debug-agent | fix',
  'debug-agent | systematic-debugging',
  'fix | systematic-debugging',
  // Search domain
  'code-review | github-search',
  'github-search | morph-search',
  'github-search | scout',
  'morph-search | scout',
  'morph-search | search-router',
  'scout | search-router',
  // Planning domain
  'plan-agent | plan-mode',
  'plan-agent | workflow-router',
  'plan-mode | workflow-router',
  'implement_plan | plan-agent',
  'implement_plan | plan-mode',
  // Git/PR domain
  'code-review | describe_pr',
  'code-review | review',
  'commit | describe_pr',
  'commit | git-commits',
  'describe_pr | review',
  // Memory domain
  'memory | recall',
  'memory | remember',
  'recall | remember',
  // Refactoring domain
  'ast-grep-find | phoenix',
  'ast-grep-find | refactor',
  'phoenix | refactor',
  // Build domain
  'build | implement_plan',
  'build | implement_task',
  'implement_plan | implement_task',
  // Onboarding domain
  'onboard | pathfinder',
  'onboard | plan-agent',
]);

const expected = [];
const unexpected = [];

for (const [pair, count] of sortedPairs) {
  if (expectedCollisions.has(pair)) {
    expected.push({ pair, count });
  } else {
    unexpected.push({ pair, count });
  }
}

if (expected.length > 0) {
  console.log('Expected (known, acceptable):');
  for (const { pair, count } of expected) {
    console.log(`  [OK] ${pair}: ${count}`);
  }
}

if (unexpected.length > 0) {
  console.log('\nUnexpected (investigate):');
  for (const { pair, count } of unexpected) {
    console.log(`  [!!] ${pair}: ${count}`);
  }
} else {
  console.log('\nNo unexpected collisions found.');
}

// Save results
const outputPath = path.join(EVAL_DIR, 'collision-results.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalPrompts: totalTests,
    promptsWithCollisions: totalCollisions,
    collisionRate: Math.round(totalCollisions / totalTests * 1000) / 10,
    uniquePairs: sortedPairs.length,
  },
  pairs: Object.fromEntries(sortedPairs),
  expectedPairs: expected.map(e => e.pair),
  unexpectedPairs: unexpected.map(u => u.pair),
  details: collisionDetails,
}, null, 2));

console.log(`\nResults saved to: ${outputPath}`);
