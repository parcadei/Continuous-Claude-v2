---
name: debug-hooks
description: Systematic hook debugging workflow. Use when hooks aren't firing, producing wrong output, or behaving unexpectedly.
allowed-tools: [Bash, Read, Grep]
---

# Debug Hooks

Systematic workflow for debugging Claude Code hooks.

## When to Use

- "Hook isn't firing"
- "Hook produces wrong output"
- "SessionEnd not working"
- "PostToolUse hook not triggering"
- "Why didn't my hook run?"

## Workflow

### 1. Check Outputs First (Observe Before Editing)

```bash
# Check project cache
ls -la $CLAUDE_PROJECT_DIR/.claude/cache/

# Check specific outputs
ls -la $CLAUDE_PROJECT_DIR/.claude/cache/learnings/

# Check for debug logs
tail $CLAUDE_PROJECT_DIR/.claude/cache/*.log 2>/dev/null

# Also check global (common mistake: wrong path)
ls -la ~/.claude/cache/ 2>/dev/null
```

### 2. Verify Hook Registration

```bash
# Project settings
cat $CLAUDE_PROJECT_DIR/.claude/settings.json | grep -A 20 '"SessionEnd"\|"PostToolUse"\|"UserPromptSubmit"'

# Global settings (hooks merge from both)
cat ~/.claude/settings.json | grep -A 20 '"SessionEnd"\|"PostToolUse"\|"UserPromptSubmit"'
```

### 3. Check Hook Files Exist

```bash
# Shell wrappers
ls -la $CLAUDE_PROJECT_DIR/.claude/hooks/*.sh

# Compiled bundles (if using TypeScript)
ls -la $CLAUDE_PROJECT_DIR/.claude/hooks/dist/*.mjs
```

### 4. Test Hook Manually

```bash
# SessionEnd hook
echo '{"session_id": "test-123", "reason": "clear", "transcript_path": "/tmp/test"}' | \
  $CLAUDE_PROJECT_DIR/.claude/hooks/session-end-cleanup.sh

# PostToolUse hook (Write tool example)
echo '{"tool_name": "Write", "tool_input": {"file_path": "test.md"}, "session_id": "test-123"}' | \
  $CLAUDE_PROJECT_DIR/.claude/hooks/handoff-index.sh
```

### 5. Check for Silent Failures

If using detached spawn with `stdio: 'ignore'`:

```typescript
// This pattern hides errors!
spawn(cmd, args, { detached: true, stdio: 'ignore' })
```

**Fix:** Add temporary logging:

```typescript
const logFile = fs.openSync('.claude/cache/debug.log', 'a');
spawn(cmd, args, {
  detached: true,
  stdio: ['ignore', logFile, logFile]  // capture stdout/stderr
});
```

### 6. Rebuild After Edits

If you edited TypeScript source, you MUST rebuild:

```bash
cd $CLAUDE_PROJECT_DIR/.claude/hooks
npx esbuild src/session-end-cleanup.ts \
  --bundle --platform=node --format=esm \
  --outfile=dist/session-end-cleanup.mjs
```

Source edits alone don't take effect - the shell wrapper runs the bundled `.mjs`.

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Hook never runs | Not registered in settings.json | Add to correct event in settings |
| Hook runs but no output | Detached spawn hiding errors | Add logging, check manually |
| Wrong session ID | Using "most recent" query | Pass ID explicitly |
| Works locally, not in CI | Missing dependencies | Check npx/node availability |
| Runs twice | Registered in both global + project | Remove duplicate |

## Debug Checklist

- [ ] Outputs exist? (`ls -la .claude/cache/`)
- [ ] Registered? (`grep -A10 '"hooks"' .claude/settings.json`)
- [ ] Files exist? (`ls .claude/hooks/*.sh`)
- [ ] Bundle current? (`ls -la .claude/hooks/dist/`)
- [ ] Manual test works? (`echo '{}' | ./hook.sh`)
- [ ] No silent failures? (check for `stdio: 'ignore'`)

## Source Sessions

Derived from 10 sessions (83% of all learnings):
- a541f08a, 1c21e6c8, 6a9f2d7a, a8bd5cea, 2ca1a178, 657ce0b2, 3998f3a2, 2a829f12, 0b46cfd7, 862f6e2c
