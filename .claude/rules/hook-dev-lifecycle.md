# Hook Development Lifecycle

## Full Workflow

1. **Scaffold** — use `/hook-scaffold` skill or create `.claude/hooks/src/<name>.ts` manually
2. **Implement** — write hook logic in TypeScript (see Event Types below)
3. **Build** — `cd .claude/hooks && npm run build` → produces `dist/<name>.mjs`
4. **Register** — add entry to `~/.claude/settings.json` using Node.js atomic write (never Edit tool)
5. **Test** — `cd .claude/hooks && npx vitest run src/__tests__/<name>.test.ts`
6. **Sync** — `bash scripts/sync-to-active.sh` (or commit triggers auto-sync)
7. **Verify** — start a new session, confirm hook runs

## Event Types and Output Contracts

| Event | When | Output |
|-------|------|--------|
| PreToolUse | Before tool executes | `{ permissionDecision: "allow"\|"deny" }` |
| PostToolUse | After tool executes | `{ hookSpecificOutput: { additionalContext: "..." } }` |
| SessionStart | Session begins | `{ hookSpecificOutput: { additionalContext: "..." } }` |
| SessionEnd | Session closes | `{}` |
| UserPromptSubmit | User sends message | `{ hookSpecificOutput: { additionalContext: "..." } }` |

## Common Failure Modes

| Failure | Cause | Fix |
|---------|-------|-----|
| Hook silently doesn't run | Missing registration in settings.json | Run `/hook-audit` to find unregistered hooks |
| dist file missing | Never built or build failed | `cd .claude/hooks && npm run build` |
| Stale behavior | src changed but dist not rebuilt | `cd .claude/hooks && npm run build` |
| Hook errors in stderr | Logic error in TS code | Check `~/.claude/hooks/dist/<name>.mjs` output |
| settings.json race | Used Edit tool on settings.json | Use Node.js atomic read-modify-write instead |
| Sync gap | Changed in repo, not in ~/.claude | `bash scripts/sync-to-active.sh` |
| Windows encoding crash | Unicode/emoji in Python hooks | Use ASCII only |
| SessionEnd "Hook cancelled" | Blocking spawnSync exceeds timeout | Use fire-and-forget spawn (detached, unref'd) for long operations; bump timeout to 30-60s in settings.json |

## Key Architecture Notes

- Hooks are TypeScript in `.claude/hooks/src/`, compiled by esbuild to `dist/*.mjs`
- Test framework: **vitest** (NOT jest) — `npm test` or `npx vitest run`
- Settings.json is NOT auto-synced — update in both repo and `~/.claude/`
- Context injection: `PostToolUse additionalContext` is the reliable inject pattern
- Permission blocking: `PreToolUse permissionDecision: "deny"` blocks the tool call
- Pass `session_id` in all test inputs — without it, child processes get PID-based IDs that break state file matching

## Registering a Hook (settings.json)

```bash
node -e "
const fs = require('fs');
const p = 'C:/Users/david.hayes/.claude/settings.json';
const s = JSON.parse(fs.readFileSync(p, 'utf8'));
s.hooks.PostToolUse = s.hooks.PostToolUse || [];
s.hooks.PostToolUse.push({ matcher: 'Bash', hooks: [{ type: 'command', command: 'node ~/.claude/hooks/dist/<name>.mjs' }] });
fs.writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
"
```

## References

- Hook health check: `/hook-audit` skill
- Hook scaffold: `/hook-scaffold` skill
- Sync drift check: `/sync-drift` skill
- Full hook catalog: `docs/architecture/quick-ref/hook-catalog.md`
