# Hook Developer — Input/Output Schemas

Full JSON schemas for every hook event type.

---

## PreToolUse

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "default|plan|acceptEdits|bypassPermissions",
  "hook_event_name": "PreToolUse",
  "tool_name": "string",
  "tool_input": {
    "file_path": "string",
    "command": "string"
  },
  "tool_use_id": "string"
}
```

**Output (JSON):**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "string",
    "updatedInput": {}
  },
  "continue": true,
  "stopReason": "string",
  "systemMessage": "string",
  "suppressOutput": true
}
```

**Exit code 2:** Blocks tool, stderr shown to Claude.
**Common matchers:** `Bash`, `Edit|Write`, `Read`, `Task`, `mcp__.*`

---

## PostToolUse

**CRITICAL:** The response field is `tool_response`, NOT `tool_result`.

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "PostToolUse",
  "tool_name": "string",
  "tool_input": {},
  "tool_response": {
    "filePath": "string",
    "success": true,
    "output": "string",
    "exitCode": 0
  },
  "tool_use_id": "string"
}
```

**Output (JSON):**
```json
{
  "decision": "block",
  "reason": "string",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "string"
  },
  "continue": true,
  "stopReason": "string",
  "suppressOutput": true
}
```

**Blocking:** `"decision": "block"` with `"reason"` prompts Claude to address the issue.
**Common matchers:** `Edit|Write`, `Bash`

---

## UserPromptSubmit

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "string"
}
```

**Output (plain text):** Any stdout text is added to context for Claude.

**Output (JSON block):**
```json
{
  "decision": "block",
  "reason": "string",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "string"
  }
}
```

**Blocking:** `"decision": "block"` erases prompt, shows `"reason"` to user only (not Claude).
**Exit code 2:** Blocks prompt, shows stderr to user only.

---

## PermissionRequest

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "PermissionRequest",
  "tool_name": "string",
  "tool_input": {}
}
```

**Output:**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny",
      "updatedInput": {},
      "message": "string",
      "interrupt": false
    }
  }
}
```

---

## SessionStart

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear|compact"
}
```

**Environment variable:** `CLAUDE_ENV_FILE` — write `export VAR=value` lines here to persist env vars.

**Output (plain text or JSON):**
```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "string"
  },
  "suppressOutput": true
}
```

Plain text stdout is added as context.

---

## SessionEnd

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "SessionEnd",
  "reason": "clear|logout|prompt_input_exit|other"
}
```

**Output:** Cannot affect session (already ending). Use for cleanup only.

---

## Stop

**CRITICAL:** Check `stop_hook_active: true` to prevent infinite loops.

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "Stop",
  "stop_hook_active": false
}
```

**Output:**
```json
{
  "decision": "block",
  "reason": "string"
}
```

**Blocking:** `"decision": "block"` forces Claude to continue with `"reason"` as prompt.

---

## SubagentStart

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "SubagentStart",
  "agent_id": "string"
}
```

**Output:** Context injection only (cannot block).

---

## SubagentStop

Same input/output structure as Stop. Check `stop_hook_active` to prevent loops.

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false
}
```

---

## PreCompact

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "PreCompact",
  "trigger": "manual|auto",
  "custom_instructions": "string"
}
```

**Matchers:** `manual`, `auto`

**Output:**
```json
{
  "continue": true,
  "systemMessage": "string"
}
```

---

## Notification

**Input:**
```json
{
  "session_id": "string",
  "transcript_path": "string",
  "cwd": "string",
  "permission_mode": "string",
  "hook_event_name": "Notification",
  "message": "string",
  "notification_type": "permission_prompt|idle_prompt|auth_success|elicitation_dialog"
}
```

**Matchers:** `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`, `*`

**Output:**
```json
{
  "continue": true,
  "suppressOutput": true,
  "systemMessage": "string"
}
```

---

## Registration in settings.json

### Standard Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
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

### Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `Bash` | Exactly Bash tool |
| `Edit\|Write` | Edit OR Write |
| `Read.*` | Regex: Read* |
| `mcp__.*__write.*` | MCP write tools |
| `*` | All tools |

**Case-sensitive:** `Bash` != `bash`

### Events Requiring Matchers

- PreToolUse — required
- PostToolUse — required
- PermissionRequest — required
- Notification — optional
- SessionStart — `startup|resume|clear|compact`
- PreCompact — `manual|auto`

### Events Without Matchers (UserPromptSubmit, Stop, etc.)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{ "type": "command", "command": "/path/to/hook.sh" }]
      }
    ]
  }
}
```

### Prompt-Based Hook Response Schema

```json
{
  "decision": "approve" | "block",
  "reason": "Explanation",
  "continue": false,
  "stopReason": "Message to user",
  "systemMessage": "Warning"
}
```

### MCP Tool Naming

Pattern: `mcp__<server>__<tool>`

| Pattern | Matches |
|---------|---------|
| `mcp__memory__.*` | All memory server tools |
| `mcp__.*__write.*` | All MCP write tools |
| `mcp__github__.*` | All GitHub tools |
