---
name: tdd
description: Test-driven development workflow with philosophy guide - plan → write tests → implement → validate
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

# TDD Philosophy

## Overview

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

**Violating the letter of the rules is violating the spirit of the rules.**

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. Period.

## Red-Green-Refactor

### RED - Write Failing Test

Write one minimal test showing what should happen.

**Good:**
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
Clear name, tests real behavior, one thing.

**Bad:**
```typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```
Vague name, tests mock not code.

**Requirements:**
- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

### Verify RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
# or
pytest path/to/test_file.py
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.
**Test errors?** Fix error, re-run until it fails correctly.

### GREEN - Minimal Code

Write simplest code to pass the test.

**Good:**
```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```
Just enough to pass.

**Bad:**
```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> {
  // YAGNI - over-engineered
}
```

Don't add features, refactor other code, or "improve" beyond the test.

### Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
npm test path/to/test.test.ts
```

Confirm:
- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.
**Other tests fail?** Fix now.

### REFACTOR - Clean Up

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |
| "Manual test faster" | Manual doesn't prove edge cases. You'll re-test every change. |

## Red Flags - STOP and Start Over

- Code before test
- Test after implementation
- Test passes immediately
- Can't explain why test failed
- Tests added "later"
- Rationalizing "just this once"
- "I already manually tested it"
- "Tests after achieve the same purpose"
- "Keep as reference" or "adapt existing code"

**All of these mean: Delete code. Start over with TDD.**

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output pristine (no errors, warnings)
- [ ] Tests use real code (mocks only if unavoidable)
- [ ] Edge cases and errors covered

Can't check all boxes? You skipped TDD. Start over.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. Ask your human partner. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

---

# Workflow Execution

## Vertical Slicing (Not Horizontal)

**Anti-pattern:** Write ALL tests first → implement ALL code → validate everything.
This loses context between writing and implementing, creates false confidence, and misses integration gaps.

**Correct pattern:** Slice by behavior. One behavior at a time: test it, implement it, verify it.

```
┌────────────┐
│ plan-agent │  Design behavior slices (1 per feature aspect)
└─────┬──────┘
      │
      ▼
┌─────────────────────────────────────────┐
│  LOOP per behavior slice (1-3 tests):   │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ arbiter  │─▶│  kraken  │─▶│verify │ │
│  │ RED      │  │ GREEN    │  │ green │ │
│  └──────────┘  └──────────┘  └───────┘ │
│                                         │
│  Repeat for next slice                  │
└─────────────────────────────────────────┘
      │
      ▼
┌──────────┐
│ arbiter  │  Final: full suite regression
└──────────┘
```

### Why 1-3 Tests Per Slice (Not Strict 1:1)

Amortizes agent launch overhead while keeping context tight. Group by **behavior**, not by file:
- "Create action with valid input" → 1-2 tests (happy path + response shape)
- "Create action with missing fields" → 1-2 tests (validation errors)
- "Create action workspace isolation" → 1 test (can't see other workspace's data)

### Why Not All Tests First

| Problem | Consequence |
|---------|-------------|
| Context loss | By test #15, you've forgotten test #3's intent |
| False confidence | "All tests written!" — but they don't integrate |
| Scope creep | Tests imagine features beyond actual requirements |
| Debugging pain | 20 failures at once vs 2 at a time |

## Agent Sequence

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **plan-agent** | Decompose feature into behavior slices | Ordered slice list |
| 2 | **arbiter** | Write 1-3 failing tests for ONE slice (RED) | Test file additions |
| 3 | **kraken** | Implement JUST enough to pass those tests (GREEN) | Implementation |
| 4 | **arbiter** | Verify green + no regressions | Pass/fail |
| — | Repeat 2-4 | For each remaining slice | — |
| 5 | **arbiter** | Final full suite regression | Test report |

## Core Principle

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Each agent follows the TDD contract:
- arbiter writes tests that MUST fail initially
- kraken writes MINIMAL code to make tests pass
- arbiter confirms green after each slice (not just at the end)

## Execution

### Phase 1: Decompose Into Behavior Slices

```
Task(
  subagent_type="plan-agent",
  prompt="""
  Decompose into vertical behavior slices for TDD: [FEATURE_NAME]

  For each slice, define:
  1. The specific behavior (one sentence)
  2. 1-3 test cases for that behavior
  3. Expected implementation scope

  Order slices from core behavior → edge cases → error handling.
  Each slice should be independently testable and implementable.

  DO NOT write any implementation code.
  Output: Ordered list of behavior slices with test cases.
  """
)
```

### Phase 2-4: Vertical Loop (Per Slice)

For EACH behavior slice from the plan:

**RED — arbiter writes 1-3 tests:**
```
Task(
  subagent_type="arbiter",
  prompt="""
  Write failing tests for behavior slice: [SLICE_DESCRIPTION]

  Context: [what was implemented in previous slices, if any]
  Test file: [path]

  Requirements:
  - Write 1-3 tests for THIS behavior only
  - Run tests to confirm they FAIL
  - Tests must fail because feature is missing (not syntax errors)
  - Test through public interface, not internal state

  DO NOT write any implementation code.
  """
)
```

**GREEN — kraken implements just enough:**
```
Task(
  subagent_type="kraken",
  prompt="""
  Implement MINIMAL code to pass the new failing tests: [SLICE_DESCRIPTION]

  Tests location: [test file path]
  Previously passing tests: [count] — these MUST stay green

  Requirements:
  - Write ONLY enough code to make the new tests pass
  - Do not break any previously passing tests
  - No additional features beyond what tests require
  - Run tests after implementation

  Follow Red-Green-Refactor strictly.
  """
)
```

**VERIFY — arbiter confirms green:**
```
Task(
  subagent_type="arbiter",
  prompt="""
  Verify slice implementation: [SLICE_DESCRIPTION]

  - Run full test suite (not just new tests)
  - Confirm new tests pass
  - Confirm no regressions in existing tests
  - Report: [N new passing] / [M total passing] / [0 failing]
  """
)
```

Repeat for each remaining slice.

### Phase 5: Final Regression

```
Task(
  subagent_type="arbiter",
  prompt="""
  Final TDD validation: [FEATURE_NAME]

  - Run complete test suite
  - Verify all new tests pass
  - Verify no existing tests broke
  - Summary: total tests, new tests, pass/fail counts
  """
)
```

## TDD Rules Enforced

1. **arbiter** cannot write implementation code
2. **kraken** cannot add untested features
3. Tests must fail before implementation
4. Tests must pass after EACH slice (not just at the end)
5. Test through public interface — see [deep-modules.md](deep-modules.md)
6. Mock at boundaries only — see [mocking-boundaries.md](mocking-boundaries.md)

## Example

```
User: /tdd Add email validation to the signup form

