---
name: refactor
description: Code refactoring workflow - analyze → plan → implement → review → validate
---

# /refactor - Refactoring Workflow

Safe refactoring with review gates.

## When to Use

- "Refactor X"
- "Clean up this code"
- "Extract this into a module"
- "Improve the architecture of Y"
- Large-scale code restructuring
- Technical debt reduction

## Workflow Overview

```
┌──────────┐    ┌────────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│ phoenix  │───▶│   plan-    │───▶│  kraken  │───▶│plan-reviewer│───▶│ arbiter  │
│          │    │   agent    │    │          │    │          │    │           │
└──────────┘    └────────────┘    └──────────┘    └──────────┘    └───────────┘
  Analyze         Plan             Implement       Review          Verify
  current         changes          refactor        changes         tests pass
```

## Agent Sequence

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **phoenix** | Analyze current code, identify improvement areas | Analysis report |
| 2 | **plan-agent** | Create safe refactoring plan | Step-by-step plan |
| 3 | **kraken** | Implement the refactoring | Code changes |
| 4 | **plan-reviewer** | Review changes for correctness | Review report |
| 5 | **arbiter** | Verify all tests still pass | Test report |

## Refactoring Principles

1. **Tests first**: Ensure adequate test coverage before refactoring
2. **Small steps**: Each change should be independently verifiable
3. **Behavior preserved**: No functional changes during refactor
4. **Reviewable**: Changes should be easy to review

## Execution

### Phase 1: Analyze

```
Task(
  subagent_type="phoenix",
  prompt="""
  Analyze for refactoring: [TARGET_CODE]

  Identify:
  - Current pain points
  - Code smells
  - Improvement opportunities
  - Risk areas
  - Test coverage gaps
  """
)
```

### Phase 2: Plan

```
Task(
  subagent_type="plan-agent",
  prompt="""
  Plan refactoring: [TARGET_CODE]

  Analysis: [from phoenix]

  Create:
  - Step-by-step refactoring plan
  - Each step should be:
    - Small and focused
    - Independently testable
    - Reversible
  - Identify files affected
  - Risk mitigation strategy
  """
)
```

### Phase 3: Implement

```
Task(
  subagent_type="kraken",
  prompt="""
  Implement refactoring: [TARGET_CODE]

  Plan: [from plan-agent]

  Requirements:
  - Follow plan exactly
  - Run tests after each step
  - Stop if tests fail
  - NO behavior changes
  """
)
```

### Phase 4: Review

```
Task(
  subagent_type="plan-reviewer",
  prompt="""
  Review refactoring: [TARGET_CODE]

  Changes: [git diff from kraken]

  Check:
  - Behavior preserved
  - No unintended changes
  - Code quality improved
  - Patterns consistent
  """
)
```

### Phase 5: Validate

```
Task(
  subagent_type="arbiter",
  prompt="""
  Validate refactoring: [TARGET_CODE]

  - Run full test suite
  - Verify no regressions
  - Check type errors
  - Run linting
  """
)
```

## Refactoring Types

### Extract Module
```
phoenix → plan-agent → kraken → plan-reviewer → arbiter
```

### Rename/Restructure
```
phoenix → kraken → arbiter  (simpler, skip detailed planning)
```

### Architecture Change
```
phoenix → plan-agent → [kraken → plan-reviewer] × N phases → arbiter
```

## Example

```
User: /refactor Extract the validation logic into a separate module

Claude: Starting /refactor workflow...

Phase 1: Analyzing current structure...
[Spawns phoenix]
Found: Validation logic spread across 4 files
- form.ts (lines 45-120)
- api.ts (lines 200-280)
- user.ts (lines 15-45)
- order.ts (lines 88-130)

Phase 2: Planning extraction...
[Spawns plan-agent]
Plan:
1. Create src/validation/index.ts
2. Extract common validators
3. Update imports one file at a time
4. Run tests after each change

Phase 3: Implementing...
[Spawns kraken]
Completed all 4 steps, tests green after each

Phase 4: Reviewing changes...
[Spawns plan-reviewer]
✅ All behavior preserved
✅ DRY improved (removed 45 duplicate lines)
✅ New structure consistent

Phase 5: Final validation...
[Spawns arbiter]
✅ 312 tests passing, 0 regressions

Refactoring complete!
```

## Safety Flags

- `--dry-run`: Plan but don't implement
- `--step-by-step`: Pause after each change for approval
- `--coverage-check`: Require >80% coverage before proceeding
