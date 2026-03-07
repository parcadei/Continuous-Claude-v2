#!/usr/bin/env node
/**
 * Phase 5: Hook-Based Skill Trigger Evaluation Harness
 *
 * Tests the ACTUAL CCv3 trigger pipeline (skill-activation-prompt.ts hook)
 * by feeding prompts via stdin and parsing which skills match.
 *
 * Usage:
 *   node eval-harness.js                    # Run all eval sets
 *   node eval-harness.js --skill fix        # Run single skill eval
 *   node eval-harness.js --generate         # Generate eval sets only
 *   node eval-harness.js --report           # Show summary report
 *   node eval-harness.js --verbose          # Show each test case result
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// === Configuration ===
const SKILLS_DIR = 'C:/Users/david.hayes/.claude/skills';
const HOOK_PATH = 'C:/Users/david.hayes/.claude/hooks/dist/skill-activation-prompt.mjs';
const RULES_PATH = path.join(SKILLS_DIR, 'skill-rules.json');
const EVAL_DIR = path.join(SKILLS_DIR, '_eval');
const RESULTS_PATH = path.join(EVAL_DIR, 'eval-results.json');
const CWD = 'C:/Users/david.hayes/continuous-claude';

// === Helpers ===

/**
 * Run a prompt through the hook and return parsed output.
 */
