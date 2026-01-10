# Hook Input/Output Schemas

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
  "tool_input": {"file_path": "string", "command": "string"},
  "tool_use_id": "string"
}
```

**Output:**
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

## PostToolUse

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "PostToolUse",
  "tool_name": "string",
  "tool_input": {},
  "tool_response": {"filePath": "string", "success": true, "output": "string", "exitCode": 0},
  "tool_use_id": "string"
}
```

**CRITICAL:** Field is `tool_response`, NOT `tool_result`.

**Output:**
```json
{
  "decision": "block",
  "reason": "string",
  "hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "string"}
}
```

## UserPromptSubmit

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "string"
}
```

**Output:** Plain text stdout added to context, or JSON with `{"decision": "block", "reason": "..."}`.

## PermissionRequest

**Input:**
```json
{
  "session_id": "string",
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
    "decision": {"behavior": "allow|deny", "updatedInput": {}, "message": "string"}
  }
}
```

## SessionStart

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear|compact"
}
```

Use `CLAUDE_ENV_FILE` to persist env vars.

## SessionEnd

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "SessionEnd",
  "reason": "clear|logout|prompt_input_exit|other"
}
```

## Stop / SubagentStop

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "Stop",
  "stop_hook_active": false
}
```

**CRITICAL:** Check `stop_hook_active: true` to prevent infinite loops!

**Output:** `{"decision": "block", "reason": "..."}` forces continuation.

## PreCompact

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "PreCompact",
  "trigger": "manual|auto",
  "custom_instructions": "string"
}
```

## Notification

**Input:**
```json
{
  "session_id": "string",
  "hook_event_name": "Notification",
  "message": "string",
  "notification_type": "permission_prompt|idle_prompt|auth_success|elicitation_dialog"
}
```
