---
name: agent-orchestration
description: Agent Orchestration Rules
user-invocable: false
---

# Agent Orchestration Rules

When the user asks to implement something, use implementation agents to preserve main context.

## The Pattern

**Wrong - burns context:**
```
Main: Read files → Understand → Make edits → Report
      (2000+ tokens consumed in main context)
```

**Right - preserves context:**
```
Main: Spawn agent("implement X per plan")
      ↓
Agent: Reads files → Understands → Edits → Tests
      ↓
Main: Gets summary (~200 tokens)
```

## When to Use Agents

| Task Type | Use Agent? | Reason |
|-----------|------------|--------|
| Multi-file implementation | Yes | Agent handles complexity internally |
| Following a plan phase | Yes | Agent reads plan, implements |
| New feature with tests | Yes | Agent can run tests |
| Single-line fix | No | Faster to do directly |
| Quick config change | No | Overhead not worth it |

## Key Insight

Agents read their own context. Don't read files in main chat just to understand what to pass to an agent - give them the task and they figure it out.

## Example Prompt

```
Implement Phase 4: Outcome Marking Hook from the Artifact Index plan.

**Plan location:** thoughts/shared/plans/2025-12-24-artifact-index.md (search for "Phase 4")

**What to create:**
1. TypeScript hook
2. Shell wrapper
3. Python script
4. Register in settings.json

When done, provide a summary of files created and any issues.
```

## Trigger Words

When user says these, consider using an agent:
- "implement", "build", "create feature"
- "follow the plan", "do phase X"
- "use implementation agents"