function runHook(prompt) {
  const input = JSON.stringify({
    session_id: 'eval-harness',
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

  if (result.status !== 0 && result.status !== null) {
    return { error: true, stderr: result.stderr, status: result.status };
  }

  try {
    const output = JSON.parse(result.stdout.trim());
    return output;
  } catch {
    return { error: true, raw: result.stdout, stderr: result.stderr };
  }
}

/**
 * Extract matched skill names from hook output message.
 */
function extractMatchedSkills(hookOutput) {
  if (!hookOutput || hookOutput.error) return { skills: [], workflow: null, raw: hookOutput };

  const message = hookOutput.message || hookOutput.reason || '';
  const skills = [];
  let workflow = null;

  // Extract workflow trigger: "WORKFLOW DETECTED: /skillname"
  const workflowMatch = message.match(/WORKFLOW DETECTED:\s*\/(\S+)/);
  if (workflowMatch) {
    workflow = workflowMatch[1];
  }

  // Extract skill matches: lines starting with "  -> skillname" or unicode arrow
  const skillPattern = /^\s+(?:\u2192|->|→)+\s+(\S+)/gm;
  let m;
  while ((m = skillPattern.exec(message)) !== null) {
    if (!skills.includes(m[1])) {
      skills.push(m[1]);
    }
  }

  // Extract blocking skills: "BLOCKING: You MUST invoke X, Y"
  const blockMatch = message.match(/BLOCKING:.*?invoke\s+(.+?)\s+skill/);
  if (blockMatch) {
    blockMatch[1].split(/,\s*/).forEach(s => {
      const name = s.trim();
      if (name && !skills.includes(name)) skills.push(name);
    });
  }

  // Extract ambiguous matches: "* skillname" or bullet
  const ambigPattern = /^\s+(?:\u2022|\*)\s+(\S+)/gm;
  while ((m = ambigPattern.exec(message)) !== null) {
    if (!skills.includes(m[1])) {
      skills.push(m[1]);
    }
  }

  return { skills, workflow, raw: message };
}

/**
 * Run a single eval case and return result.
 */
function runEvalCase(testCase) {
  const hookOutput = runHook(testCase.prompt);
  const { skills, workflow } = extractMatchedSkills(hookOutput);

  const expectedSkill = testCase.expectedSkill;
  const shouldTrigger = testCase.shouldTrigger;

  let pass;
  if (shouldTrigger) {
    // Should trigger: skill appears in skills list OR as workflow
    pass = skills.includes(expectedSkill) || workflow === expectedSkill;
  } else {
    // Should NOT trigger: skill should NOT appear
    pass = !skills.includes(expectedSkill) && workflow !== expectedSkill;
  }

  return {
    prompt: testCase.prompt,
    expectedSkill,
    shouldTrigger,
    pass,
    matchedSkills: skills,
    matchedWorkflow: workflow,
  };
}

// === Eval Set Generation ===

/**
 * Load skill-rules.json and generate eval sets for all skills with triggers.
 */
function generateEvalSets() {
  const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf-8'));
  const generated = {};
  let totalCases = 0;

  for (const [skillName, config] of Object.entries(rules.skills)) {
    const triggers = config.promptTriggers;
    if (!triggers) continue;

    const evalSet = {
      skill: skillName,
      description: config.description || '',
      priority: config.priority || 'medium',
      enforcement: config.enforcement || 'suggest',
      cases: [],
    };

    // Generate SHOULD-TRIGGER cases from keywords
    if (triggers.keywords) {
      for (const kw of triggers.keywords.slice(0, 5)) { // Cap at 5 keyword-based
        evalSet.cases.push({
          prompt: generatePromptFromKeyword(kw, skillName),
          expectedSkill: skillName,
          shouldTrigger: true,
          source: 'keyword',
          matchedTerm: kw,
        });
      }
    }

    // Generate SHOULD-TRIGGER cases from intent patterns
    if (triggers.intentPatterns) {
      for (const pattern of triggers.intentPatterns.slice(0, 3)) { // Cap at 3 intent-based
        const prompt = generatePromptFromPattern(pattern, skillName);
        if (prompt) {
          evalSet.cases.push({
            prompt,
            expectedSkill: skillName,
            shouldTrigger: true,
            source: 'intent',
            pattern,
          });
        }
      }
    }

    // Generate SHOULD-NOT-TRIGGER cases (negatives)
    const negatives = generateNegativeCases(skillName, config, rules);
    evalSet.cases.push(...negatives);

    // Ensure at least 5 should-trigger and 5 should-not
    const positives = evalSet.cases.filter(c => c.shouldTrigger).length;
    const negs = evalSet.cases.filter(c => !c.shouldTrigger).length;

    if (positives < 5) {
      // Add more natural language positives
      const extras = generateNaturalPositives(skillName, config);
      evalSet.cases.push(...extras.slice(0, 5 - positives));
    }

    if (negs < 5) {
      // Add more generic negatives
      const extras = generateGenericNegatives(skillName);
      evalSet.cases.push(...extras.slice(0, 5 - negs));
    }

    generated[skillName] = evalSet;
    totalCases += evalSet.cases.length;
  }

  // Save eval sets
  const outputPath = path.join(EVAL_DIR, 'eval-sets.json');
  fs.writeFileSync(outputPath, JSON.stringify(generated, null, 2));
  console.log(`Generated eval sets for ${Object.keys(generated).length} skills (${totalCases} total cases)`);
  console.log(`Saved to: ${outputPath}`);
  return generated;
}

/**
 * Generate a natural prompt that contains a keyword.
 */
function generatePromptFromKeyword(keyword, skillName) {
  // Wrap keyword in a realistic prompt context
  const templates = [
    `I need to ${keyword}`,
    `Can you help me ${keyword}?`,
    `Let's ${keyword} for this project`,
    `Please ${keyword}`,
    `I want to ${keyword} now`,
  ];

  // If keyword starts with / it's a slash command
  if (keyword.startsWith('/')) {
    return keyword;
  }

  // If keyword is a phrase, use it more directly
  if (keyword.includes(' ')) {
    return templates[Math.floor(Math.random() * templates.length)].replace(keyword, keyword);
  }

  return `I need to ${keyword} for the current project`;
}

/**
 * Generate a prompt that should match an intent pattern.
 */
function generatePromptFromPattern(pattern, skillName) {
  // Convert regex pattern to a plausible prompt by extracting key words
  // Remove regex syntax, keep the meaningful words
  const cleaned = pattern
    .replace(/\(\?:.*?\)/g, '')  // Remove non-capturing groups content
    .replace(/\(([^|)]+)\|[^)]+\)/g, '$1')  // Pick first alternative from groups
    .replace(/\(([^)]+)\)/g, '$1')  // Remove remaining parens
    .replace(/\\[bBdDwWsS]/g, ' ')  // Remove char classes
    .replace(/[.*+?{}[\]\\^$|]/g, ' ')  // Remove remaining regex chars
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 3) return null;

  return `I want to ${cleaned} in this project`;
}

/**
 * Generate negative cases for a skill — prompts that should NOT trigger it.
 */
