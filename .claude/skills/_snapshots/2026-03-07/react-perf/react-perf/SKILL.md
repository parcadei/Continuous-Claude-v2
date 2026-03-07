---
name: react-perf
description: React/Next.js performance optimization - 45 rules from Vercel engineering
user-invocable: true
allowed-tools: [Read, Grep, Glob, Bash, Task]
---

# React Performance Audit

45 performance rules organized by priority. Apply during code reviews, component writing, or optimization tasks.

## Activation

| Trigger | Context |
|---------|---------|
| `/react-perf` | Run full audit |
| `/review --react` | Performance-focused review |
| "React performance" | Suggest this skill |
| "optimize Next.js" | Suggest this skill |
| "bundle size" | Suggest this skill |
| "waterfall issue" | Suggest this skill |

---

## Priority 1: CRITICAL - Eliminating Waterfalls

Sequential operations that block rendering. **Block PR if found.**

### async-parallel-data
**Rule**: Fetch independent data in parallel, not sequentially.

```typescript
// BAD - Sequential waterfall
const user = await getUser()
const posts = await getPosts()

// GOOD - Parallel execution
const [user, posts] = await Promise.all([getUser(), getPosts()])
```

### async-strategic-await
**Rule**: Only await when you need the result. Start fetches early.

```typescript
// BAD - Awaiting too early
const data = await fetchData()  // blocks here
doOtherStuff()

// GOOD - Start early, await late
const dataPromise = fetchData()  // starts immediately
doOtherStuff()
const data = await dataPromise   // await when needed
```

### async-suspense-boundaries
**Rule**: Use Suspense boundaries to prevent parent waterfalls.

```tsx
// BAD - No Suspense, entire page blocks
<Page>
  <SlowComponent />
</Page>

// GOOD - Independent streaming
<Page>
  <Suspense fallback={<Skeleton />}>
    <SlowComponent />
  </Suspense>
</Page>
```

### async-server-components
**Rule**: Prefer Server Components for data fetching. Colocate fetch with render.

### async-streaming
**Rule**: Use loading.tsx and streaming for long operations.

### async-prefetch
**Rule**: Prefetch data for likely navigation (router.prefetch, Link prefetch).

### async-dedup
**Rule**: Use React cache() or fetch deduplication for repeated requests.

### async-waterfall-detection
**Rule**: Use React DevTools or Server Timing headers to detect waterfalls.

---

## Priority 2: CRITICAL - Bundle Size Optimization

Large bundles delay Time to Interactive. **Block PR if bundle grows >10%.**

### bundle-direct-imports
**Rule**: Import specific modules, not entire packages.

```typescript
// BAD - Imports entire lodash (~70KB)
import _ from 'lodash'
_.debounce()

// GOOD - Imports only debounce (~2KB)
import debounce from 'lodash/debounce'
```

### bundle-dynamic-imports
**Rule**: Lazy load components not needed on initial render.

```tsx
// BAD - Loads modal with page
import HeavyModal from './HeavyModal'

// GOOD - Loads modal when needed
const HeavyModal = dynamic(() => import('./HeavyModal'))
```

### bundle-defer-third-party
**Rule**: Defer non-critical third-party scripts (analytics, chat).

```tsx
// Use next/script with strategy
<Script src="analytics.js" strategy="lazyOnload" />
```

### bundle-tree-shaking
**Rule**: Ensure packages support tree-shaking. Check sideEffects in package.json.

### bundle-conditional-loading
**Rule**: Use next/dynamic with ssr: false for client-only heavy components.

### bundle-analyze
**Rule**: Regularly run `next build --analyze` to identify bloat.

### bundle-code-splitting
**Rule**: Split routes and features into separate chunks.

---

## Priority 3: HIGH - Server-Side Performance

Server rendering efficiency. **Require justification to skip.**

### server-request-cache
**Rule**: Cache expensive operations per-request with React cache().

```typescript
import { cache } from 'react'

const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
```

### server-cross-request-cache
**Rule**: Use unstable_cache for data shared across requests.

### server-minimize-serialization
**Rule**: Don't serialize large objects to client. Process on server.

### server-parallel-fetch
**Rule**: Start all fetches before any await in Server Components.

### server-streaming
**Rule**: Return partial HTML fast, stream the rest.

### server-edge-rendering
**Rule**: Use Edge Runtime for latency-sensitive pages.

