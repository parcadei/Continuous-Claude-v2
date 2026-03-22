# Memory Usage Guidelines

Manual stores should be rare and high-value. 98% of entries are auto-extracted by hooks — only store manually when you have a genuine insight that won't be captured automatically.

**L0 quality gate:** The extraction pipeline auto-blocks NOISE entries (quality score <3) before they reach PostgreSQL. If a learning doesn't appear in recall, the quality scorer may have filtered it -- this is intentional.

## DO Store Manually

| Situation | Type |
|-----------|------|
| Bug fixed after 3+ attempts or across multiple files | `ERROR_FIX` |
| Architectural decision: chose X over Y with reasoning | `ARCHITECTURAL_DECISION` |
| Recurring codebase pattern discovered | `CODEBASE_PATTERN` |
| Approach that failed — don't repeat it | `FAILED_APPROACH` |
| User corrects a behavior or states a preference | `USER_PREFERENCE` |
| Windows-specific gotcha with a concrete workaround | `WORKING_SOLUTION` |

## DO NOT Store

- Trivial fixes (<3 lines, obvious solution)
- Information already in CLAUDE.md, RULES.md, or any `.claude/rules/` file
- Generic programming knowledge (everyone knows)
- Test data or verification entries
- Session status updates ("started working on X")
- Plan fragments or task lists (use task files instead)

## Quality Bar

**GOOD** — specific, actionable, non-obvious:
```
Type: ERROR_FIX
Content: "Hook context injection fails with PreToolUse — additionalContext is ignored.
         Use PostToolUse with hookSpecificOutput.additionalContext instead.
         Confirmed in: path-rules-hook-fix, react-perf-hook-fix."
Tags: hooks,context-injection,scope:global
Confidence: high
```

**BAD** — generic, no actionable insight:
```
Type: CODEBASE_PATTERN
Content: "The project uses TypeScript"
Tags: typescript
Confidence: medium
```

Ask before storing: "Would a future session actually benefit from this, or can they find it in 10 seconds?"

## Recall Before Storing

Always check for duplicates first:
```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/recall_learnings.py \
  --query "<topic>" --k 3 --text-only
```

If a similar entry exists at high confidence, skip the store.

## Store Command

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/store_learning.py \
  --session-id "<task-identifier>" \
  --type <TYPE> \
  --content "<what you learned>" \
  --context "<what it relates to>" \
  --tags "tag1,tag2,scope:global|scope:project" \
  --confidence high|medium|low
```

| Type | Use For |
|------|---------|
| `WORKING_SOLUTION` | Fix or approach that worked |
| `ERROR_FIX` | How a specific error was resolved |
| `CODEBASE_PATTERN` | Recurring structure in this codebase |
| `FAILED_APPROACH` | What didn't work (avoid repeating) |
| `ARCHITECTURAL_DECISION` | Design choice with rationale |
| `USER_PREFERENCE` | User's stated preferences |

Use `/remember` skill for interactive storage. Use `/memory-curate` to audit and prune low-value entries.
