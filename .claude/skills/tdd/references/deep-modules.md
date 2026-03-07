# Deep Modules

A deep module has a **small, simple interface** that hides a **complex implementation**. The caller doesn't need to know how it works — just what it does.

> "The best modules are those whose interfaces are much simpler than their implementations."
> — John Ousterhout, *A Philosophy of Software Design*

## The Principle

```
┌──────────────────────────┐
│    Simple Interface      │  ← Small surface area (few params, clear contract)
├──────────────────────────┤
│                          │
│   Complex Implementation │  ← Validation, error handling, DB queries,
│                          │     caching, retries, logging — all hidden
│                          │
└──────────────────────────┘
```

**Deep:** Small interface, lots of functionality behind it.
**Shallow:** Large interface, little functionality behind it. Every method does one tiny thing. Caller must orchestrate.

## Why It Matters for Testing

Deep modules are **easier to test correctly** because:

1. **Small interface = few test cases** — test the contract, not the internals
2. **Complex implementation changes don't break tests** — implementation is hidden
3. **Tests read like specifications** — "given X input, expect Y output"

Shallow modules force tests to **choreograph internal calls**, which breaks when implementation changes.

## Workbook Examples

### MCP Tools — Natural Deep Modules

Each MCP tool in `mcp-tools.ts` is already a deep module:

```
Interface:  Zod schema (tool name + input params)
Implementation:  DB queries, workspace scoping, result formatting, error handling
```

**Test the interface:**
```typescript
// Deep — tests the contract
const result = await executeToolCall('query_meetings', {
  query: 'standup',
  limit: 5
}, workspaceId);

expect(result.meetings).toHaveLength(expected);
expect(result.meetings[0]).toHaveProperty('title');
```

**Don't test the plumbing:**
```typescript
// Shallow — tests implementation details
expect(mockDb.select).toHaveBeenCalled();
expect(mockWhere).toHaveBeenCalledWith(/* drizzle expression */);
expect(mockOrderBy).toHaveBeenCalledWith(/* drizzle expression */);
```

### API Routes — Request In, Response Out

Routes are deep modules with HTTP as the interface:

```
Interface:  Request (method, headers, body)
Implementation:  Auth, validation, workspace resolution, DB ops, formatting
```

**Test depth:**
```typescript
const req = new NextRequest('http://localhost/api/actions', {
  method: 'POST',
  body: JSON.stringify({ title: 'Review Q4 metrics' }),
  headers: { 'x-workspace-slug': 'ops' }
});

const res = await POST(req);
const data = await res.json();

expect(res.status).toBe(201);
expect(data.action.title).toBe('Review Q4 metrics');
```

### Agent SDK Wrapper — `runSdkAgent()`

```
Interface:  { messages, workspaceId, agentMode, conversationId }
Implementation:  MCP server creation, tool injection, session resume, SSE streaming,
                 timeout handling, error recovery, cost tracking
```

The caller sends messages and gets SSE events back. Everything else is hidden.

## Recognizing Shallow Modules

| Smell | Example | Fix |
|-------|---------|-----|
| Lots of tiny helpers | `getWhere()`, `buildOrderBy()`, `formatResult()` all exposed | Combine into one deep function |
| Caller must call in sequence | `init() → configure() → execute() → cleanup()` | Single `run()` with options |
| Test requires 5+ mocks | Mock every internal function call | Test through the outer interface |
| Interface mirrors implementation | Every DB column has a getter method | Expose query result shape instead |

## Design Heuristic

When designing a new module, ask:

1. **What does the caller need to know?** → That's your interface.
2. **What can the caller ignore?** → That's your implementation.
3. **If you changed the implementation, would the caller notice?** → If yes, interface is too leaky.

## Relationship to Mocking

Deep modules and mocking boundaries reinforce each other:

- **Deep module** = test through the interface → fewer mocks needed
- **Shallow module** = must mock internals → brittle tests
- See [mocking-boundaries.md](mocking-boundaries.md) for the mock decision table