function generateNegativeCases(skillName, config, rules) {
  const negatives = [];

  // Cross-domain negatives: use keywords from DIFFERENT skill domains
  const domains = {
    workflow: ['ralph', 'maestro', 'build', 'fix', 'explore', 'refactor'],
    memory: ['recall', 'remember', 'memory', 'knowledge-tree'],
    git: ['commit', 'describe_pr', 'release', 'review', 'git-commits'],
    browser: ['agent-browser', 'claude-in-chrome', 'browser-dev-cycle'],
    search: ['search-router', 'morph-search', 'github-search', 'perplexity-search'],
    presentation: ['fourth-presentation-suite', 'fourth-presentation-builder', 'frontend-slides'],
    testing: ['tdd', 'test', 'full-test-suite'],
    infrastructure: ['hook-developer', 'hooks', 'debug-hooks'],
  };

  // Find which domain this skill belongs to
  let myDomain = null;
  for (const [domain, members] of Object.entries(domains)) {
    if (members.includes(skillName)) {
      myDomain = domain;
      break;
    }
  }

  // Generate negatives from OTHER domains
  const otherDomains = Object.entries(domains).filter(([d]) => d !== myDomain);
  for (const [domain, members] of otherDomains.slice(0, 3)) {
    const otherSkill = members[0];
    const otherConfig = rules.skills[otherSkill];
    if (otherConfig && otherConfig.promptTriggers && otherConfig.promptTriggers.keywords) {
      const otherKeyword = otherConfig.promptTriggers.keywords[0];
      negatives.push({
        prompt: `I need to ${otherKeyword}`,
        expectedSkill: skillName,
        shouldTrigger: false,
        source: 'cross-domain',
        domain: domain,
      });
    }
  }

  // Generic unrelated prompts
  negatives.push({
    prompt: 'What is the weather like today?',
    expectedSkill: skillName,
    shouldTrigger: false,
    source: 'unrelated',
  });

  negatives.push({
    prompt: 'Tell me a joke about programming',
    expectedSkill: skillName,
    shouldTrigger: false,
    source: 'unrelated',
  });

  return negatives;
}

/**
 * Generate natural language positive cases for a skill.
 */
function generateNaturalPositives(skillName, config) {
  const desc = config.description || skillName;
  return [
    {
      prompt: `Help me with ${desc.toLowerCase().split(' ').slice(0, 5).join(' ')}`,
      expectedSkill: skillName,
      shouldTrigger: true,
      source: 'natural',
    },
  ];
}

/**
 * Generate generic negative cases.
 */
function generateGenericNegatives(skillName) {
  const generics = [
    'How do I make pasta?',
    'Explain quantum computing briefly',
    'What time zone is Tokyo in?',
  ];

  return generics.map(prompt => ({
    prompt,
    expectedSkill: skillName,
    shouldTrigger: false,
    source: 'generic-negative',
  }));
}

// === Eval Runner ===

