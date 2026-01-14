# Proactive Agent Delegation

Keep main context clean by delegating to agents. Don't wait to be asked.

## Pattern Detection

When user message arrives, detect:

| Pattern | Signal | Action |
|---------|--------|--------|
| Multiple tasks | "X and Y", "also", comma-separated | Suggest parallel agents |
| Research needed | "how does", "what is", "find" | Spawn scout/oracle |
| Implementation | "add", "implement", "create" | Route to /build workflow |
| Bug/issue | "fix", "broken", "failing", "debug" | Route to /fix workflow |
| Exploration | "understand", "explore", "how does X work" | Route to /explore |

## Workflow Suggestions

Detect and suggest appropriate workflows:

```
User: "Fix the auth bug and add tests"

Claude: "I detect a /fix workflow with 2 tasks:
  1. debug-agent → investigate
  2. spark → implement fix
  3. arbiter → add tests

  Proceed?"
```

## Main Context = Coordination Only

**Delegate to agents:**
- Reading 3+ files → scout
- External research → oracle
- Implementation → kraken/spark
- Running tests → validator/arbiter
- Debugging → debug-agent/sleuth

**Keep in main context:**
- Understanding user intent
- Workflow selection
- Agent coordination
- Presenting summaries

## Parallel Detection

When tasks are independent, spawn agents in parallel:

```
User: "Research auth patterns and check performance"

→ Detect: 2 independent tasks
→ Spawn: oracle + profiler (parallel)
→ Synthesize results
```

## Workflow Chaining

After completing a workflow, suggest the natural next step:

| After | Suggest |
|-------|---------|
| /explore | "Ready for /build brownfield?" |
| /plan | "Run /premortem before implementing?" |
| /fix | "Create /commit for the fix?" |
| Research complete | "Create plan from findings?" |

## Memory Check

Before research tasks, check for prior work:

```bash
# Quick memory check
(cd $CLAUDE_OPC_DIR && uv run python scripts/core/recall_learnings.py --query "<topic>" --k 3 --text-only)
```

If relevant memory found: "I researched this on [date] - reuse or refresh?"

## Don't Over-Delegate

Keep in main context when:
- Single simple question (just answer it)
- Quick file lookup (1-2 files)
- User explicitly wants direct response
- Latency matters more than context preservation
