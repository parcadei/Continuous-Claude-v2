---
name: migrate
description: Migration workflow - research → analyze → plan → implement → review
---

# /migrate - Migration Workflow

Safe migrations for frameworks, languages, and infrastructure.

## When to Use

- "Migrate to X"
- "Upgrade framework"
- "Move from X to Y"
- "Upgrade Python/Node/etc."
- "Migrate database"
- Framework version upgrades
- Language migrations
- Infrastructure changes

## Workflow Overview

```
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐
│  oracle  │───▶│ phoenix  │───▶│   plan-    │───▶│  kraken  │───▶│ surveyor  │
│          │    │          │    │   agent    │    │          │    │           │
└──────────┘    └──────────┘    └────────────┘    └──────────┘    └───────────┘
  Research       Analyze          Plan             Implement       Review
  target         current          migration        changes         migration
```

## Agent Sequence

| # | Agent | Role | Output |
|---|-------|------|--------|
| 1 | **oracle** | Research target framework/version | Research report |
| 2 | **phoenix** | Analyze current codebase for migration impact | Impact analysis |
| 3 | **plan-agent** | Create phased migration plan | Migration plan |
| 4 | **kraken** | Implement migration changes | Code changes |
| 5 | **surveyor** | Review migration for completeness | Migration review |

## Why Extra Gates?

Migrations are high-risk:
- Breaking changes between versions
- Dependency conflicts
- Data format changes
- API deprecations

The extra research and review phases catch issues early.

## Execution

### Phase 1: Research Target

```
Task(
  subagent_type="oracle",
  prompt="""
  Research migration target: [TARGET]

  Investigate:
  - Breaking changes from current version
  - New APIs and patterns
  - Deprecated features we use
  - Migration guides from official docs
  - Common pitfalls and solutions

  Output: Migration research report
  """
)
```

### Phase 2: Analyze Current State

```
Task(
  subagent_type="phoenix",
  prompt="""
  Analyze codebase for migration: [FROM] → [TO]

  Identify:
  - Files using deprecated APIs
  - Dependency conflicts
  - Patterns that need updating
  - Test coverage of affected areas
  - Risk areas (critical paths)

  Output: Impact analysis with affected files
  """
)
```

### Phase 3: Plan Migration

```
Task(
  subagent_type="plan-agent",
  prompt="""
  Create migration plan: [FROM] → [TO]

  Research: [from oracle]
  Impact: [from phoenix]

  Plan should:
  - Be phased (incremental if possible)
  - Each phase independently testable
  - Include rollback strategy
  - Prioritize critical path stability

  Output: Phased migration plan
  """
)
```

### Phase 4: Implement

```
Task(
  subagent_type="kraken",
  prompt="""
  Implement migration phase: [PHASE_N]

  Plan: [from plan-agent]

  Requirements:
  - Follow plan exactly
  - Run tests after each change
  - Document any deviations
  - Stop if tests fail

  Output: Completed phase with test results
  """
)
```

### Phase 5: Review Migration

```
Task(
  subagent_type="surveyor",
  prompt="""
  Review migration: [FROM] → [TO]

  Check:
  - All deprecated APIs replaced
  - No remaining compatibility shims
  - Tests passing
  - Performance acceptable
  - No security regressions

  Output: Migration review report
  """
)
```

## Migration Types

### Framework Upgrade
```
User: /migrate React 17 → 18
→ Full workflow with hooks/concurrent mode changes
```

### Language Version
```
User: /migrate Python 3.9 → 3.12
→ Focus on new syntax, removed features
```

### Database Migration
```
User: /migrate MongoDB → PostgreSQL
→ Schema design, data transformation, query rewrite
```

### Infrastructure
```
User: /migrate AWS → GCP
→ Service mapping, config translation
```

## Example

```
User: /migrate from Express to Fastify

Claude: Starting /migrate workflow: Express → Fastify

Phase 1: Researching Fastify...
[Spawns oracle]
Key differences:
- Schema-based validation (vs middleware)
- Plugin architecture
- Async/await native
- Different middleware pattern

Phase 2: Analyzing current Express usage...
[Spawns phoenix]
Impact analysis:
- 23 route files to update
- 8 middleware to convert
- 3 plugins need Fastify equivalents
- Test coverage: 78%

Phase 3: Creating migration plan...
[Spawns plan-agent]

Migration Plan: Express → Fastify
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Setup & Core
- Add Fastify alongside Express
- Migrate core server setup
- Run both in parallel

Phase 2: Routes (by domain)
- Migrate auth routes
- Migrate user routes
- Migrate product routes
- ...

Phase 3: Middleware
- Convert error handler
- Convert auth middleware
- Convert logging

Phase 4: Cleanup
- Remove Express
- Remove compatibility layer
- Final testing

Rollback: Keep Express until Phase 4 complete

Phase 4: Implementing Phase 1...
[Spawns kraken]
✅ Fastify server running alongside Express
✅ Core routes migrated
✅ Tests passing

[Continues through phases...]

Phase 5: Reviewing migration...
[Spawns surveyor]
✅ All Express code removed
✅ 23/23 routes migrated
✅ Performance improved (2.1x faster)
✅ No security regressions

Migration complete! Express → Fastify
```

## Incremental Migration

For large codebases, run one phase at a time:

```
User: /migrate React 17 → 18 --phase 1
[Runs only Phase 1]

User: /migrate React 17 → 18 --phase 2
[Runs Phase 2, reads previous handoff]
```

## Flags

- `--phase N`: Run specific phase only
- `--dry-run`: Plan without implementing
- `--rollback`: Execute rollback plan
- `--parallel`: Run new alongside old (strangler fig)
