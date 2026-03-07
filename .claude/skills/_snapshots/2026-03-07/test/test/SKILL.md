---
name: test
description: Comprehensive testing workflow - unit tests ∥ integration tests → E2E tests
---

# /test - Testing Workflow

Run comprehensive test suite with parallel execution.

## When to Use

- "Run all tests"
- "Test the feature"
- "Verify everything works"
- "Full test suite"
- Before releases or merges
- After major changes

## Workflow Overview

```
┌─────────────┐      ┌───────────┐
│ diagnostics │ ──▶  │ arbiter  │ ─┐
│ (type check)│      │ (unit)    │  │
└─────────────┘      └───────────┘  │
                                    ├──▶ ┌─────────┐
                     ┌───────────┐  │    │  atlas  │
                     │  arbiter  │ ─┘    │ (e2e)   │
                     │ (integ)   │       └─────────┘
                     └───────────┘

  Pre-flight         Parallel              Sequential
  (~1 second)        fast tests            slow tests
```

## Agent Sequence

| # | Agent | Role | Execution |
|---|-------|------|-----------|
| 1 | **arbiter** | Unit tests, type checks, linting | Parallel |
| 1 | **arbiter** | Integration tests | Parallel |
| 2 | **atlas** | E2E/acceptance tests | After 1 passes |

## Why This Order?

1. **Fast feedback**: Unit tests fail fast
2. **Parallel efficiency**: No dependency between unit and integration
3. **E2E gating**: Only run slow E2E tests if faster tests pass

## Execution

### Phase 0: Pre-flight Diagnostics (NEW)

Before running tests, check for type errors - they often cause test failures:

```bash
tldr diagnostics . --project --format text 2>/dev/null | grep "^E " | head -10
```

**Why diagnostics first?**
- Type check is instant (~1s), tests take longer
- Diagnostics show ROOT CAUSE, tests show symptoms
- "Expected int, got str" is clearer than "AttributeError at line 50"
- Catches errors in untested code paths

**If errors found:** Fix them BEFORE running tests. Type errors usually mean tests will fail anyway.

**If clean:** Proceed to Phase 1.

### Phase 0.5: Change Impact (Optional)

For large test suites, find only affected tests:

```bash
tldr change-impact --session
# or for explicit files:
tldr change-impact src/changed_file.py
```

This returns which tests to run based on what changed. Skip this for small projects or when you want full coverage.

### Phase 1: Parallel Tests

```
# Run both in parallel
Task(
  subagent_type="arbiter",
  prompt="""
  Run unit tests for: [SCOPE]

  Include:
  - Unit tests
  - Type checking
  - Linting

  Report: Pass/fail count, failures detail
  """,
  run_in_background=true
)

Task(
  subagent_type="arbiter",
  prompt="""
  Run integration tests for: [SCOPE]

  Include:
  - Integration tests
  - API tests
  - Database tests

  Report: Pass/fail count, failures detail
  """,
  run_in_background=true
)

# Wait for both
[Check TaskOutput for both]
```

### Phase 2: E2E Tests (If Phase 1 Passes)

```
Task(
  subagent_type="atlas",
  prompt="""
  Run E2E tests for: [SCOPE]

  Include:
  - End-to-end flows
  - Acceptance tests
  - UI tests if applicable

  Report: Pass/fail count, screenshots on failure
  """
)
```

## Test Scopes

### Full Suite
```
User: /test
→ All unit + integration + E2E tests
```

### Feature Scope
```
User: /test authentication
→ Only auth-related tests
```

### Quick Check
```
User: /test --quick
→ Only unit tests (skip integration and E2E)
```

## Example

```
User: /test the new payment feature

Claude: Starting /test workflow for payment feature...

Phase 0: Pre-flight diagnostics...
$ tldr diagnostics . --project --format text | grep "^E "
(no type errors found)

Phase 1: Running parallel tests...
┌─────────────────────────────────────────┐
│ arbiter: Running unit tests...          │
│ arbiter: Running integration tests...   │
└─────────────────────────────────────────┘

arbiter: ✅ 45/45 unit tests passing
arbiter: ✅ 12/12 integration tests passing

Phase 2: Running E2E tests...
atlas: ✅ 8/8 E2E tests passing

Test Summary:
┌─────────────┬─────────┬────────┐
│ Type        │ Passed  │ Failed │
├─────────────┼─────────┼────────┤
│ Unit        │ 45      │ 0      │
│ Integration │ 12      │ 0      │
│ E2E         │ 8       │ 0      │
├─────────────┼─────────┼────────┤
│ TOTAL       │ 65      │ 0      │
└─────────────┴─────────┴────────┘

All tests passing! ✅
```

### Example with Type Errors

```
User: /test

Claude: Starting /test workflow...

Phase 0: Pre-flight diagnostics...
$ tldr diagnostics . --project --format text | grep "^E "
E src/payment.py:45:12: Argument of type 'str' not assignable to 'int'
E src/refund.py:23:8: Return type 'None' not assignable to 'float'

Found 2 type errors. Fixing before running tests...

[Claude fixes the type errors]

Re-running diagnostics... clean.

Phase 1: Running parallel tests...
```

## Failure Handling

If Phase 1 fails:
```
arbiter: ❌ 43/45 tests passing

2 failures:
- test_payment_validation: expected 'invalid' got 'valid'
- test_refund_calculation: off by $0.01

Stopping workflow. Fix failures before running E2E tests.
```

## Flags

- `--quick`: Unit tests only
- `--no-e2e`: Skip E2E tests
- `--coverage`: Include coverage report
- `--watch`: Re-run on file changes
