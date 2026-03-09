---
name: hook-scaffold
description: Scaffolds new Claude Code hooks end-to-end from templates -- generates TypeScript source, registers in settings.json, builds, and verifies
metadata:
  user_invocable: true
  keywords: [hook, scaffold, create hook, new hook, hook scaffold, generate hook]
---

# Hook Scaffold

End-to-end scaffolding for new Claude Code hooks. Generates TypeScript source from template, registers in settings.json, builds, and verifies.

## Invocation

```
/skill:hook-scaffold
"new hook", "scaffold hook", "create hook"
```

## Templates Reference

@references/hook-templates.md

---

## Workflow

### Step 1: Gather Information

Use conversation to collect these required inputs (ask if not provided):

| Input | Format | Example |
|-------|--------|---------|
| Hook name | kebab-case | `my-new-hook` |
| Event type | One of 5 types | `PreToolUse` |
| Tool pattern | Pipe-separated tools or `*` | `Edit\|Write` |
| Description | Brief purpose | "Blocks edits to locked files" |

**Event types:** `PreToolUse`, `PostToolUse`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`

**Tool pattern** only applies to PreToolUse and PostToolUse. For others, leave blank.

### Step 2: Generate TypeScript Source

Create the hook source file at:
```
C:/Users/david.hayes/continuous-claude/.claude/hooks/src/<hook-name>.ts
```

**Process:**
1. Select the correct template from `@references/hook-templates.md` based on event type
2. Replace all `{{HOOK_NAME}}` placeholders with the hook name
3. Replace `{{TOOL_PATTERN}}` with the tool pattern
4. Replace `{{DESCRIPTION}}` with the description
5. Add the user's custom logic in the `CUSTOMIZE` sections
6. Write the file

**Rules:**
- Do NOT add `#!/usr/bin/env node` shebang -- esbuild handles execution via `node dist/<name>.mjs`
- DO include proper TypeScript types for input/output
- DO include try/catch with fail-open behavior (output `{}` on error)
- DO log errors to stderr only (`console.error`), never stdout
- DO use `console.log(JSON.stringify(...))` for all stdout output

### Step 3: Register in settings.json

**CRITICAL: Never use the Edit tool on settings.json** -- Claude Code writes to it continuously. Use Node.js atomic read-modify-write.

Determine the correct registration based on event type:

**PreToolUse / PostToolUse with specific tools:**
```json
{
  "matcher": "<TOOL_PATTERN>",
  "hooks": [{
    "type": "command",
    "command": "node C:/Users/david.hayes/.claude/hooks/dist/<hook-name>.mjs",
    "timeout": 5000
  }]
}
```

**PreToolUse / PostToolUse for all tools (no matcher):**
```json
{
  "hooks": [{
    "type": "command",
    "command": "node C:/Users/david.hayes/.claude/hooks/dist/<hook-name>.mjs",
    "timeout": 5000
  }]
}
```

**SessionStart / SessionEnd / UserPromptSubmit:**
Add to the existing hooks array for that event type (these have no matcher).

**Registration command:**
```bash
node -e "
const fs = require('fs');
const settingsPath = 'C:/Users/david.hayes/.claude/settings.json';
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

const eventType = '<EVENT_TYPE>';
const hookEntry = {
  type: 'command',
  command: 'node C:/Users/david.hayes/.claude/hooks/dist/<hook-name>.mjs',
  timeout: 5000
};

// For PreToolUse/PostToolUse with a matcher
const matcher = '<TOOL_PATTERN>';
if (matcher && matcher !== '*') {
  // Add as new matcher group
  settings.hooks[eventType].push({
    matcher: matcher,
    hooks: [hookEntry]
  });
} else if (eventType === 'PreToolUse' || eventType === 'PostToolUse') {
  // No matcher -- add to the catch-all group (first entry without matcher)
  const catchAll = settings.hooks[eventType].find(g => !g.matcher);
  if (catchAll) {
    catchAll.hooks.push(hookEntry);
  } else {
    settings.hooks[eventType].push({ hooks: [hookEntry] });
  }
} else {
  // SessionStart/SessionEnd/UserPromptSubmit -- single hooks array
  const group = settings.hooks[eventType];
  if (Array.isArray(group) && group.length > 0 && group[0].hooks) {
    group[0].hooks.push(hookEntry);
  } else {
    settings.hooks[eventType] = [{ hooks: [hookEntry] }];
  }
}

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\\n');
console.log('Registered ' + '<hook-name>' + ' in ' + eventType);
"
```

Adapt the `matcher`, `eventType`, `hook-name`, and `timeout` values for the specific hook.

### Step 4: Build and Verify

```bash
cd C:/Users/david.hayes/continuous-claude/.claude/hooks && npm run build
```

**Verify:**
1. Check that `dist/<hook-name>.mjs` exists
2. Run a quick smoke test: `echo '{}' | node dist/<hook-name>.mjs`
3. Verify it outputs valid JSON (should output `{}` or `{"result":"continue"}`)

**If build fails:**
- Check for TypeScript errors: `cd .claude/hooks && npx tsc --noEmit`
- Fix type issues in the source file
- Rebuild

### Step 5: Report

Confirm to the user:
- Source file created at `.claude/hooks/src/<hook-name>.ts`
- Registered in `~/.claude/settings.json` under `<event-type>`
- Built successfully, `dist/<hook-name>.mjs` exists
- Smoke test passed (outputs valid JSON)

---

## Timeout Selection Guide

| Complexity | Timeout | Examples |
|------------|---------|----------|
| Simple check (string match, regex) | 3000ms | no-haiku-enforcer, explore-to-scout |
| File I/O (read config, check state) | 5000ms | auto-build, plan-exit-tracker |
| Network/DB or subprocess spawn | 10000ms | session-register, heartbeat |
| Heavy I/O or multi-step | 15000ms | session-start-continuity, pre-compact-extract |

---

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| stdout pollution | Only `console.log(JSON.stringify(...))` to stdout. Everything else to stderr. |
| Missing fail-open | Every `catch` block must output valid JSON. Never let exceptions crash without output. |
| Wrong output shape | PreToolUse uses `permissionDecision`. PostToolUse uses `systemPromptSuffix`. SessionStart uses `additionalContext`. |
| Edit tool on settings.json | ALWAYS use Node.js atomic read-modify-write. The Edit tool races with Claude Code. |
| Import path errors | Use `.js` extension for shared imports (esbuild resolves `.ts` to `.js`). |
| Testing shared imports | Shared modules are bundled by esbuild. They work in dist/ but not when running src/ directly. |

---

*Skill for scaffolding Claude Code hooks. Templates in references/hook-templates.md.*