---

## Priority 4: MEDIUM-HIGH - Client-Side Data Fetching

SWR, React Query, and client fetching patterns.

### client-deduplication
**Rule**: Use SWR/React Query for automatic request deduplication.

### client-stale-while-revalidate
**Rule**: Show stale data immediately, revalidate in background.

### client-optimistic-updates
**Rule**: Update UI optimistically, rollback on error.

### client-listener-cleanup
**Rule**: Clean up subscriptions and listeners in useEffect return.

---

## Priority 5: MEDIUM - Re-render Optimization

Prevent unnecessary component re-renders.

### rerender-memo-callbacks
**Rule**: Memoize callbacks passed to children with useCallback.

```tsx
// BAD - New function every render
<Child onClick={() => handleClick(id)} />

// GOOD - Stable reference
const handleClickMemo = useCallback(() => handleClick(id), [id])
<Child onClick={handleClickMemo} />
```

### rerender-memo-values
**Rule**: Memoize expensive computations with useMemo.

### rerender-memo-components
**Rule**: Use React.memo() for pure components receiving callbacks.

### rerender-state-colocation
**Rule**: Keep state close to where it's used. Lift only when necessary.

### rerender-context-splitting
**Rule**: Split contexts to prevent unrelated re-renders.

### rerender-transitions
**Rule**: Use useTransition for non-urgent updates.

### rerender-deferred-values
**Rule**: Use useDeferredValue for expensive derived state.

### rerender-key-optimization
**Rule**: Use stable keys, not array indices, for lists.

---

## Priority 6: MEDIUM - Rendering Performance

Visual rendering optimization.

### rendering-css-transforms
**Rule**: Animate only transform and opacity. Use will-change sparingly.

### rendering-svg-optimization
**Rule**: Simplify SVG paths. Use SVGO or svgomg.

### rendering-conditional
**Rule**: Render nothing (null) vs hidden (display:none) appropriately.

### rendering-virtualization
**Rule**: Virtualize lists >50 items with react-window or react-virtual.

### rendering-image-optimization
**Rule**: Use next/image with proper width/height and priority.

### rendering-font-loading
**Rule**: Use next/font for zero-CLS font loading.

---

## Priority 7: LOW-MEDIUM - JavaScript Performance

Micro-optimizations. Lower priority.

### js-memoize-expensive
**Rule**: Cache expensive pure functions with memoization.

### js-data-structures
**Rule**: Use Map/Set for frequent lookups instead of arrays.

### js-batch-dom
**Rule**: Batch DOM reads/writes to avoid layout thrashing.

### js-web-workers
**Rule**: Offload heavy computation to Web Workers.

---

## Priority 8: LOW - Advanced Patterns

Ref-based optimizations.

### advanced-ref-callbacks
**Rule**: Use refs for stable callbacks in effects.

```typescript
const latestCallback = useRef(callback)
latestCallback.current = callback

useEffect(() => {
  return subscribe(() => latestCallback.current())
}, []) // Never re-subscribes
```

### advanced-ref-latest-value
**Rule**: Use refs to access latest values without re-running effects.

---

## Audit Workflow

```yaml
1. Structure: tldr structure . --lang typescript
2. Bundle: next build --analyze (if Next.js)
3. Waterfalls: Check for sequential awaits
4. Imports: Check for barrel imports
5. Components: Check memoization patterns
6. Report: Categorize by priority
```

## Output Format

```markdown
## React Performance Audit

### CRITICAL (Block)
- [file:line] Rule: async-parallel-data - Sequential awaits found

### HIGH (Fix Required)
- [file:line] Rule: server-request-cache - Missing cache() wrapper

### MEDIUM (Should Fix)
- [file:line] Rule: rerender-memo-callbacks - Unstable callback prop

### LOW (Consider)
- [file:line] Rule: js-data-structures - Array lookup could be Map

### Summary
[X] Critical | [Y] High | [Z] Medium | [W] Low
Recommendation: [APPROVE/CHANGES_REQUESTED/BLOCK]
```

---

## Integration

- **With /review**: Use `--react` flag
- **With agents**: Spawns react-perf-reviewer
- **Auto-trigger**: .tsx file reads via hook
- **Store findings**: Memory system for recurring issues

---
*Source: Vercel Engineering React Best Practices | 45 rules | v1.0*
