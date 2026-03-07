const fs = require('fs');
const raw = fs.readFileSync(process.argv[2], 'utf8');

const blocks = raw.split('---').filter(b => b.includes('==='));
const results = {};

for (const block of blocks) {
  const nameMatch = block.match(/=== (.+?) ===/);
  if (!nameMatch) continue;
  const name = nameMatch[1];

  const exitMatch = block.match(/EXIT:(\d+)/);
  const exitCode = exitMatch ? parseInt(exitMatch[1]) : -1;

  const errorMatch = block.match(/(\d+) errors?:/);
  const warnMatch = block.match(/(\d+) warnings?:/);
  const passMatch = block.match(/(\d+) checks? passed/);

  const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
  const warnings = warnMatch ? parseInt(warnMatch[1]) : 0;
  const passed = passMatch ? parseInt(passMatch[1]) : 0;

  const errorMsgs = [];
  const lines = block.split('\n');
  let inErrors = false;
  for (const line of lines) {
    if (line.includes('errors:')) inErrors = true;
    else if (line.includes('warnings:') || line.includes('checks passed') || line.trim() === '') inErrors = false;
    if (inErrors && line.trim().startsWith('-')) errorMsgs.push(line.trim().slice(2));
  }

  let structural;
  if (errors === 0 && warnings === 0) structural = 'pass';
  else if (errors === 0) structural = 'warn';
  else structural = 'fail';

  results[name] = { structural, errors, warnings, passed, errorMsgs, exitCode };
}

const tracker = JSON.parse(fs.readFileSync('C:/Users/david.hayes/.claude/skills/_eval-progress.json', 'utf8'));
let passCount = 0, warnCount = 0, failCount = 0;

for (const [name, r] of Object.entries(results)) {
  if (tracker.skills[name]) {
    tracker.skills[name].structural = r.structural;
    tracker.skills[name].phase = 'validated';
    tracker.skills[name].notes = r.errorMsgs.length > 0 ? r.errorMsgs.join('; ') : '';
  }
  if (r.structural === 'pass') passCount++;
  else if (r.structural === 'warn') warnCount++;
  else failCount++;
}

tracker.phases_completed.push('phase-1-structural-validation');
fs.writeFileSync('C:/Users/david.hayes/.claude/skills/_eval-progress.json', JSON.stringify(tracker, null, 2));

console.log('=== STRUCTURAL VALIDATION SUMMARY ===');
console.log('PASS (no errors, no warnings): ' + passCount);
console.log('WARN (warnings only):          ' + warnCount);
console.log('FAIL (has errors):             ' + failCount);
console.log('Total:                         ' + (passCount + warnCount + failCount));

console.log('\n--- FAIL SKILLS (by error type) ---');
const byError = {};
for (const [name, r] of Object.entries(results)) {
  if (r.structural === 'fail') {
    for (const msg of r.errorMsgs) {
      const key = msg.length > 60 ? msg.slice(0, 60) + '...' : msg;
      if (!byError[key]) byError[key] = [];
      byError[key].push(name);
    }
  }
}
for (const [error, skills] of Object.entries(byError)) {
  console.log('\n' + error);
  for (const s of skills) console.log('  - ' + s);
}

console.log('\n--- WARN-ONLY SKILLS ---');
for (const [name, r] of Object.entries(results)) {
  if (r.structural === 'warn') console.log('  ' + name + ' (' + r.warnings + ' warnings)');
}

console.log('\n--- CLEAN PASS ---');
for (const [name, r] of Object.entries(results)) {
  if (r.structural === 'pass') console.log('  ' + name);
}
