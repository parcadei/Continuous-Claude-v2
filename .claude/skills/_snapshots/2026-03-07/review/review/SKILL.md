---
name: review
description: Comprehensive code review workflow - parallel specialized reviews → synthesis
---

# /review - Code Review Workflow

Multi-perspective code review with parallel specialists.

## When to Use

- "Review this code"
- "Review my PR"
- "Check this before I merge"
- "Get feedback on implementation"
- Before merging significant changes
- Quality gates

## Workflow Overview

```
         ┌──────────┐
         │  critic  │ ─┐
         │ (code)   │  │
         └──────────┘  │
                       │
         ┌──────────┐  │      ┌──────────────┐
         │plan-reviewer│ ─┼────▶ │ review-agent │
         │ (plan)   │  │      │ (synthesis)  │
         └──────────┘  │      └──────────────┘
                       │
         ┌──────────┐  │
         │plan-reviewer│ ─┘
         │ (change) │
         └──────────┘

         Parallel                Sequential
         perspectives            synthesis
```

## Agent Sequence

| # | Agent | Focus | Execution |
|---|-------|-------|-----------|
| 1 | **critic** | Code quality, patterns, readability | Parallel |
| 1 | **plan-reviewer** | Architecture, plan adherence | Parallel |
| 1 | **plan-reviewer** | Change impact, risk assessment | Parallel |
| 2 | **review-agent** | Synthesize all reviews, final verdict | After 1 |

## Review Perspectives

- **critic**: Is this good code? (Style, patterns, readability)
- **plan-reviewer**: Does this match the design? (Architecture, plan)
- **plan-reviewer**: Is this change safe? (Risk, impact, regressions)
- **review-agent**: Overall assessment and recommendations

## Execution

### Phase 1: Parallel Reviews

```
# Code quality review
Task(
  subagent_type="critic",
  prompt="""
  Review code quality: [SCOPE]

  Evaluate:
  - Code style and consistency
  - Design patterns used
  - Readability and maintainability
  - Error handling
  - Test coverage

  Output: List of issues with severity (critical/major/minor)
  """,
  run_in_background=true
)

# Architecture review
Task(
  subagent_type="plan-reviewer",
  prompt="""
  Review architecture alignment: [SCOPE]

  Check:
  - Follows established patterns
  - Matches implementation plan (if exists)
  - Consistent with system design
  - No architectural violations

  Output: Alignment assessment with concerns
  """,
  run_in_background=true
)

# Change impact review
Task(
  subagent_type="plan-reviewer",
  prompt="""
  Review change impact: [SCOPE]

  Assess:
  - Risk level of changes
  - Affected systems/components
  - Backward compatibility
  - Potential regressions
  - Security implications

  Output: Risk assessment with recommendations
  """,
  run_in_background=true
)

# Wait for all parallel reviews
[Check TaskOutput for all three]
```

### Phase 2: Synthesis

```
Task(
  subagent_type="review-agent",
  prompt="""
  Synthesize reviews for: [SCOPE]

  Reviews:
  - critic: [code quality findings]
  - plan-reviewer: [architecture findings]
  - plan-reviewer: [change impact findings]

  Create final review:
  - Overall verdict (APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION)
  - Prioritized action items
  - Blocking vs non-blocking issues
  - Summary for PR description
  """
)
```

## Review Modes

### Full Review
```
User: /review
→ All four agents, comprehensive review
```

### Quick Review
```
User: /review --quick
→ critic only, fast feedback
```

### Security Focus
```
User: /review --security
→ Add aegis (security agent) to parallel phase
```

### PR Review
```
User: /review PR #123
→ Fetch PR diff, review changes
```

## Example

```
User: /review the authentication changes

Claude: Starting /review workflow...

Phase 1: Running parallel reviews...
┌────────────────────────────────────────────┐
│ critic: Reviewing code quality...          │
│ plan-reviewer: Checking architecture...         │
│ plan-reviewer: Assessing change impact...         │
└────────────────────────────────────────────┘

critic: Found 2 issues
- [minor] Inconsistent error messages in auth.ts
- [major] Missing input validation in login()

plan-reviewer: ✅ Matches authentication plan

plan-reviewer: Medium risk
- Affects: login, signup, password reset
- Breaking change: session token format

Phase 2: Synthesizing...

┌─────────────────────────────────────────────┐
│ Review Summary                              │
├─────────────────────────────────────────────┤
│ Verdict: REQUEST_CHANGES                    │
│                                             │
│ Blocking:                                   │
│ 1. Add input validation to login()          │
│                                             │
│ Non-blocking:                               │
│ 2. Standardize error messages               │
│                                             │
│ Notes:                                      │
│ - Document session token format change      │
│ - Consider migration path for existing      │
│   sessions                                  │
└─────────────────────────────────────────────┘
```

## Verdicts

- **APPROVE**: Ready to merge, all issues are minor
- **REQUEST_CHANGES**: Blocking issues must be fixed
- **NEEDS_DISCUSSION**: Architectural decisions need input
