---
name: ralph-resume
description: Resume or retry failed Ralph agents
allowed-tools: [Read, Bash, Task, AskUserQuestion]
---

# Ralph Resume Skill

Resume or retry failed/stalled Ralph agents.

## Triggers

- `/ralph resume` - Show and optionally retry failed agents
- `/ralph status` - Show current agent status
- "resume ralph" / "retry failed agent"

## Workflow

### 1. Check Agent Status

Query the database for failed/stalled agents:

```bash
# Using psql directly for quick check
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "
SELECT id, agent_type, status, task_description, error_message
FROM agents
WHERE status IN ('failed', 'stalled')
   OR (status = 'running' AND started_at < NOW() - INTERVAL '10 minutes')
ORDER BY started_at DESC
LIMIT 10;
"
```

### 2. Present Options

Show the user:
- List of failed/stalled agents with their errors
- Option to retry specific agents
- Option to mark as resolved
- Option to start fresh

### 3. Retry Agent

To retry a failed agent:
1. Read the original task description from the agents table
2. Spawn the same agent type via Task tool with the same description
3. Update the agent status to 'running' with new started_at

### 4. Mark Resolved

If an agent's task was completed manually or is no longer needed:
```bash
docker exec continuous-claude-postgres psql -U claude -d continuous_claude -c "
UPDATE agents SET status = 'completed', result_summary = 'Manually resolved'
WHERE id = '<agent_id>';
"
```

## Example Session

```
User: /ralph resume

Claude: Found 2 agents needing attention:

1. [FAILED] kraken-abc123
   Type: kraken
   Task: "Implement user authentication"
   Error: "Test failures in auth.test.ts"
   Started: 10 min ago

2. [STALLED] arbiter-def456
   Type: arbiter
   Task: "Write unit tests for login"
   Status: Running but no activity for 15 min

Options:
- Reply "1" to retry agent 1
- Reply "2" to retry agent 2
- Reply "skip" to mark both as resolved
- Reply "fresh" to start a new Ralph session
```

## Agent Types

| Agent | Purpose | Common Failure Causes |
|-------|---------|----------------------|
| kraken | Implementation | Test failures, type errors |
| spark | Quick fixes | Scope creep, missing context |
| arbiter | Unit tests | Flaky tests, missing fixtures |
| atlas | E2E tests | Environment issues, timeouts |
| scout | Code research | Large codebase, unclear query |
| oracle | External research | API limits, network issues |

## Notes

- Stalled agents are those running for >10 min with no completion
- Failed agents have explicit error messages
- Always show the error message to help debug
- Consider if the task needs to be broken down further
