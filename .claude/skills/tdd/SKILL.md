---
name: tdd
description: Test-driven development workflow with philosophy guide - plan → write tests → implement → validate
metadata:
  keywords: [tdd, test-driven, test-first, red-green-refactor]
---

# /tdd - Test-Driven Development Workflow

Strict TDD workflow: tests first, then implementation.

## When to Use

- "Implement X using TDD"
- "Build this feature test-first"
- "Write tests for X then implement"
- Any feature where test coverage is critical
- Bug fixes that need regression tests

---

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over. No exceptions — no "reference", no "adapt it".

---

## Red-Green-Refactor

### RED — Write Failing Test

One minimal test, one behavior, clear name, real code (no mocks unless unavoidable).

```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await retryOperation(operation);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

**Watch it fail** — mandatory, never skip. Confirm it fails because the feature is missing (not a typo).

### GREEN — Minimal Code

Write the simplest code that passes the test. Nothing more.

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); }
    catch (e) { if (i === 2) throw e; }
  }
  throw new Error('unreachable');
}
```

Don't add features, refactor other code, or engineer beyond what the test requires.

**Watch it pass** — mandatory. Confirm no regressions.

### REFACTOR

After green only: remove duplication, improve names, extract helpers. Keep tests green. No new behavior.

---

## Vertical Slicing (Not Horizontal)

**Anti-pattern:** Write ALL tests → implement ALL → validate everything.

**Correct:** One behavior at a time — test it, implement it, verify it.

```
plan-agent  →  Decompose feature into behavior slices
     │
     ▼  (loop per slice)
arbiter (RED) → kraken (GREEN) → arbiter (VERIFY)
     │
     ▼
arbiter  →  Final full suite regression
```

### Why 1-3 Tests Per Slice

Amortizes agent launch overhead while keeping context tight. Group by **behavior**, not file:
- "Create action with valid input" → 1-2 tests (happy path + response shape)
- "Create action with missing fields" → 1-2 tests (validation errors)
- "Create action workspace isolation" → 1 test

---

## Agent Sequence

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **plan-agent** | Decompose into behavior slices | Ordered slice list |
| 2 | **arbiter** | Write 1-3 failing tests for ONE slice (RED) | Test file additions |
| 3 | **kraken** | Implement just enough to pass (GREEN) | Implementation |
| 4 | **arbiter** | Verify green + no regressions | Pass/fail |
| — | Repeat 2-4 | For each remaining slice | — |
| 5 | **arbiter** | Final full suite regression | Test report |

---

## Execution

### Phase 1: Decompose

```
Task(
  subagent_type="plan-agent",
  prompt="""
  Decompose into vertical behavior slices for TDD: [FEATURE_NAME]

  For each slice: specific behavior (one sentence), 1-3 test cases, expected implementation scope.
  Order: core behavior → edge cases → error handling.
  Each slice must be independently testable and implementable.

  DO NOT write any implementation code.
  Output: Ordered list of behavior slices with test cases.
  """
)
```

### Phase 2-4: Vertical Loop (per slice)

**RED — arbiter:**
```
Task(
  subagent_type="arbiter",
  prompt="""
  Write failing tests for behavior slice: [SLICE_DESCRIPTION]

  Context: [what was implemented in previous slices, if any]
  Test file: [path]

  - Write 1-3 tests for THIS behavior only
  - Run tests — confirm they FAIL (not error) because feature is missing
  - Test through public interface, not internal state

  DO NOT write any implementation code.
  """
)
```

**GREEN — kraken:**
```
Task(
  subagent_type="kraken",
  prompt="""
  Implement MINIMAL code to pass the new failing tests: [SLICE_DESCRIPTION]

  Tests location: [test file path]
  Previously passing tests: [count] — MUST stay green

  - ONLY enough code to make the new tests pass
  - No additional features beyond what tests require
  - Run tests after implementation
  """
)
```

**VERIFY — arbiter:**
```
Task(
  subagent_type="arbiter",
  prompt="""
  Verify slice: [SLICE_DESCRIPTION]

  - Run full test suite (not just new tests)
  - Report: [N new passing] / [M total passing] / [0 failing]
  """
)
```

### Phase 5: Final Regression

```
Task(
  subagent_type="arbiter",
  prompt="""
  Final TDD validation: [FEATURE_NAME]

  - Run complete test suite
  - Summary: total tests, new tests, pass/fail counts
  """
)
```

### Refactor Phase (Optional)

```
Task(
  subagent_type="kraken",
  prompt="""
  Refactor: [FEATURE_NAME]
  - Clean up while keeping tests green
  - Remove duplication, improve naming, extract helpers
  - DO NOT add new behavior
  """
)
```

---

## TDD Rules Enforced

1. **arbiter** cannot write implementation code
2. **kraken** cannot add untested features
3. Tests must fail before implementation
4. Tests must pass after EACH slice (not just at the end)
5. Test through public interface — see [references/deep-modules.md](references/deep-modules.md)
6. Mock at boundaries only — see [references/mocking-boundaries.md](references/mocking-boundaries.md)

---

## Mocking Doctrine (Summary)

Mock at **system boundaries** only — where your code meets the outside world.

| Mock This | Don't Mock This |
|-----------|-----------------|
| Network calls (fetch, HTTP) | Internal functions |
| External services (Anthropic SDK) | Drizzle query chains (new tests) |
| Filesystem, time, env vars | Utility helpers / type transformations |

**Litmus test:** If you changed the implementation without changing the behavior, would the test break? Yes → mocked too deep.

See [references/mocking-boundaries.md](references/mocking-boundaries.md) for the full decision table.

---

## Deep Modules (Summary)

Design modules with a **small interface** hiding **complex implementation**. Test through the interface.

| Layer | Test This |
|-------|-----------|
| MCP Tools | Zod schema in, structured result out |
| API Routes | HTTP request in, response out |
| Agent SDK | messages + config → SSE events |

See [references/deep-modules.md](references/deep-modules.md) for examples and the shallow module smell guide.

---

## Transition Strategy

- **New features:** Vertical slicing from day one
- **Existing tests (543+):** Don't rewrite. Apply vertical approach only when touching those files.
- **Existing Drizzle chain mocks:** Keep. New tests prefer interface-level verification.

---

## Example Run

```
User: /tdd Add email validation to the signup form

Phase 1: Decomposing...
Slices: 1) Valid formats accepted  2) Invalid formats rejected
        3) Empty/missing rejected  4) Edge cases (unicode, max length)

Slice 1: Valid email formats
  [arbiter] RED — 2 tests written, both failing ✓
  [kraken]  GREEN — basic validator, 2 tests pass ✓
  [arbiter] VERIFY — 249 total, 0 failing ✓

Slice 2-4: (same pattern)

Phase 5: Final regression
  [arbiter] 255 tests passing (8 new), 0 failing ✓
```

---

## Red Flags — Stop and Start Over

- Code written before test
- Test passes immediately (without implementation)
- Can't explain why test failed
- "I'll test after" / "already manually tested" / "keep as reference"

**All of these mean: Delete code. Start over.**

See [references/philosophy.md](references/philosophy.md) for the full rationalizations table and verification checklist.
