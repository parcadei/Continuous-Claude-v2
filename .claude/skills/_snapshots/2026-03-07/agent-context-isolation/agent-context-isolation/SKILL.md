---
name: agent-context-isolation
description: Agent Context Isolation
user-invocable: false
---

# Agent Context Isolation

Prevent agent output from polluting the main context window.

## Rules

### 1. Use Background Agents with File-Based Coordination
```
# RIGHT - background agent writes to file, main reads file
Task(subagent_type="...", run_in_background=true, prompt="... Output to: /path/to/file.md")

# WRONG - foreground agent dumps full transcript into main context
Task(subagent_type="...", run_in_background=false)
```

Background agents with `run_in_background=true` isolate their context. Have them write results to files in `.claude/cache/agents/<agent-type>/`.

### 2. Never Use TaskOutput to Retrieve Results
```
# WRONG - dumps entire transcript (70k+ tokens) into context
TaskOutput(task_id="<id>")
TaskOutput(task_id="<id>", block=true)

# RIGHT - check expected output files
Bash("ls -la .claude/cache/agents/<agent-type>/")
Bash("bun test")  # verify with tests
```

TaskOutput returns the full agent transcript. Always use file-based coordination instead.

### 3. Monitor Agent Progress via System Reminders
```
# System reminders come automatically:
# "Agent a42a16e progress: 6 new tools used, 88914 new tokens"

# To detect completion:
# - Watch for progress reminders to stop arriving
# - Poll for expected output files: find .claude/cache/agents -name "*.md" -mmin -5
# - Check task output file size growth: wc -c /tmp/claude/.../tasks/<id>.output
```

**Stuck agent detection:**
1. Progress reminders stop arriving
2. Task output file size stops growing
3. Expected output file not created after reasonable time

### 4. Verify with Tests, Not Output
After agent work:
1. Run the test suite directly: `bun test`
2. Report pass/fail counts
3. Only investigate failures if tests fail

### 5. File-Based Agent Pipeline Pattern
```
Research agent → .claude/cache/agents/oracle/output.md
                          ↓
Plan agent → .claude/cache/agents/plan-agent/output.md (reads research)
                          ↓
Validate agent → .claude/cache/agents/validate-agent/output.md (reads plan)
                          ↓
Implement agent → src/module.ts (reads validated plan)
```

Each agent reads the previous agent's file output, not TaskOutput.

## Why This Matters

Agent context isolation preserves the main conversation's context budget. Reading agent outputs via TaskOutput floods context, causing:
- Mid-conversation compaction
- Lost context about user's original request
- Repeated explanations needed

## Source
- Session where TaskOutput flooded 70k+ tokens into main context
- Session 2026-01-01: Successfully used background agents with file-based coordination for SDK Phase 3
