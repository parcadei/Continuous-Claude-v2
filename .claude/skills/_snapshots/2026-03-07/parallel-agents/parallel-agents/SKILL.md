---
name: parallel-agents
description: Parallel Agent Orchestration
user-invocable: false
---

# Parallel Agent Orchestration

When launching multiple agents in parallel, follow this pattern to avoid context bloat.

## Core Principles

1. **No TaskOutput calls** - TaskOutput returns full agent output, bloating context
2. **Run in background** - Always use `run_in_background: true`
3. **File-based confirmation** - Agents write status to files, not return values
4. **Append, don't overwrite** - Multiple agents can write to same status file

## Output Patterns

### Simple Confirmation (parallel batch work)
For tasks where agents just need to confirm completion:

```bash
# Agent writes to shared status file
echo "COMPLETE: <task-name> - $(date)" >> .claude/cache/<batch-name>-status.txt
```

- Use `>>` to append (not `>` which overwrites)
- Include timestamp for ordering
- One line per agent completion
- Check with: `cat .claude/cache/<batch-name>-status.txt`

### Detailed Output (research/exploration)
For tasks requiring detailed findings:

```
.claude/cache/agents/<task-type>/<agent-id>/
├── output.md      # Main findings
├── artifacts/     # Any generated files
└── status.txt     # Completion confirmation
```

- Each agent gets own directory
- Full output preserved for later reading
- Status file still used for quick completion check

## Task Prompt Template

```markdown
# Task: <TASK_NAME>

## Your Mission
<clear objective>

## Output
When done, write confirmation:
\`\`\`bash
echo "COMPLETE: <identifier> - $(date)" >> .claude/cache/<batch>-status.txt
\`\`\`

Do NOT return large output. Complete work silently.
```

## Launching Pattern

```typescript
// Launch all in single message block (parallel)
Task({
  description: "Task 1",
  prompt: "...",
  subagent_type: "general-purpose",
  run_in_background: true
})
Task({
  description: "Task 2",
  prompt: "...",
  subagent_type: "general-purpose",
  run_in_background: true
})
// ... up to 15 parallel agents
```

## Monitoring

```bash
# Check completion status
cat .claude/cache/<batch>-status.txt

# Count completions
wc -l .claude/cache/<batch>-status.txt

# Watch for updates
tail -f .claude/cache/<batch>-status.txt
```

## Batch Size

- **Max 15 agents** per parallel batch
- Wait for batch to complete before launching next
- Use status file to track which completed

## DO

- Use `run_in_background: true` always
- Have agents write to status files
- Use append (`>>`) not overwrite (`>`)
- Give each agent clear, self-contained instructions
- Include all context in prompt (agents don't share memory)

## DON'T

- Call TaskOutput (bloats context)
- Return large outputs from agents
- Launch more than 15 at once
- Rely on agent return values for orchestration

## Example: Provider Backfill

```bash
# Status file
.claude/cache/provider-backfill-status.txt

# Each agent appends on completion
echo "COMPLETE: anthropic - Thu Jan 2 12:34:56 2025" >> .claude/cache/provider-backfill-status.txt
echo "COMPLETE: openai - Thu Jan 2 12:35:12 2025" >> .claude/cache/provider-backfill-status.txt
```

Check progress:
```bash
cat .claude/cache/provider-backfill-status.txt
# COMPLETE: anthropic - Thu Jan 2 12:34:56 2025
# COMPLETE: openai - Thu Jan 2 12:35:12 2025
```