Claude: Starting /tdd workflow for email validation...

Phase 1: Decomposing into behavior slices...
[Spawns plan-agent]
Slices:
1. Valid email formats accepted
2. Invalid email formats rejected
3. Empty/missing email rejected
4. Edge cases (unicode, max length)

Slice 1: Valid email formats
[arbiter] RED — 2 tests written, both failing ✓
[kraken] GREEN — basic validator, 2 tests pass ✓
[arbiter] VERIFY — 249 total, 0 failing ✓

Slice 2: Invalid email formats rejected
[arbiter] RED — 3 tests written, all failing ✓
[kraken] GREEN — added rejection logic, 3 tests pass ✓
[arbiter] VERIFY — 252 total, 0 failing ✓

Slice 3: Empty/missing email rejected
[arbiter] RED — 1 test written, failing ✓
[kraken] GREEN — added empty check, 1 test passes ✓
[arbiter] VERIFY — 253 total, 0 failing ✓

Slice 4: Edge cases
[arbiter] RED — 2 tests written, both failing ✓
[kraken] GREEN — unicode + length handling, 2 tests pass ✓
[arbiter] VERIFY — 255 total, 0 failing ✓

Phase 5: Final regression...
[arbiter] ✅ 255 tests passing (8 new), 0 failing

TDD workflow complete!
```

## Refactor Phase (Optional)

After all slices are green, you can add a refactor phase:

```
Task(
  subagent_type="kraken",
  prompt="""
  Refactor: [FEATURE_NAME]

  - Clean up code while keeping tests green
  - Remove duplication
  - Improve naming
  - Extract helpers if needed

  DO NOT add new behavior. Keep all tests passing.
  """
)
```

## Transition Strategy

- **New features:** Vertical slicing from day one
- **Existing tests (543+):** Don't rewrite. Apply vertical approach only when touching those files.
- **Existing Drizzle chain mocks:** Keep. New tests prefer interface-level verification.

---

# Mocking Doctrine

Mock at **system boundaries** — where your code meets the outside world. Don't mock your own internals.

| Mock This | Don't Mock This |
|-----------|-----------------|
| Network calls (fetch, HTTP) | Internal functions |
| External services (Anthropic SDK) | Drizzle query chains (new tests) |
| Filesystem, time | Utility helpers |
| Environment variables | Type transformations |

**Key question:** If you changed the implementation without changing the behavior, would the test break? If yes, you mocked too deep.

**Grandfather clause:** Existing Drizzle chain mocks stay. New tests prefer testing response shape over query internals.

See [mocking-boundaries.md](mocking-boundaries.md) for the full decision table and Workbook-specific guidance.

---

# Deep Modules

Design modules with a **small interface** hiding **complex implementation**. Test through the interface.

| Layer | Interface | Implementation |
|-------|-----------|----------------|
| MCP Tools | Zod schema (name + params) | DB queries, scoping, formatting |
| API Routes | HTTP request/response | Auth, validation, DB ops |
| Agent SDK | messages + config → SSE events | MCP server, streaming, cost tracking |

**Testing implication:** Test what goes in and what comes out. Don't test the plumbing between.

See [deep-modules.md](deep-modules.md) for examples and the shallow module smell guide.
