---
name: reference-sdk
description: Check reference SDK implementations using btca ask
user-invocable: false
---

# Reference SDK Check

When implementing SDK features or debugging provider-specific issues, check reference implementations.

## When to Use

- Implementing SDK features
- Debugging provider-specific issues
- Understanding how other libraries solve similar problems
- "How does Vercel AI SDK do X?"
- "Check Anthropic SDK for Y"

## Commands

Use `btca ask` to check how reference SDKs implement similar features:

```bash
# Check Vercel AI SDK for streaming patterns
btca ask -r vercel-ai -q "How does streamObject work?"

# Check Anthropic SDK for tool calling
btca ask -r anthropic-sdk -q "How are tools defined and called?"

# Check Zod for validation patterns
btca ask -r zod -q "How does safeParse handle errors?"
```

## Configured Resources

- `vercel-ai` - Streaming, tool calling, structured output
- `anthropic-sdk` - Anthropic API patterns
- `zod` - Schema validation

Add more: `btca config resources add -n <name> -t git -u <url> -b <branch>`

## When to Check

1. **Before implementing** - See how others solved similar problems
2. **When debugging** - Find how reference code handles edge cases
3. **Multi-provider support** - Compare implementations across SDKs
4. **Validation patterns** - Check idiomatic approaches

## Don't Use For

- Documentation lookups (use /nia-docs instead)
- Simple API questions (use WebSearch)
- Project-specific patterns (use Grep/Glob)
