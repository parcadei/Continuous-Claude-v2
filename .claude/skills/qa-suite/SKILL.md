---
name: qa-suite
description: Orchestrated acceptance test suite that parses plans/PRDs into structured test matrices, spawns sentinel agents per role, and generates graded QA reports. Use for structured feature verification across multiple user roles. Triggers on "/qa-suite", "run QA suite", "acceptance test", "test the feature", "verify phase", "QA report".
metadata:
  user-invocable: true
  triggers:
    - /qa-suite
---

# QA Suite — Plan-Driven Acceptance Testing

Orchestrates structured acceptance testing from plans and PRDs. Parses verification criteria, generates test matrices, spawns the sentinel agent per role, and aggregates results into a graded report.

**Distinction from `/qa-test`:**
- `/qa-test` = individual E2E test operations (record, run, debug, visual regression)
- `/qa-suite` = orchestrated acceptance testing from structured plans across multiple roles

## Decision Tree

| Request | Action |
|---------|--------|
| "Run QA suite for Phase B" | Parse plan → generate matrix → spawn sentinel |
| "Test this feature as all roles" | Generate role matrix → spawn sentinel per role |
| "Acceptance test the plan" | Extract criteria from plan → structured test run |
| "QA report for this PR" | Run suite → generate graded report |

## Workflow

### Step 1: Identify the Plan

The user provides a plan/PRD file path, or you detect the most recent plan:
- Check `.claude/plans/` for the latest plan file
- Or use the plan referenced in the user's message
- Extract: feature areas, user roles, verification criteria, expected behaviors

### Step 2: Generate Test Matrix

From the plan, build a matrix of: `roles x feature areas x assertions`

```markdown
| # | Scenario | Role | Flow | Expected |
|---|----------|------|------|----------|
| 1 | Admin login | admin | Login → dashboard | Dashboard loads, sidebar visible |
| 2 | Editor access | editor | Login → dashboard | Filtered view, write actions available |
| 3 | Viewer access | viewer | Login → dashboard | Read-only, restricted scope |
```

Present the matrix to the user for approval before executing.

### Step 3: Execute via Sentinel

Spawn the sentinel agent with the test matrix:

```
Agent tool:
  subagent_type: sentinel
  prompt: "Execute the following QA test matrix against <project-url>.
           Credentials: [from project CLAUDE.md]
           Matrix: [the generated matrix]
           Output to: .claude/cache/agents/sentinel/latest-output.md"
```

For large matrices (20+ scenarios), consider splitting by role:
- Spawn sentinel for admin scenarios
- Spawn sentinel for editor scenarios
- Spawn sentinel for viewer scenarios
- Aggregate results

### Step 4: Aggregate and Grade

Read sentinel output and produce a summary report:

```markdown
# QA Suite Report: [Feature/Phase Name]

**Date:** YYYY-MM-DD
**Plan:** [plan file path]
**Roles:** admin, editor, viewer

## Score: [A/B/C/F] ([X]% pass rate)

## By Role
| Role | Passed | Failed | Blocked | Pass Rate |
|------|--------|--------|---------|-----------|
| admin | 8 | 0 | 0 | 100% |
| editor | 7 | 1 | 0 | 88% |
| viewer | 4 | 0 | 1 | 80% |

## Failures
[Details from sentinel report]

## Blocked Scenarios
[Scenarios that couldn't run and why]

## Recommendations
- [Fix list based on failures]
- [Re-run after fixes: specific scenarios to retest]
```

### Step 5: Report Location

Save the report to:
- `.claude/cache/agents/sentinel/latest-output.md` (sentinel raw output)
- `.claude/cache/agents/sentinel/qa-suite-report.md` (aggregated graded report)

## Grading Scale

| Grade | Pass Rate | Ship Decision |
|-------|-----------|---------------|
| A | 100% | Ship |
| A- | 95-99% | Ship with known issues documented |
| B+ | 90-94% | Review failures before shipping |
| B | 80-89% | Fix critical failures before shipping |
| C | 70-79% | Do not ship — major issues |
| F | <70% | Do not ship — critical failures |

## Pre-Requisites

Before running a QA suite:
1. **Dev server running** — the project must be accessible at its local URL
2. **Test credentials available** — check project CLAUDE.md for login credentials per role
3. **Database seeded** — test data must exist (users, spaces, etc.)
4. **Chrome available** — Playwright MCP needs a browser instance

If any prerequisite is missing, report it immediately rather than running partial tests.

## Integration with Other Skills

| Skill | Integration |
|-------|-------------|
| `/qa-test` | Use for individual test operations (codegen, debug, visual) |
| `/qa-suite` | Use for structured multi-role acceptance testing |
| deployer | Post-deploy smoke test uses `qa-test` pattern |
| arbiter | Runs `npx playwright test` for formal spec suites |

## Example Usage

```
User: "Run QA suite for the Phase B spaces feature"

1. Read plan: .claude/plans/delightful-kindling-rocket.md
2. Extract: 7 feature areas, 4 roles, 28 scenarios
3. Present matrix to user for approval
4. Spawn sentinel per role (admin: 12, editor: 8, viewer: 5, guest: 3)
5. Aggregate: 26 PASS, 2 FAIL → Grade: B+ (93%)
6. Report with failure details and fix recommendations
```
