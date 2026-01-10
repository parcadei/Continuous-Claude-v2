---
name: hook-developer
description: Claude Code hooks reference - schemas, registration, testing
---

# Hook Developer

Reference for developing Claude Code hooks.

## Quick Reference

| Hook | Fires When | Can Block? | Primary Use |
|------|-----------|------------|-------------|
| PreToolUse | Before tool executes | YES | Block/modify tool calls |
| PostToolUse | After tool completes | Partial | React to tool results |
| UserPromptSubmit | User sends prompt | YES | Validate/inject context |
| PermissionRequest | Permission dialog shows | YES | Auto-approve/deny |
| SessionStart | Session begins | NO | Load context, set env vars |
| SessionEnd | Session ends | NO | Cleanup/save state |
| Stop | Agent finishes | YES | Force continuation |
| SubagentStart | Subagent spawns | NO | Pattern coordination |
| SubagentStop | Subagent finishes | YES | Force continuation |
| PreCompact | Before compaction | NO | Save state |
| Notification | Notification sent | NO | Custom alerts |

**Hook types:** `type: "command"` (bash) or `type: "prompt"` (LLM evaluation)

## Exit Codes

| Exit Code | Behavior |
|-----------|----------|
| 0 | Success, JSON processed |
| 2 | Blocking error, stderr shown |
| Other | Non-blocking error |

## Key Fields

- **PreToolUse/PostToolUse:** `tool_name`, `tool_input`, `tool_response` (NOT tool_result)
- **Blocking output:** `{"decision": "block", "reason": "..."}`
- **Stop hooks:** MUST check `stop_hook_active` to prevent infinite loops

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Absolute path to project root |
| `CLAUDE_ENV_FILE` | (SessionStart only) Write `export VAR=value` |

## Registration

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Edit|Write",
      "hooks": [{"type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/my-hook.sh"}]
    }]
  }
}
```

**Matchers:** `Bash`, `Edit|Write`, `mcp__.*`, `*` (all). Case-sensitive.

## References

For detailed schemas: `cat ref/schemas.md`
For common patterns: `cat ref/patterns.md`
For testing commands: `cat ref/testing.md`

## See Also

- `/debug-hooks` - Systematic debugging workflow
- `.claude/rules/hooks.md` - Hook development rules
