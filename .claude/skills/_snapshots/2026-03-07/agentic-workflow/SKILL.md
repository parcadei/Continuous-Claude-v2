---
name: agentic-workflow
description: Agentic Workflow Pattern
user-invocable: false
---

# Agentic Workflow Pattern

Standard multi-agent pipeline for implementation tasks.

## Architecture Principles

- Use `run_in_background: true` for all agents to keep main context minimal
- Use `Task` tool (never `TaskOutput`) to avoid receiving full agent transcripts
- Agents write outputs to `.claude/cache/agents/<stage>/` for injection into subsequent agents
- Main conversation is pure orchestration — no heavy lifting, only coordination

## Workflow Stages

### 1. Research Agent
```
Task(subagent_type="oracle", run_in_background=true, prompt="""
Query NIA Oracle (via /nia-docs skill) to verify approach and gather best practices.

Output to: .claude/cache/agents/oracle/<task>-research.md
""")
```
- Enforce NIA as the research layer
- Output: Research findings

### 2. Planning Agent
```
Task(subagent_type="plan-agent", run_in_background=true, prompt="""
Read: .claude/cache/agents/oracle/<task>-research.md
Use RP-CLI to analyze the target codebase section.
Generate implementation plan informed by research.

Output to: .claude/cache/agents/plan-agent/<task>-plan.md
""")
```
- Receives: Research agent output as context
- Output: Implementation plan

### 3. Validation Agent
```
Task(subagent_type="validate-agent", run_in_background=true, prompt="""
Read: .claude/cache/agents/plan-agent/<task>-plan.md
Read: .claude/cache/agents/oracle/<task>-research.md
Review plan against research findings and best practices.

Output to: .claude/cache/agents/validate-agent/<task>-validated.md
""")
```
- Reviews plan against research
- Output: Validated plan with amendments

### 4. Implementation Agent
```
Task(subagent_type="agentica-agent", run_in_background=true, prompt="""
Read: .claude/cache/agents/validate-agent/<task>-validated.md
Read: .claude/cache/agents/oracle/<task>-research.md

TDD approach: Write failing tests FIRST, then implement.
Run tests to verify.

Output summary to: .claude/cache/agents/implement-agent/<task>-implementation.md
""")
```
- Receives: Validated plan + research context
- **TDD**: Failing tests first
- Output: Implementation + tests

### 5. Review Agent
```
Task(subagent_type="review-agent", run_in_background=true, prompt="""
Read: .claude/cache/agents/implement-agent/<task>-implementation.md
Read: .claude/cache/agents/validate-agent/<task>-validated.md
Read: .claude/cache/agents/oracle/<task>-research.md

Cross-reference implementation against plan and research.
Run tests to confirm passing.

Output to: .claude/cache/agents/review-agent/<task>-review.md
""")
```
- Cross-references all artifacts
- Confirms tests pass
- Output: Review summary

## Agent Progress Monitoring

```bash
# Watch for system reminders:
# "Agent a42a16e progress: 6 new tools used, 88914 new tokens"

# Poll for output files:
find .claude/cache/agents -name "*.md" -mmin -5

# Check task file size growth:
wc -c /tmp/claude/.../tasks/<id>.output
```

**Stuck detection:**
1. Progress reminders stop arriving
2. Task output file size stops growing
3. Expected output file not created after reasonable time

## Directory Structure

```
.claude/cache/agents/
├── oracle/
│   └── <task>-research.md
├── plan-agent/
│   └── <task>-plan.md
├── validate-agent/
│   └── <task>-validated.md
├── implement-agent/
│   └── <task>-implementation.md
└── review-agent/
    └── <task>-review.md
```

## Key Rules

1. **Never use TaskOutput** - floods context with 70k+ token transcripts
2. **Always run_in_background=true** - isolates agent context
3. **File-based handoff** - each agent reads previous agent's output file
4. **Poll, don't block** - check file system for outputs, don't wait
5. **TDD in implementation** - failing tests first, then make them pass

## Source
- Session 2026-01-01: SDK Phase 3 implementation using this pattern
