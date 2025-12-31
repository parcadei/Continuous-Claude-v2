# Agents System

Specialized autonomous workers spawned to handle complex tasks independently.

## What is an Agent?

A separate Claude instance that:
- Operates independently (reads own context)
- Preserves main context (complex work in isolation)
- Returns summaries (~200 tokens vs 2000+)
- Uses MCP tools
- Writes artifacts to specific locations

## Agent Definition Format

```yaml
---
name: my-agent
description: What this agent does
model: opus
---

# Agent Title

## Step 1: Load Methodology
## Step 2: Understand Context
## Step 3: Execute
## Step 4: Output
## Rules
```

## Available Agents

| Category | Agents |
|----------|--------|
| **Planning** | plan-agent, validate-agent, research-agent, repo-research-analyst |
| **Implementation** | rp-explorer, onboard, codebase-pattern-finder |
| **Debugging** | debug-agent, session-analyst, braintrust-analyst, codebase-analyzer |
| **Utility** | context-query-agent, review-agent, codebase-locator |

## Key Agents

| Agent | When to Use | Output Location |
|-------|-------------|-----------------|
| plan-agent | Need implementation plan | `thoughts/shared/plans/` |
| debug-agent | Complex bug investigation | `.claude/cache/agents/debug-agent/` |
| rp-explorer | Token-efficient overview | `thoughts/handoffs/{session}/codebase-map.md` |
| research-agent | Multi-source research | `.claude/cache/agents/research-agent/` |

## Workflow

1. Main context invokes agent with task
2. Agent spawns (separate context)
3. Agent loads methodology, executes workflow
4. Agent writes output to specified location
5. Agent returns summary to main context
6. Main context continues with fresh context

## When to Use Agents

**Use agents for:**
- Full feature implementation
- Complex debugging
- Multi-file refactoring
- Phases of large plans

**Don't use agents for:**
- Single-line fixes
- Quick questions
- Simple file reads
