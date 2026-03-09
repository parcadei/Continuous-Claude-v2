---
name: hook-audit
description: Audit hook registrations -- find unregistered, broken, and stale hooks
---

# Hook Registration Audit

## Activation
- `/skill:hook-audit` explicit
- "hook audit" | "unregistered hooks" | "wire hooks" | "check hooks"
- "missing hook registration" | "hook inventory" | "hook status"

## Iron Law
Every hook with meaningful logic MUST be registered in settings.json to run. Unregistered hooks are dead code.

---

## Paths

| Item | Path |
|------|------|
| Hook source | `C:/Users/david.hayes/continuous-claude/.claude/hooks/src/*.ts` |
| Active settings | `C:/Users/david.hayes/.claude/settings.json` |
| Active dist | `C:/Users/david.hayes/.claude/hooks/dist/*.mjs` |
| Full command scripts | `@references/audit-commands.md` |

**Exclusions** from source inventory (not standalone hooks):
- `shared/` -- utility modules imported by hooks
- `__tests__/` -- test files
- `node_modules/` -- dependencies

---

## Audit Workflow

### Step 1: Source Inventory

List all `.ts` files in hooks source directory (excluding shared/tests).

```bash
ls C:/Users/david.hayes/continuous-claude/.claude/hooks/src/*.ts \
  | xargs -I{} basename {} .ts | sort
```

### Step 2: Registration Inventory

Extract registered hook names from settings.json. See `@references/audit-commands.md` for the full script.

Quick check: Count registered `.mjs` entries in settings.json.

### Step 3: Cross-Reference

Run the cross-reference script from `@references/audit-commands.md` (Cross-Reference Script section). It outputs:

- **UNREGISTERED** -- source exists, no registration
- **BROKEN** -- registration exists, dist file missing
- **STALE** -- source newer than dist (needs rebuild)
- **REGISTERED OK** -- everything matches

### Step 4: Classify Unregistered Hooks

For each unregistered hook, read the source and detect event type/matcher.

#### Detection Heuristics

| Pattern in Source | Event Type | Matcher Detection |
|-------------------|-----------|-------------------|
| `permissionDecision` in output | PreToolUse | Check `tool_name` comparisons |
| `PreToolUseInput` import or comment | PreToolUse | Check comment header |
| `hookEventName` or `PostToolUse` comment | PostToolUse | Check comment header |
| `SessionStartInput` or comment | SessionStart | (none) |
| `SessionEndInput` or comment | SessionEnd | (none) |
| `UserPromptSubmit` in comment/type | UserPromptSubmit | (none) |
| `PreCompact` in comment/type | PreCompact | (none) |

#### Classification

| Condition | Classification |
|-----------|---------------|
| Substantial logic (>30 lines non-boilerplate) | Ready to wire |
| Placeholder/TODO only | Archive candidate |
| Imports shared/ with clear purpose | Ready to wire |
| Experimental/draft naming | Review needed |

Run the batch classification script from `@references/audit-commands.md` for a table of all unregistered hooks.

### Step 5: Generate Registration JSON

For ready-to-wire hooks, generate settings.json entries.

#### Registration Template

```json
{
  "matcher": "<MATCHER>",
  "hooks": [
    {
      "type": "command",
      "command": "node C:/Users/david.hayes/.claude/hooks/dist/<NAME>.mjs",
      "timeout": <TIMEOUT>
    }
  ]
}
```

#### Timeout Defaults

| Event Type | Timeout |
|------------|---------|
| PreToolUse | 5000 |
| PostToolUse | 5000 |
| SessionStart | 10000 |
| SessionEnd | 10000 |
| UserPromptSubmit | 5000 |
| PreCompact | 15000 |

Run the registration generator from `@references/audit-commands.md` for bulk output.

### Step 6: Fix Issues

| Issue | Fix |
|-------|-----|
| Stale/missing dist | `cd C:/Users/david.hayes/continuous-claude/.claude/hooks && npm run build` |
| Orphaned registration | Remove entry from settings.json |
| Renamed hook | Update registration command path |

Run the orphan detection script from `@references/audit-commands.md` to find registrations with no source.

---

## Output Format

Present results as:

```
## Hook Audit Report

### Summary
- Source hooks: N
- Registered hooks: N
- Unregistered: N (X ready to wire, Y archive candidates)
- Broken registrations: N
- Stale builds: N

### Unregistered Hooks
| Hook | Event Type | Matcher | Lines | Action |
|------|-----------|---------|-------|--------|

### Broken Registrations
| Hook | Event Type | Issue | Fix |
|------|-----------|-------|-----|

### Stale Builds
| Hook | Source Modified | Dist Modified |
|------|---------------|--------------|

### Suggested Registrations
[JSON entries for each ready-to-wire hook]
```

---

## Post-Audit Actions

1. **Wire ready hooks** -- Add suggested JSON to settings.json
2. **Rebuild stale** -- `cd ~/.claude/hooks && npm run build`
3. **Archive dead hooks** -- Move to `hooks/src/archive/`
4. **Remove broken** -- Delete orphaned registrations
5. **Sync to repo** -- Forward sync if ~/.claude was changed

---

## Related

- Hook catalog: `.claude/docs/architecture/quick-ref/hook-catalog.md`
- Hook system: `.claude/docs/architecture/subsystems/hooks.md`
- Build: `cd ~/.claude/hooks && npm run build`

---
*On-demand skill for auditing hook registrations vs source files*
