const fs = require('fs');
const r = JSON.parse(fs.readFileSync('C:/Users/david.hayes/.claude/skills/skill-rules.json','utf8'));
const skills = Object.keys(r.skills);
const agents = r.agents ? Object.keys(r.agents) : [];
console.log('Skills:', skills.length);
console.log('Agents:', agents.length);

const withKw = skills.filter(s => {
  const t = r.skills[s].promptTriggers;
  return t && t.keywords && t.keywords.length > 0;
});
console.log('Skills with keywords:', withKw.length);

const withIntent = skills.filter(s => {
  const t = r.skills[s].promptTriggers;
  return t && t.intentPatterns && t.intentPatterns.length > 0;
});
console.log('Skills with intents:', withIntent.length);

const noTrigger = skills.filter(s => {
  const t = r.skills[s].promptTriggers;
  if (!t) return true;
  const hasKw = t.keywords && t.keywords.length > 0;
  const hasIntent = t.intentPatterns && t.intentPatterns.length > 0;
  return !hasKw && !hasIntent;
});
console.log('Skills with NO triggers:', noTrigger.length);
if (noTrigger.length > 0) console.log('  ->', noTrigger.join(', '));

// List enforcement types
const byEnforcement = {};
skills.forEach(s => {
  const e = r.skills[s].enforcement || 'none';
  if (!byEnforcement[e]) byEnforcement[e] = [];
  byEnforcement[e].push(s);
});
console.log('\nBy enforcement:');
Object.entries(byEnforcement).forEach(([e, list]) => {
  console.log(`  ${e}: ${list.length}`);
});

// List priority types
const byPriority = {};
skills.forEach(s => {
  const p = r.skills[s].priority || 'none';
  if (!byPriority[p]) byPriority[p] = [];
  byPriority[p].push(s);
});
console.log('\nBy priority:');
Object.entries(byPriority).forEach(([p, list]) => {
  console.log(`  ${p}: ${list.length}`);
});

// Count user-invocable (type === 'workflow' or 'skill' with triggers)
const userInvocable = skills.filter(s => {
  const sk = r.skills[s];
  const t = sk.promptTriggers;
  const hasAnyTrigger = t && ((t.keywords && t.keywords.length > 0) || (t.intentPatterns && t.intentPatterns.length > 0));
  return hasAnyTrigger;
});
console.log('\nUser-invocable skills (have triggers):', userInvocable.length);
console.log('Internal skills (no triggers):', noTrigger.length);
