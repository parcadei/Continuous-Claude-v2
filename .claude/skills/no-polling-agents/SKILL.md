---
name: no-polling-agents
description: No Polling for Background Agents
user-invocable: false
---

# No Polling for Background Agents

When launching parallel background agents, do NOT poll with sleep loops.

## When to Use

This skill is invoked when launching background agents. Not user-invocable directly.

## Pattern

Background agents write to status files when complete. Wait for them naturally.

## DO

- Launch agents with `run_in_background: true`
- Continue with other work while agents run
- Check status file only when user asks or when you need results to proceed
- Trust the agent completion system

## DON'T

- Run `sleep 10 && cat status.txt` in loops
- Continuously poll for completion
- Waste tokens checking status repeatedly
- Block on agents unless absolutely necessary

## When to Check Status

1. User explicitly asks "are they done?"
2. You need agent output to proceed with next task
3. Significant time has passed and user is waiting

## Example

```typescript
// Launch agents
Task({ ..., run_in_background: true })
Task({ ..., run_in_background: true })

// Continue with other work or conversation
// Agents will write to status file when done

// Only check when needed
cat .claude/cache/status.txt
```

## Source

User feedback: "You can just wait until everyone pings you"
