# Proactive Memory Disclosure

When the memory-awareness hook finds relevant learnings (indicated by `MEMORY MATCH` in system context), follow this protocol:

## 1. Acknowledge to User

If memories seem relevant to the current task, briefly mention them:

```
"I found some relevant memories from past sessions about [topic]..."
```

## 2. Use the Context

Apply insights from recalled memories without requiring explicit `/recall`:

- Past solutions that worked
- Approaches that failed (avoid repeating)
- Architectural decisions already made

## 3. Offer Deep Recall

If the preview seems highly relevant, offer to show more:

```
"Would you like me to pull up the full context from when we worked on [similar task]?"
```

## 4. Don't Over-Mention

- Only disclose if memories are clearly relevant
- Don't mention every memory match (noise)
- Skip disclosure for generic matches (e.g., "test data")

## Examples

**Good disclosure:**

> User: "How do I fix this hook error?"
> Claude: "I recall from a previous session that hook errors often come from path issues. Let me check if that applies here..."

**Over-disclosure (avoid):**

> User: "Fix the bug"
> Claude: "I found 3 memories about bugs. Memory 1 says... Memory 2 says..." (too much)

**No disclosure needed:**

> Memory match is just test data or unrelated backfill entries
