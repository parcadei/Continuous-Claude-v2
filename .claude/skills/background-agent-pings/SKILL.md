---
name: background-agent-pings
description: Background Agent Pings
user-invocable: false
---

# Background Agent Pings

Trust system reminders as agent progress notifications. Don't poll.

## When to Use

This skill is invoked when managing background agents. Not user-invocable directly.

## Pattern

When you launch a background agent, **continue working on other tasks**. The system will notify you via reminders when:
- Agent makes progress: `Agent <id> progress: X new tools used, Y new tokens`
- Agent writes output file (check the path you specified)

## DO

```
1. Task(run_in_background=true, prompt="... Output to: .claude/cache/agents/<type>/output.md")
2. Continue with next task immediately
3. When system reminder shows agent activity, check if output file exists
4. Read output file only when agent signals completion
```

## DON'T

```
# BAD: Polling wastes tokens and time
Task(run_in_background=true)
Bash("sleep 5 && ls ...")  # polling
Bash("tail /tmp/claude/.../tasks/<id>.output")  # polling
TaskOutput(task_id="...")  # floods context
```

## Why This Matters

- Polling burns tokens on repeated checks
- `TaskOutput` floods main context with full agent transcript
- System reminders are free - they're pushed to you automatically
- Continue productive work while waiting

## Source

- This session: Realized polling for agent output wasted time when system reminders already provide progress updates
