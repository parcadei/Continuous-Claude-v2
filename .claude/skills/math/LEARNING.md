# Learning From Past Sessions

How to query handoffs and Braintrust to understand past reasoning.

## Why This Matters

Each session produces artifacts:

- **Handoffs**: Structured summaries of what was done and why
- **Braintrust traces**: Full conversation logs with tool calls
- **Ledgers**: State checkpoints for multi-phase work

New sessions can query these to:

1. Avoid repeating mistakes
2. Follow established patterns
3. Understand decision rationale

## Querying Handoffs

### Find Recent Handoffs

```bash
ls -la thoughts/shared/handoffs/*/
```

### Read Specific Handoff

```bash
cat thoughts/shared/handoffs/open-source-release/current.md
```

### Handoff Structure

```markdown
## Ledger

### Goal - What "done" looks like

### State - Done/Now/Next with [x]/[→]/[ ] checkboxes

### Key Decisions - Choices made with rationale

### Open Questions - UNCONFIRMED items

## Task(s) - Table of task status

## Critical References - Key files

## Learnings - What worked/failed

## Action Items - Next steps
```

## Querying Braintrust

### Analyze Recent Session

```bash
uv run python scripts/braintrust_analyze.py --recent
```

### Specific Session

```bash
uv run python scripts/braintrust_analyze.py --session-id <id>
```

### What Braintrust Shows

- Tool call patterns (which tools, in what order)
- Token usage per turn
- Agent spawn patterns
- Error rates and retries

## Pattern Recognition

### Common Patterns from Past Sessions

**TDD Pipeline** (most successful):

```
Research → Plan → Write failing tests → Implement → Review
```

**Agent Orchestration** (context-efficient):

```
Main spawns agent → Agent works in isolation → Returns summary
```

**Anti-Patterns** (avoid):

- Reading agent output files (floods context)
- Background agents with TaskOutput (70k+ token dump)
- Editing code without reading it first

## Using Past Decisions

When facing similar decisions, check handoffs:

```bash
grep -r "Decision:" thoughts/shared/handoffs/
```

Example decision log entry:

```markdown
- Decision: Use TDD pipeline with agents
  - Alternatives: Implement directly, single agent
  - Reason: Preserved context, validated at each step
```

## Continuity Across Sessions

1. **Before /clear**: Update ledger, create handoff
2. **After resume**: SessionStart hook loads ledger
3. **Find current work**: Search for `[→]` in State section
