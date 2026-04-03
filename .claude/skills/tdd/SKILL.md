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
test("retries failed operations 3 times", async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error("fail");
    return "success";
  };

  const result = await retryOperation(operation);

  expect(result).toBe("success");
  expect(attempts).toBe(3);
});
```

Clear name, tests real behavior, one thing.

**Bad:**

```typescript
test("retry works", async () => {
  const mock = jest
    .fn()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce("success");
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
  throw new Error("unreachable");
}
```

Just enough to pass.

**Bad:**

```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: "linear" | "exponential";
    onRetry?: (attempt: number) => void;
  },
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

| Excuse                                 | Reality                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------- |
| "Too simple to test"                   | Simple code breaks. Test takes 30 seconds.                              |
| "I'll test after"                      | Tests passing immediately prove nothing.                                |
| "Tests after achieve same goals"       | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested"              | Ad-hoc ≠ systematic. No record, can't re-run.                           |
| "Deleting X hours is wasteful"         | Sunk cost fallacy. Keeping unverified code is technical debt.           |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete.             |
| "Need to explore first"                | Fine. Throw away exploration, start with TDD.                           |
| "Test hard = design unclear"           | Listen to test. Hard to test = hard to use.                             |
| "TDD will slow me down"                | TDD faster than debugging. Pragmatic = test-first.                      |
| "Manual test faster"                   | Manual doesn't prove edge cases. You'll re-test every change.           |

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

| Problem                | Solution                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Don't know how to test | Write wished-for API. Write assertion first. Ask your human partner. |
| Test too complicated   | Design too complicated. Simplify interface.                          |
| Must mock everything   | Code too coupled. Use dependency injection.                          |
| Test setup huge        | Extract helpers. Still complex? Simplify design.                     |

---

# Workflow Execution

## Workflow Overview

```
┌────────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│   plan-    │───▶│ arbiter  │───▶│  kraken  │───▶│ arbiter  │
│   agent    │    │          │    │          │    │           │
└────────────┘    └──────────┘    └──────────┘    └───────────┘
   Design          Write           Implement        Verify
   approach        failing         minimal          all tests
                   tests           code             pass
```

## Agent Sequence

| #   | Agent          | Role                                          | Output         |
| --- | -------------- | --------------------------------------------- | -------------- |
| 1   | **plan-agent** | Design test cases and implementation approach | Test plan      |
| 2   | **arbiter**    | Write failing tests (RED phase)               | Test files     |
| 3   | **kraken**     | Implement minimal code to pass (GREEN phase)  | Implementation |
| 4   | **arbiter**    | Run all tests, verify nothing broken          | Test report    |

## Core Principle

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Each agent follows the TDD contract:

- arbiter writes tests that MUST fail initially
- kraken writes MINIMAL code to make tests pass
- arbiter confirms the full suite passes

## Execution

### Phase 1: Plan Test Cases

```
Task(
  subagent_type="plan-agent",
  prompt="""
  Design TDD approach for: [FEATURE_NAME]

  Define:
  1. What behaviors need to be tested
  2. Edge cases to cover
  3. Expected test structure

  DO NOT write any implementation code.
  Output: Test plan document
  """
)
```

### Phase 2: Write Failing Tests (RED)

```
Task(
  subagent_type="arbiter",
  prompt="""
  Write failing tests for: [FEATURE_NAME]

  Test plan: [from phase 1]

  Requirements:
  - Write tests FIRST
  - Run tests to confirm they FAIL
  - Tests must fail because feature is missing (not syntax errors)
  - Create clear test names describing expected behavior

  DO NOT write any implementation code.
  """
)
```

### Phase 3: Implement (GREEN)

```
Task(
  subagent_type="kraken",
  prompt="""
  Implement MINIMAL code to pass tests: [FEATURE_NAME]

  Tests location: [test file path]

  Requirements:
  - Write ONLY enough code to make tests pass
  - No additional features beyond what tests require
  - No "improvements" or "enhancements"
  - Run tests after each change

  Follow Red-Green-Refactor strictly.
  """
)
```

### Phase 4: Validate

```
Task(
  subagent_type="arbiter",
  prompt="""
  Validate TDD implementation: [FEATURE_NAME]

  - Run full test suite
  - Verify all new tests pass
  - Verify no existing tests broke
  - Check test coverage if available
  """
)
```

## TDD Rules Enforced

1. **arbiter** cannot write implementation code
2. **kraken** cannot add untested features
3. Tests must fail before implementation
4. Tests must pass after implementation

## Example

```
User: /tdd Add email validation to the signup form

Claude: Starting /tdd workflow for email validation...

Phase 1: Planning test cases...
[Spawns plan-agent]
Test plan:
- Valid email formats
- Invalid email formats
- Empty email rejection
- Edge cases (unicode, long emails)

Phase 2: Writing failing tests (RED)...
[Spawns arbiter]
✅ 8 tests written, all failing as expected

Phase 3: Implementing minimal code (GREEN)...
[Spawns kraken]
✅ All 8 tests now passing

Phase 4: Validating...
[Spawns arbiter]
✅ 247 tests passing (8 new), 0 failing

TDD workflow complete!
```

## Refactor Phase (Optional)

After GREEN, you can add a refactor phase:

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
