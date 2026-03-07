# Mocking Boundaries

Mock at **system boundaries** — where your code meets the outside world. Never mock internal implementation details.

## Where to Mock

| Boundary | Example | Why |
|----------|---------|-----|
| Network | `fetch`, HTTP clients, WebSocket | External service you don't control |
| Database driver | `@neondatabase/serverless` | I/O boundary |
| Filesystem | `fs.readFile`, temp files | Side effects |
| Time | `Date.now()`, `setTimeout` | Non-deterministic |
| External services | Anthropic SDK, `query()` | Third-party API |
| Environment | `process.env` | Runtime configuration |

## Where NOT to Mock

| Internal | Example | Why |
|----------|---------|-----|
| Your own functions | `getWorkspaceId()`, `sanitizeLikeInput()` | Tests should exercise real logic |
| Drizzle query chains | `mockSelect → mockFrom → mockWhere` | Implementation detail — chains change, tests break |
| Utility helpers | Date formatters, string sanitizers | Pure functions — just call them |
| Type transformations | Drizzle `$inferSelect` mappings | No behavior to mock |

## The Litmus Test

> If you changed the implementation without changing the behavior, would the test break?

**Yes → you mocked too deep.** Test through the public interface instead.

## Workbook-Specific Guidance

### API Route Tests

**Prefer:** Test the route's HTTP response shape.
```typescript
// Good — tests behavior
const response = await POST(request);
const data = await response.json();
expect(data.actions).toHaveLength(2);
expect(data.actions[0]).toHaveProperty('title');
```

**Avoid:** Testing which Drizzle methods were called.
```typescript
// Brittle — tests implementation
expect(mockWhere).toHaveBeenCalledWith(
  expect.objectContaining({ workspaceId: 'ws-1' })
);
```

### MCP Tool Tests

MCP tools have a natural boundary: **Zod schema in, structured result out.**

```typescript
// Test the tool's return shape, not how it queries
const result = await executeToolCall('query_meetings', { query: 'standup' }, workspaceId);
expect(result).toMatchObject({
  meetings: expect.arrayContaining([
    expect.objectContaining({ title: expect.any(String) })
  ])
});
```

### Agent SDK Tests

The Agent SDK `query()` call is a true system boundary — mock it freely:
```typescript
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn().mockResolvedValue({ /* SSE events */ })
}));
```

### When `vi.mock('@/lib/api-utils')` IS Appropriate

Mock shared utilities **only** when:
- Testing a route's error handling when `getWorkspaceId()` returns null
- Isolating a specific code path that depends on the utility's return value
- The utility itself has its own dedicated test file

Don't mock them just because the import exists.

## Grandfather Clause

Existing Drizzle chain mocks (the `mockSelect → mockFrom → mockWhere → mockOrderBy → mockLimit` pattern) stay as-is. They work, they're tested, they cover 543 tests.

**For new tests:** prefer interface-level verification (test response shape, not query internals). Migrate existing mocks only when already touching those test files for other reasons.

## Decision Table

| Scenario | Mock? | How |
|----------|-------|-----|
| Route returns wrong data | No mock needed | Call route, assert response JSON |
| Route handles missing workspace | Mock `getWorkspaceId` → null | Test error path |
| Tool queries database | Mock at DB driver level | Or use test fixtures |
| Agent SDK call | Mock `query()` | System boundary |
| Pure utility function | Don't mock | Call directly, assert output |
| Drizzle chain (existing test) | Keep existing mock | Grandfather clause |
| Drizzle chain (new test) | Prefer response-level | Test what comes back, not how |
