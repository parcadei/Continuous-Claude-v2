#!/usr/bin/env node
/**
 * Merge eval results into _eval-progress.json and skill-rules.json
 */
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = 'C:/Users/david.hayes/.claude/skills';
const PROGRESS_PATH = path.join(SKILLS_DIR, '_eval-progress.json');
const RESULTS_PATH = path.join(SKILLS_DIR, '_eval', 'eval-results.json');
const RULES_PATH = path.join(SKILLS_DIR, 'skill-rules.json');

// Load files
const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));

// 1. Update progress tracker with eval results
let updated = 0;
for (const [skillName, result] of Object.entries(results.results)) {
  // Map skill names: some eval results use paths like "math/abstract-algebra"
  // but progress tracker uses flat names
  const progressKey = skillName.replace('/', '-');

  if (progress.skills[progressKey]) {
    progress.skills[progressKey].trigger_accuracy = result.accuracy;
    progress.skills[progressKey].eval_tier = result.tier;
    progress.skills[progressKey].phase = 'evaluated';
    updated++;
  } else if (progress.skills[skillName]) {
    progress.skills[skillName].trigger_accuracy = result.accuracy;
    progress.skills[skillName].eval_tier = result.tier;
    progress.skills[skillName].phase = 'evaluated';
    updated++;
  } else {
    // Skill exists in rules but not in progress (e.g., arscontexta-* plugins)
    progress.skills[skillName] = {
      phase: 'evaluated',
      structural: 'pass',
      trigger_accuracy: result.accuracy,
      eval_tier: result.tier,
      notes: 'added during phase 5 eval'
    };
    updated++;
  }
}

// Add phase-5 to completed phases
if (!progress.phases_completed.includes('phase-5-trigger-evaluation')) {
  progress.phases_completed.push('phase-5-trigger-evaluation');
}

fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
console.log(`Updated ${updated} skills in _eval-progress.json`);

// 2. Add eval metadata to skill-rules.json
let rulesUpdated = 0;
for (const [skillName, result] of Object.entries(results.results)) {
  // Check skills section
  if (rules.skills[skillName]) {
    rules.skills[skillName].evalScore = result.accuracy;
    rules.skills[skillName].evalTier = result.tier;
    rules.skills[skillName].evalDate = results.timestamp.split('T')[0];
    rulesUpdated++;
  }
  // Check agents section
  if (rules.agents && rules.agents[skillName]) {
    rules.agents[skillName].evalScore = result.accuracy;
    rules.agents[skillName].evalTier = result.tier;
    rules.agents[skillName].evalDate = results.timestamp.split('T')[0];
    rulesUpdated++;
  }
}

fs.writeFileSync(RULES_PATH, JSON.stringify(rules, null, 2));
console.log(`Updated ${rulesUpdated} entries in skill-rules.json`);

// 3. Summary
console.log('\nPhase 5 Summary:');
console.log(`  Total evaluated: ${Object.keys(results.results).length}`);
console.log(`  Overall accuracy: ${results.summary.overallAccuracy}%`);
console.log(`  Verified: ${results.summary.tiers.verified}`);
console.log(`  Vetted: ${results.summary.tiers.vetted}`);
console.log(`  Needs optimization: ${results.summary.tiers['needs-optimization']}`);
