---
name: ralph-resume
description: Resume or retry failed Ralph agents
allowed-tools: [Read, Bash, Task, AskUserQuestion]
---

# Ralph Resume Skill

Resume or retry failed/stalled Ralph agents using unified state.

## Triggers

- `/ralph resume` - Show and optionally retry failed agents
- `/ralph status` - Show current agent status
- "resume ralph" / "retry failed agent"

## Workflow

### 1. Check Task Status

Query the unified state for failed/blocked tasks:

```bash
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} status
```

Filter for actionable tasks:

```bash
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} task-list
```

Look for tasks with `status` of `failed`, `blocked`, or `in_progress` (stalled if no activity).

### 2. Present Options

Show the user:
- List of failed/blocked tasks with their errors and retry counts
- Retry queue entries with escalation level
- Option to retry specific tasks
- Option to mark as resolved
- Option to start fresh

### 3. Check Retry Queue

```bash
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} retry-list
```

Each retry entry shows: task ID, attempt number, last error, and recommended escalation agent.

### 4. Retry a Task

Follow the escalation ladder based on attempt number:

| Attempt | Agent | Rationale |
|---------|-------|-----------|
| 1 | Original agent | Same approach, fresh context |
| 2 | spark | Simpler, focused fix |
| 3 | debug-agent | Root cause investigation |
| 4+ | ESCALATE | User must intervene |

To retry:

```bash
# Pop from retry queue (resets task to pending)
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} retry-pop

# Start the task with escalated agent
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} task-start --id <task_id>
```

Then spawn the appropriate agent via Task tool with the task description.

### 5. Mark Resolved

If a task was completed manually or is no longer needed:

```bash
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} task-complete --id <task_id>
```

### 6. Show Progress

```bash
python ~/.claude/scripts/ralph/ralph-state-v2.py -p ${PROJECT} progress
```

Outputs: `RALPH: STORY-001 [========----] 4/10 (40%) | retry: 1 | last commit: 5m ago`

## Example Session

```
User: /ralph resume

Claude: Ralph status for STORY-001 (building):

  Progress: [========------------] 4/10 (40%)

  Failed tasks:
  1. [FAILED] Task 5.1 - Implement auth middleware
     Agent: kraken | Retries: 1 | Error: "Test failures in auth.test.ts"

  2. [BLOCKED] Task 5.2 - Add rate limiting
     Agent: kraken | Retries: 3 | Error: "Dependency on Task 5.1"

  Retry queue: 1 entry (Task 5.1, attempt 2 -> spark)

  Options:
  - Reply "retry 5.1" to spawn spark agent for Task 5.1
  - Reply "skip 5.2" to mark Task 5.2 as skipped
  - Reply "fresh" to start a new Ralph session
  - Reply "status" for detailed state dump
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

- All state is in `.ralph/state.json` (unified v2.0 format)
- Retry escalation: same agent -> spark -> debug-agent -> user
- Max 3 retries before task is marked `blocked`
- Use `ralph-state-v2.py` for all state operations (never raw SQL)
