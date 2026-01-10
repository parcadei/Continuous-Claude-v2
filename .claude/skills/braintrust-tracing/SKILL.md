---
name: braintrust-tracing
description: Braintrust tracing for Claude Code - hook architecture, sub-agent correlation
user-invocable: false
---

# Braintrust Tracing

Tracing Claude Code sessions in Braintrust.

## Architecture

```
PARENT SESSION
  SessionStart (root span)
      |
  UserPromptSubmit (Turn span)
      |
  +---+---+
  |       |
PostToolUse  PreToolUse (Task)
             |
        SUB-AGENT (NEW root_span_id)
```

## Hook Event Flow

| Hook | Creates | Key Fields |
|------|---------|------------|
| SessionStart | Root span | `session_id`, `root_span_id` |
| UserPromptSubmit | Turn span | `prompt`, `turn_number` |
| PostToolUse | Tool span | `tool_name`, `input`, `output` |
| Stop | LLM spans | `model`, `tokens`, `tool_calls` |
| SubagentStop | (none) | `session_id` of sub-agent |

## Sub-Agent Correlation

**Sub-agents create orphaned traces** (new `root_span_id`).

**What works:** Task spans contain `agentId`, timestamps, `subagent_type`. Match by timing or use SubagentStop's `session_id`.

**What doesn't work:** SessionStart doesn't receive Task prompt - injected context is lost.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRACE_TO_BRAINTRUST` | Yes | Set to `"true"` |
| `BRAINTRUST_API_KEY` | Yes | API key |
| `BRAINTRUST_CC_PROJECT` | No | Project name (default: `claude-code`) |
| `BRAINTRUST_CC_DEBUG` | No | Verbose logging |

## Quick Debug

```bash
tail -f ~/.claude/state/braintrust_hook.log
cat ~/.claude/state/braintrust_sessions/*.json | jq -s '.'
```

## References

For state management: `cat ref/state.md`
For debugging commands: `cat ref/debugging.md`
For sub-agent correlation details: `cat ref/subagent-correlation.md`
