# Hook Audit Commands Reference

## Cross-Reference Script (Step 3)

Run this to get unregistered, broken, and stale hooks in one pass.

```bash
node -e "
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/david.hayes/continuous-claude/.claude/hooks/src';
const DIST_DIR = 'C:/Users/david.hayes/.claude/hooks/dist';
const SETTINGS = 'C:/Users/david.hayes/.claude/settings.json';

// 1. Source hooks (exclude shared/, __tests__/)
const srcFiles = fs.readdirSync(SRC_DIR)
  .filter(f => f.endsWith('.ts') && !fs.statSync(path.join(SRC_DIR, f)).isDirectory())
  .map(f => f.replace('.ts', ''));

// 2. Registered hooks
const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
const hooks = settings.hooks || {};
const registeredMap = new Map();

for (const [eventType, entries] of Object.entries(hooks)) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    const matcher = entry.matcher || '(all)';
    const hookList = entry.hooks || [];
    for (const h of hookList) {
      if (h.command) {
        const match = h.command.match(/dist\/([^\.]+)\.mjs/);
        if (match) {
          registeredMap.set(match[1], { eventType, matcher, timeout: h.timeout, command: h.command });
        }
      }
    }
  }
}

const registered = new Set(registeredMap.keys());

// 3. Cross-reference
const unregistered = srcFiles.filter(f => !registered.has(f));
const brokenRegs = [];
const staleBuilds = [];

for (const [name, info] of registeredMap) {
  const distPath = path.join(DIST_DIR, name + '.mjs');
  const srcPath = path.join(SRC_DIR, name + '.ts');

  if (!fs.existsSync(distPath)) {
    brokenRegs.push({ name, issue: 'dist file missing', ...info });
  } else if (fs.existsSync(srcPath)) {
    const srcMtime = fs.statSync(srcPath).mtimeMs;
    const distMtime = fs.statSync(distPath).mtimeMs;
    if (srcMtime > distMtime) {
      staleBuilds.push({ name, srcAge: new Date(srcMtime).toISOString(), distAge: new Date(distMtime).toISOString() });
    }
  }
}

// Output
console.log('=== UNREGISTERED HOOKS (' + unregistered.length + ') ===');
unregistered.forEach(h => console.log('  ' + h));

console.log('');
console.log('=== BROKEN REGISTRATIONS (' + brokenRegs.length + ') ===');
brokenRegs.forEach(b => console.log('  ' + b.name + ' -- ' + b.issue + ' (registered in ' + b.eventType + ':' + b.matcher + ')'));

console.log('');
console.log('=== STALE BUILDS (' + staleBuilds.length + ') ===');
staleBuilds.forEach(s => console.log('  ' + s.name + ' -- src: ' + s.srcAge + ', dist: ' + s.distAge));

console.log('');
console.log('=== REGISTERED OK (' + (registered.size - brokenRegs.length) + ') ===');
"
```

---

## Batch Classification Script (Step 4)

Classifies all unregistered hooks by event type, matcher, and readiness.

```bash
node -e "
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/david.hayes/continuous-claude/.claude/hooks/src';
const SETTINGS = 'C:/Users/david.hayes/.claude/settings.json';

// Get registered set
const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
const registered = new Set();
for (const [eventType, entries] of Object.entries(settings.hooks || {})) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    for (const h of (entry.hooks || [])) {
      if (h.command) {
        const match = h.command.match(/dist\/([^\.]+)\.mjs/);
        if (match) registered.add(match[1]);
      }
    }
  }
}

// Get unregistered source hooks
const srcFiles = fs.readdirSync(SRC_DIR)
  .filter(f => f.endsWith('.ts') && !fs.statSync(path.join(SRC_DIR, f)).isDirectory())
  .map(f => f.replace('.ts', ''))
  .filter(f => !registered.has(f));

console.log('| Hook | Event Type | Matcher | Lines | Classification |');
console.log('|------|-----------|---------|-------|----------------|');

for (const hookName of srcFiles.sort()) {
  const src = fs.readFileSync(path.join(SRC_DIR, hookName + '.ts'), 'utf8');
  const header = src.split('\n').slice(0, 20).join(' ');

  let eventType = 'UNKNOWN';
  if (src.includes('permissionDecision')) eventType = 'PreToolUse';
  else if (/PreToolUse/i.test(header)) eventType = 'PreToolUse';
  else if (src.includes('hookEventName') || /PostToolUse/i.test(header)) eventType = 'PostToolUse';
  else if (/SessionStart/i.test(header)) eventType = 'SessionStart';
  else if (/SessionEnd/i.test(header)) eventType = 'SessionEnd';
  else if (/UserPromptSubmit/i.test(header)) eventType = 'UserPromptSubmit';
  else if (/PreCompact/i.test(header)) eventType = 'PreCompact';

  let matcher = '(all)';
  const toolMatch = src.match(/tool_name\s*===?\s*['\"](\w+)['\"]|tool\s*===?\s*['\"](\w+)['\"]/g);
  if (toolMatch) {
    const tools = toolMatch.map(m => m.match(/['\"](\w+)['\"]/)[1]);
    matcher = [...new Set(tools)].join('|');
  }
  const headerMatcher = src.match(/(?:PreToolUse|PostToolUse)\s*[:(-]\s*([\w|]+)/);
  if (headerMatcher && matcher === '(all)') matcher = headerMatcher[1];

  const lines = src.split('\n').length;
  const classification = lines > 30 ? 'Ready to wire' : 'Archive candidate';

  console.log('| ' + hookName + ' | ' + eventType + ' | ' + matcher + ' | ' + lines + ' | ' + classification + ' |');
}
"
```