function runEvals(options = {}) {
  const evalSetsPath = path.join(EVAL_DIR, 'eval-sets.json');
  if (!fs.existsSync(evalSetsPath)) {
    console.log('No eval sets found. Generating...');
    generateEvalSets();
  }

  const evalSets = JSON.parse(fs.readFileSync(evalSetsPath, 'utf-8'));
  const targetSkill = options.skill;
  const verbose = options.verbose;

  const allResults = {};
  let totalPass = 0;
  let totalFail = 0;
  let totalCases = 0;

  const skillNames = targetSkill ? [targetSkill] : Object.keys(evalSets);

  console.log(`\nRunning eval for ${skillNames.length} skills...`);
  console.log('=' .repeat(60));

  for (const skillName of skillNames) {
    const evalSet = evalSets[skillName];
    if (!evalSet) {
      console.log(`  SKIP: ${skillName} - no eval set`);
      continue;
    }

    let skillPass = 0;
    let skillFail = 0;
    const caseResults = [];

    for (const testCase of evalSet.cases) {
      const result = runEvalCase(testCase);
      caseResults.push(result);

      if (result.pass) {
        skillPass++;
        totalPass++;
      } else {
        skillFail++;
        totalFail++;
      }
      totalCases++;

      if (verbose && !result.pass) {
        const expected = result.shouldTrigger ? 'SHOULD trigger' : 'should NOT trigger';
        const actual = result.matchedSkills.join(', ') || (result.matchedWorkflow || 'none');
        console.log(`  FAIL: "${result.prompt.slice(0, 60)}..."`);
        console.log(`         Expected: ${expected} ${result.expectedSkill}`);
        console.log(`         Got: [${actual}]`);
      }
    }

    const accuracy = evalSet.cases.length > 0 ? (skillPass / evalSet.cases.length * 100) : 0;
    const tier = accuracy >= 90 ? 'verified' : accuracy >= 70 ? 'vetted' : 'needs-optimization';
    const icon = tier === 'verified' ? 'PASS' : tier === 'vetted' ? 'WARN' : 'FAIL';

    allResults[skillName] = {
      accuracy: Math.round(accuracy * 10) / 10,
      tier,
      pass: skillPass,
      fail: skillFail,
      total: evalSet.cases.length,
      priority: evalSet.priority,
      enforcement: evalSet.enforcement,
      failures: caseResults.filter(r => !r.pass),
    };

    const status = `[${icon}]`;
    console.log(`  ${status} ${skillName}: ${accuracy.toFixed(1)}% (${skillPass}/${evalSet.cases.length}) - ${tier}`);
  }

  console.log('=' .repeat(60));
  console.log(`\nTOTAL: ${totalPass}/${totalCases} pass (${(totalPass/totalCases*100).toFixed(1)}%)`);
  console.log(`  Pass: ${totalPass}  Fail: ${totalFail}`);

  // Tier summary
  const verified = Object.values(allResults).filter(r => r.tier === 'verified').length;
  const vetted = Object.values(allResults).filter(r => r.tier === 'vetted').length;
  const needsOpt = Object.values(allResults).filter(r => r.tier === 'needs-optimization').length;

  console.log(`\nTier breakdown:`);
  console.log(`  verified (>=90%): ${verified}`);
  console.log(`  vetted (>=70%):   ${vetted}`);
  console.log(`  needs-opt (<70%): ${needsOpt}`);

  // Save results
  fs.writeFileSync(RESULTS_PATH, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalSkills: Object.keys(allResults).length,
      totalCases,
      totalPass,
      totalFail,
      overallAccuracy: Math.round(totalPass / totalCases * 1000) / 10,
      tiers: { verified, vetted, 'needs-optimization': needsOpt },
    },
    results: allResults,
  }, null, 2));

  console.log(`\nResults saved to: ${RESULTS_PATH}`);
  return allResults;
}

// === Report ===

function showReport() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.log('No results found. Run eval first.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf-8'));
  console.log(`\nEval Report (${data.timestamp})`);
  console.log('=' .repeat(60));
  console.log(`Skills: ${data.summary.totalSkills}  Cases: ${data.summary.totalCases}`);
  console.log(`Overall: ${data.summary.overallAccuracy}%`);
  console.log(`Tiers: verified=${data.summary.tiers.verified}  vetted=${data.summary.tiers.vetted}  needs-opt=${data.summary.tiers['needs-optimization']}`);

  // Show failures
  console.log('\n--- Skills needing optimization ---');
  const needsOpt = Object.entries(data.results)
    .filter(([, r]) => r.tier === 'needs-optimization')
    .sort(([, a], [, b]) => a.accuracy - b.accuracy);

  for (const [name, result] of needsOpt) {
    console.log(`  ${name}: ${result.accuracy}% (${result.fail} failures)`);
    for (const f of result.failures.slice(0, 3)) {
      const type = f.shouldTrigger ? 'FALSE-NEG' : 'FALSE-POS';
      console.log(`    ${type}: "${f.prompt.slice(0, 50)}..." -> [${f.matchedSkills.join(', ')}]`);
    }
  }

  // Show vetted (need improvement)
  console.log('\n--- Skills at vetted tier ---');
  const vettedSkills = Object.entries(data.results)
    .filter(([, r]) => r.tier === 'vetted')
    .sort(([, a], [, b]) => a.accuracy - b.accuracy);

  for (const [name, result] of vettedSkills) {
    console.log(`  ${name}: ${result.accuracy}% (${result.fail} failures)`);
  }
}

// === CLI ===

const args = process.argv.slice(2);

if (args.includes('--generate')) {
  generateEvalSets();
} else if (args.includes('--report')) {
  showReport();
} else {
  const skillIdx = args.indexOf('--skill');
  const skill = skillIdx !== -1 ? args[skillIdx + 1] : null;
  const verbose = args.includes('--verbose');

  // Generate if needed, then run
  const evalSetsPath = path.join(EVAL_DIR, 'eval-sets.json');
  if (!fs.existsSync(evalSetsPath)) {
    generateEvalSets();
  }
  runEvals({ skill, verbose });
}
