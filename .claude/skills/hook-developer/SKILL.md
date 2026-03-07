---
name: hook-developer
description: Complete Claude Code hooks reference - input/output schemas, registration, testing patterns
---

# Hook Developer

Complete reference for developing Claude Code hooks.

## When to Use

- Creating a new hook
- Debugging hook input/output format
- Understanding what fields are available
- Setting up hook registration in settings.json
- Learning what hooks can block vs inject context

## Reference Files

| File | Contents |
|------|----------|
| `references/schemas.md` | Full JSON schemas for every hook event + registration patterns |
| `references/examples.md` | Shell wrappers, TypeScript template, common patterns, test commands |

---

## Hook Quick Reference

| Hook | Fires When | Can Block? | Primary Use |
|------|-----------|------------|-------------|
| **PreToolUse** | Before tool executes | YES | Block/modify tool calls |
| **PostToolUse** | After tool completes | Partial | React to tool results |
| **UserPromptSubmit** | User sends prompt | YES | Validate/inject context |
| **PermissionRequest** | Permission dialog shows | YES | Auto-approve/deny |
| **SessionStart** | Session begins | NO | Load context, set env vars |
| **SessionEnd** | Session ends | NO | Cleanup/save state |
| **Stop** | Agent finishes | YES | Force continuation |
| **SubagentStart** | Subagent spawns | NO | Pattern coordination |
| **SubagentStop** | Subagent finishes | YES | Force continuation |
| **PreCompact** | Before compaction | NO | Save state |
| **Notification** | Notification sent | NO | Custom alerts |

**Hook type options:** `type: "command"` (bash) or `type: "prompt"` (LLM evaluation)

---

## Exit Codes

| Exit Code | Behavior | stdout | stderr |
|-----------|----------|--------|--------|
| **0** | Success | JSON processed | Ignored |
| **2** | Blocking error | IGNORED | Error message |
| **Other** | Non-blocking error | Ignored | Verbose mode |

### Exit Code 2 by Hook

| Hook | Effect |
|------|--------|
| PreToolUse | Blocks tool, stderr to Claude |
| PostToolUse | stderr to Claude (tool already ran) |
| UserPromptSubmit | Blocks prompt, stderr to user only |
| Stop | Blocks stop, stderr to Claude |

---

## Environment Variables

### Available to All Hooks

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to project root |
| `CLAUDE_CODE_REMOTE` | "true" if remote/web, empty if local CLI |

### SessionStart Only

| Variable | Description |
|----------|-------------|
| `CLAUDE_ENV_FILE` | Path to write `export VAR=value` lines |

### Plugin Hooks Only

| Variable | Description |
|----------|-------------|
| `CLAUDE_PLUGIN_ROOT` | Absolute path to plugin directory |

---

## Registration Quickstart

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/my-hook.sh",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Events requiring matchers: PreToolUse, PostToolUse, PermissionRequest, Notification, SessionStart, PreCompact.
Events without matchers: UserPromptSubmit, Stop, SubagentStart, SubagentStop, SessionEnd.

Full matcher patterns and registration examples: `references/schemas.md`

---

## Key Field Names (Common Mistakes)

- `tool_response` — NOT `tool_result` (PostToolUse input)
- `permissionDecision` — inside `hookSpecificOutput` (PreToolUse output)
- `decision: "block"` + `reason` — for blocking in PostToolUse / Stop
- `stop_hook_active` — check this in Stop/SubagentStop to prevent infinite loops

---

## Debugging Checklist

- [ ] Hook registered in settings.json?
- [ ] Shell script has `+x` permission?
- [ ] Bundle rebuilt after TS changes? (`npx esbuild ...`)
- [ ] Using `tool_response` not `tool_result`?
- [ ] Output is valid JSON (or plain text for UserPromptSubmit)?
- [ ] Checking `stop_hook_active` in Stop hooks?
- [ ] Using `$CLAUDE_PROJECT_DIR` for paths?

---

## Key Learnings from Past Sessions

1. **Field names matter** - `tool_response` not `tool_result`
2. **Output format** - `decision: "block"` + `reason` for blocking
3. **Exit code 2** - stderr goes to Claude/user, stdout IGNORED
4. **Rebuild bundles** - TypeScript source edits don't auto-apply
5. **Test manually** - `echo '{}' | ./hook.sh` before relying on it
6. **Check outputs first** - `ls .claude/cache/` before editing code
7. **Detached spawn hides errors** - add logging to debug

---

## See Also

- `references/schemas.md` - Full input/output schemas for every hook type
- `references/examples.md` - Shell wrappers, TS template, common patterns, test commands
- `/debug-hooks` - Systematic debugging workflow
- `.claude/rules/hooks.md` - Hook development rules