---

## Registration Generator (Step 5)

Generates settings.json entries for all ready-to-wire hooks.

```bash
node -e "
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/david.hayes/continuous-claude/.claude/hooks/src';
const SETTINGS = 'C:/Users/david.hayes/.claude/settings.json';
const DIST_PREFIX = 'C:/Users/david.hayes/.claude/hooks/dist';

// Build registered set
const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
const registered = new Set();
for (const [eventType, entries] of Object.entries(settings.hooks || {})) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    for (const h of (entry.hooks || [])) {
      if (h.command) {
        const match = h.command.match(/dist\/([^\.]+)\.mjs/);
        if (match) registered.add(match[1]);
      }
    }
  }
}

// Timeout defaults
const timeouts = {
  PreToolUse: 5000, PostToolUse: 5000,
  SessionStart: 10000, SessionEnd: 10000,
  UserPromptSubmit: 5000, PreCompact: 15000
};

// Get unregistered source hooks
const srcFiles = fs.readdirSync(SRC_DIR)
  .filter(f => f.endsWith('.ts') && !fs.statSync(path.join(SRC_DIR, f)).isDirectory())
  .map(f => f.replace('.ts', ''))
  .filter(f => !registered.has(f));

const suggestions = {};

for (const hookName of srcFiles.sort()) {
  const src = fs.readFileSync(path.join(SRC_DIR, hookName + '.ts'), 'utf8');
  const header = src.split('\n').slice(0, 20).join(' ');
  const lines = src.split('\n').length;
  if (lines <= 30) continue;

  let eventType = 'UNKNOWN';
  if (src.includes('permissionDecision')) eventType = 'PreToolUse';
  else if (/PreToolUse/i.test(header)) eventType = 'PreToolUse';
  else if (src.includes('hookEventName') || /PostToolUse/i.test(header)) eventType = 'PostToolUse';
  else if (/SessionStart/i.test(header)) eventType = 'SessionStart';
  else if (/SessionEnd/i.test(header)) eventType = 'SessionEnd';
  else if (/UserPromptSubmit/i.test(header)) eventType = 'UserPromptSubmit';
  else if (/PreCompact/i.test(header)) eventType = 'PreCompact';

  if (eventType === 'UNKNOWN') continue;

  let matcher = null;
  const toolMatch = src.match(/tool_name\s*===?\s*['\"](\w+)['\"]|tool\s*===?\s*['\"](\w+)['\"]/g);
  if (toolMatch) {
    const tools = toolMatch.map(m => m.match(/['\"](\w+)['\"]/)[1]);
    matcher = [...new Set(tools)].join('|');
  }
  const headerMatcher = src.match(/(?:PreToolUse|PostToolUse)\s*[:(-]\s*([\w|]+)/);
  if (headerMatcher && !matcher) matcher = headerMatcher[1];

  if (!suggestions[eventType]) suggestions[eventType] = [];
  const entry = {
    type: 'command',
    command: 'node ' + DIST_PREFIX + '/' + hookName + '.mjs',
    timeout: timeouts[eventType] || 5000
  };

  suggestions[eventType].push({ hookName, matcher, entry });
}

// Output
console.log('// === Suggested settings.json additions ===');
for (const [eventType, hooks] of Object.entries(suggestions)) {
  console.log('');
  console.log('// --- ' + eventType + ' ---');
  for (const { hookName, matcher, entry } of hooks) {
    const registration = matcher
      ? { matcher, hooks: [entry] }
      : { hooks: [entry] };
    console.log('// ' + hookName);
    console.log(JSON.stringify(registration, null, 2));
  }
}
"
```

---

## Orphan Detection (Step 6)

Find registrations pointing to hooks with no source file.

```bash
node -e "
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/david.hayes/continuous-claude/.claude/hooks/src';
const SETTINGS = 'C:/Users/david.hayes/.claude/settings.json';

const srcFiles = new Set(
  fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => f.replace('.ts', ''))
);

const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));

console.log('=== Registrations with no source file ===');
let count = 0;
for (const [eventType, entries] of Object.entries(settings.hooks || {})) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    for (const h of (entry.hooks || [])) {
      if (h.command) {
        const match = h.command.match(/dist\/([^\.]+)\.mjs/);
        if (match && !srcFiles.has(match[1])) {
          if (h.command.includes('.py')) continue;
          console.log('  ' + match[1] + ' (' + eventType + ':' + (entry.matcher || 'all') + ')');
          count++;
        }
      }
    }
  }
}
if (count === 0) console.log('  (none found)');
"
```
