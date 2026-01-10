# Testing Hooks

## Manual Test Commands

```bash
# PostToolUse (Write)
echo '{"tool_name":"Write","tool_input":{"file_path":"test.md"},"tool_response":{"success":true},"session_id":"test"}' | \
  .claude/hooks/my-hook.sh

# PreToolUse (Bash)
echo '{"tool_name":"Bash","tool_input":{"command":"ls"},"session_id":"test"}' | \
  .claude/hooks/my-hook.sh

# SessionStart
echo '{"hook_event_name":"SessionStart","source":"startup","session_id":"test"}' | \
  .claude/hooks/session-start.sh

# SessionEnd
echo '{"hook_event_name":"SessionEnd","reason":"clear","session_id":"test"}' | \
  .claude/hooks/session-end.sh

# UserPromptSubmit
echo '{"prompt":"test prompt","session_id":"test"}' | \
  .claude/hooks/prompt-submit.sh
```

## Rebuild After TypeScript Edits

```bash
cd .claude/hooks
npx esbuild src/my-hook.ts \
  --bundle --platform=node --format=esm \
  --outfile=dist/my-hook.mjs
```

## Debugging Checklist

- [ ] Hook registered in settings.json?
- [ ] Shell script has `+x` permission?
- [ ] Bundle rebuilt after TS changes?
- [ ] Using `tool_response` not `tool_result`?
- [ ] Output is valid JSON (or plain text)?
- [ ] Checking `stop_hook_active` in Stop hooks?
- [ ] Using `$CLAUDE_PROJECT_DIR` for paths?

## Key Learnings

1. **Field names matter** - `tool_response` not `tool_result`
2. **Output format** - `decision: "block"` + `reason` for blocking
3. **Exit code 2** - stderr goes to Claude/user, stdout IGNORED
4. **Rebuild bundles** - TypeScript source edits don't auto-apply
5. **Test manually** - `echo '{}' | ./hook.sh` before relying on it
