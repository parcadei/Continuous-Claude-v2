# Hooks System

Event-driven scripts that run at specific points in Claude's workflow.

## Architecture

```
hooks/
├── src/           # TypeScript source (development)
├── dist/          # Pre-bundled JS (committed, production)
├── *.sh           # Shell wrappers
├── build.sh       # Rebuild dist/ from src/
└── CONFIG.md      # Configuration guide
```

**For users**: Just clone - hooks work immediately (dist/ pre-bundled).
**For developers**: Edit src/*.ts → run build.sh → commit both.

## Hook Events

| Event | When | Purpose |
|-------|------|---------|
| `UserPromptSubmit` | Before processing | Skill activation, prompt enhancement |
| `PreToolUse` | Before tool execution | Validate actions, prevent mistakes |
| `PostToolUse` | After tool completes | Track changes, detect issues |
| `SessionStart` | Session begins/resumes | Load continuity state |
| `PreCompact` | Before context compaction | Create handoff document |
| `SessionEnd` | Session terminates | Cleanup, analytics |
| `Stop` | Agent stops | Capture results |

## Essential Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `skill-activation-prompt.sh` | UserPromptSubmit | Auto-suggest skills from prompt |
| `post-tool-use-tracker.sh` | PostToolUse | Track file changes |
| `session-start-continuity.sh` | SessionStart | Load continuity ledger |
| `pre-compact-continuity.sh` | PreCompact | Create handoff |
| `typescript-preflight.sh` | PostToolUse | Check TypeScript compilation |

## Development Workflow

```bash
# Edit TypeScript
vim src/my-hook.ts

# Rebuild
./build.sh

# Test manually
echo '{"prompt": "test"}' | ./my-hook.sh

# Commit both src/ and dist/
git add src/ dist/
```

## Hook Input/Output

```typescript
// Input (from stdin)
interface HookInput {
  prompt?: string;
  tool?: string;
  result?: any;
}

// Output (to stdout)
interface HookOutput {
  result: 'continue' | 'block';
  message?: string;
  data?: any;
}
```

## Registration (settings.json)

```json
{
  "hooks": {
    "EventName": [{
      "matcher": "Tool1|Tool2",
      "hooks": [{
        "type": "command",
        "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.sh"
      }]
    }]
  }
}
```
