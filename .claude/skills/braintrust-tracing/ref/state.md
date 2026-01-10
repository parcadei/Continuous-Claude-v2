# Braintrust State Management

## Per-Session State Files

```
~/.claude/state/braintrust_sessions/
  {session_id}.json
```

Each session file:
```json
{
  "root_span_id": "abc-123",
  "project_id": "proj-456",
  "turn_count": 5,
  "tool_count": 23,
  "current_turn_span_id": "turn-789",
  "current_turn_start": 1703456789,
  "started": "2025-12-24T10:00:00.000Z",
  "is_subagent": false
}
```

## Global State

```
~/.claude/state/braintrust_global.json   # Cached project_id
~/.claude/state/braintrust_hook.log      # Debug log
```

## Key Files

| File | Purpose |
|------|---------|
| `.claude/plugins/braintrust-tracing/hooks/common.sh` | Shared utilities, API |
| `.claude/plugins/braintrust-tracing/hooks/session_start.sh` | Creates root span |
| `.claude/plugins/braintrust-tracing/hooks/user_prompt_submit.sh` | Creates Turn spans |
| `.claude/plugins/braintrust-tracing/hooks/post_tool_use.sh` | Creates tool spans |
| `.claude/plugins/braintrust-tracing/hooks/stop_hook.sh` | Creates LLM spans |
| `scripts/braintrust_analyze.py` | Query and analyze sessions |

## Clear State

```bash
rm ~/.claude/state/braintrust_sessions/*.json
rm ~/.claude/state/braintrust_global.json
```
