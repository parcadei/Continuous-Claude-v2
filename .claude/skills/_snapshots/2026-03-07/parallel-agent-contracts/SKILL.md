---
name: parallel-agent-contracts
description: Parallel Agent Type Contracts
user-invocable: false
---

# Parallel Agent Type Contracts

When launching parallel agents for code implementation, prevent type duplication.

## Required in Every Agent Prompt

### 1. Verification Command (MANDATORY)
```markdown
## Before Marking Complete
Run verification:
\`\`\`bash
npx tsc --noEmit 2>&1 | head -20
\`\`\`
If ANY type errors exist, fix them before completing.
```

### 2. Grep-Before-Create
```markdown
## Before Creating Any Type/Interface
First check if it exists:
\`\`\`bash
grep -r "interface YourTypeName\|type YourTypeName" src/
\`\`\`
If found, import it. NEVER duplicate existing types.
```

### 3. Canonical Type Map
Include relevant entries from this map in agent prompts:

| Type | Owner File | Import From |
|------|-----------|-------------|
| `NormalizedTool` | `src/sdk/agent.ts` | `'./agent'` |
| `ToolCall` | `src/sdk/agent.ts` | `'./agent'` |
| `ToolResult` | `src/sdk/agent.ts` | `'./agent'` |
| `ToolDefinition` | `src/sdk/agent.ts` | `'./agent'` |
| `Message` | `src/sdk/types.ts` | `'./types'` |
| `ContentBlock` | `src/sdk/types.ts` | `'./types'` |
| `TokenUsage` | `src/sdk/types.ts` | `'./types'` |
| `ProviderAdapter` | `src/sdk/providers/index.ts` | `'./providers'` |
| `RiggClient` | `src/sdk/client.ts` | `'./client'` |

## Prompt Template

When spawning implementation agents:

```markdown
# Task: [Description]

## Type Ownership (DO NOT recreate)
- [List relevant types from canonical map]

## Before Creating New Types
Run: `grep -r "interface TypeName" src/` - if exists, import it.

## Before Marking Complete
Run: `npx tsc --noEmit 2>&1 | head -20`
Fix all type errors before completing.

## Your Implementation
[Actual task description]
```

## Why This Works

1. **Type checker is the contract** - tsc catches conflicts automatically
2. **Grep is fast** - 1 second to check if type exists
3. **Explicit ownership** - No ambiguity about where types live
4. **Fail fast** - Agent can't claim "done" with broken types
