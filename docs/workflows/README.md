# Workflow Skills

Workflow skills are multi-agent pipelines that orchestrate specialized agents to accomplish complex development tasks. Each workflow follows a specific pattern optimized for its domain.

## Overview

Instead of manually coordinating multiple agents, simply describe your goal and Claude routes to the appropriate workflow. Each workflow handles the full lifecycle of its task type, from research to validation.

## Available Workflows

| Workflow               | Purpose                     | Agent Pipeline                                          | When to Use                               |
| ---------------------- | --------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| [/fix](#fix)           | Quick bug fixes             | scout → spark → arbiter                                 | Known issue, clear symptoms               |
| [/debug](#debug)       | Deep investigation          | sleuth → debug-agent → profiler? → spark                | Complex bugs, unclear cause               |
| [/build](#build)       | Feature implementation      | oracle? → plan-agent → kraken → arbiter → scribe        | New features from scratch                 |
| [/tdd](#tdd)           | Test-driven development     | plan-agent → arbiter → kraken → arbiter                 | Features needing strong test coverage     |
| [/refactor](#refactor) | Code restructuring          | phoenix → plan-agent → kraken → plan-reviewer → arbiter | Technical debt, architecture improvements |
| [/explore](#explore)   | Codebase discovery          | scout ‖ tldr-explorer ‖ pathfinder                      | Understanding unfamiliar code             |
| [/review](#review)     | Code review                 | critic ‖ plan-reviewer ‖ plan-reviewer → review-agent   | PR review, quality gates                  |
| [/test](#test)         | Comprehensive testing       | arbiter ‖ arbiter → atlas                               | Full test suite execution                 |
| [/security](#security) | Security audit              | aegis → arbiter                                         | Vulnerability scanning, auth review       |
| [/release](#release)   | Release preparation         | aegis → atlas → review-agent → herald → scribe          | Production deployment readiness           |
| [/migrate](#migrate)   | Framework/version migration | oracle → phoenix → plan-agent → kraken → surveyor       | Upgrades, migrations                      |

**Legend:**

- `→` Sequential execution
- `‖` Parallel execution
- `?` Optional phase

## Recent Improvements

### Pre-Mortem Risk Analysis (2026-01-08)

The `/fix` workflow now includes proactive risk assessment using Gary Klein's pre-mortem technique:

```
sleuth (investigation)
  ↓
[HUMAN CHECKPOINT: diagnosis]
  ↓
[PREMORTEM: quick risk check]  ← NEW
  ↓
kraken (implementation)
  ↓
arbiter (verification)
```

**Why pre-mortem?** Imagine the fix failed - what went wrong? This catches integration risks, missing tests, and edge cases before implementation.

See [/premortem skill]($CLAUDE_PROJECT_DIR/.claude/skills/premortem/SKILL.md) for details.

### Agent Consolidation (2026-01-08)

Streamlined from 41 agents to 31 by consolidating overlapping roles:

| Old Agents                                                         | New Agent    | Purpose                |
| ------------------------------------------------------------------ | ------------ | ---------------------- |
| `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder` | `scout`      | All code discovery     |
| `research-agent`                                                   | `oracle`     | External research      |
| `repo-research-analyst`                                            | `pathfinder` | Repository conventions |

This reduces cognitive overhead and makes agent selection clearer.

### TLDR-Code Integration (2026-01-06)

Agents now use TLDR-code for 95% token savings on code context:

| Approach        | Tokens | Savings |
| --------------- | ------ | ------- |
| Read raw files  | 23,314 | 0%      |
| TLDR all layers | 1,189  | **95%** |

**How it works:** Call graphs navigate to relevant code, then structured summaries replace reading entire files. Available via `tldr` CLI (see [TLDR documentation]($CLAUDE_PROJECT_DIR/docs/tools/tldr.md)).

## How to Use

You don't need to invoke workflows explicitly. Just describe your goal:

```
User: The login button isn't working
Claude: [Activates /fix workflow]
      scout → spark → arbiter

User: Add user authentication
Claude: [Activates /build workflow]
      plan-agent → kraken → arbiter → scribe
```

Or invoke directly if you know what you want:

```
/fix the auth bug
/build user profile page
/tdd implement email validation
```

## Workflow Details

### /fix

**Purpose:** Quick fixes for known bugs with clear symptoms.

**Pipeline:**

```
┌─────────┐    ┌──────────┐    ┌─────────┐    ┌───────────┐
│  scout  │───▶│premortem │───▶│  spark  │───▶│ arbiter  │
└─────────┘    └──────────┘    └─────────┘    └───────────┘
  Locate        Risk check      Fix             Verify
  the issue     (quick)         it              tests pass
```

**When to use:**

- Simple, localized bugs
- Clear error messages
- Failing tests
- UI glitches

**When NOT to use:**

- Root cause unclear → use `/debug`
- Spans multiple systems → use `/debug`
- Performance issues → use `/debug`

**Example:**

```
User: /fix The login button isn't submitting the form

scout: Found issue at src/components/LoginForm.tsx:45
       onClick handler missing await

premortem: Quick risk check...
  TIGER: Async handler might race with form validation
  Mitigation: Add await + test for race condition

spark: Added await to async handler
       Created regression test for race condition

arbiter: ✅ All tests passing

Fix complete!
```

**Agents:**

- **scout** (Sonnet): Locates bug using grep, TLDR-code structure, stack traces
- **premortem** (skill): Quick risk assessment (5 core questions)
- **spark** (Opus): Applies minimal fix, adds regression test
- **arbiter** (Sonnet): Runs tests to verify fix

---

### /debug

**Purpose:** Deep investigation of complex bugs with unclear root causes.

**Pipeline:**

```
┌──────────┐    ┌────────────┐    ┌───────────┐    ┌─────────┐
│  sleuth  │───▶│  debug-    │───▶│ profiler? │───▶│  spark  │
└──────────┘    │   agent    │    └───────────┘    └─────────┘
  Triage          Deep              Performance      Apply
  symptoms        analysis          analysis         fix
```

**When to use:**

- Root cause unclear
- Intermittent failures
- Performance problems
- Race conditions
- System-wide issues

**Example:**

```
User: /debug API responses are intermittently slow

sleuth: Symptoms: Random 5s delays, no error logs
        Affects /api/users endpoint

debug-agent: Root cause: N+1 query in user.getRelations()
             Each user loads relations separately

profiler: Confirmed: 47 queries for 47 users = 4.8s
          With eager loading: 2 queries = 0.1s

spark: Fixed: Added .include('relations') to query

Result: 4.8s → 0.1s response time
```

**Agents:**

- **sleuth** (Sonnet): Initial triage, gather symptoms, logs, stack traces
- **debug-agent** (Opus): Deep analysis, root cause identification
- **profiler** (Sonnet): Optional performance measurement for slow code
- **spark** (Opus): Applies fix based on diagnosis

---

### /build

**Purpose:** Complete feature implementation from planning to documentation.

**Pipeline:**

```
┌──────────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
│  oracle?     │───▶│   plan-    │───▶│  kraken  │───▶│ arbiter  │───▶│  scribe │
└──────────────┘    │   agent    │    └──────────┘    └───────────┘    └─────────┘
  External           Design           Implement        Test             Document
  research           solution         code             & verify         changes
```

**When to use:**

- New features from scratch
- Complex multi-file implementations
- Features requiring external API/library research

**Skip phases:**

- `--no-research`: If you know what library to use
- `--no-docs`: For quick iterations

**Example:**

```
User: /build Add user authentication with JWT tokens

oracle: Researching JWT best practices...
        Recommended: jsonwebtoken library
        Security: Use RS256, refresh tokens, token rotation

plan-agent: Created implementation plan
            Phase 1: Token generation/validation
            Phase 2: Middleware integration
            Phase 3: Refresh token flow

kraken: Implemented JWT authentication
        Created tests for each phase
        All tests passing

arbiter: ✅ 45/45 tests passing
         ✅ Type checks passing

scribe: Updated docs/auth.md
        Created handoff at thoughts/handoffs/jwt-auth/

Build complete!
```

**Agents:**

- **oracle** (Sonnet): Optional external research for APIs, libraries, best practices
- **plan-agent** (Opus): Creates detailed implementation plan with phases
- **kraken** (Opus): TDD implementation - tests first, then code (uses TLDR-code for 95% token savings)
- **arbiter** (Sonnet): Runs full test suite, verifies build
- **scribe** (Sonnet): Documents implementation, creates handoff

---

### /tdd

**Purpose:** Strict test-driven development - tests first, then implementation.

**Pipeline:**

```
┌────────────┐    ┌──────────┐    ┌──────────┐    ┌───────────┐
│   plan-    │───▶│ arbiter  │───▶│  kraken  │───▶│ arbiter  │
│   agent    │    └──────────┘    └──────────┘    └───────────┘
└────────────┘      Write           Implement        Verify
  Design            failing          minimal          all tests
  approach          tests            code             pass
```

**Core principle:** No production code without a failing test first.

**When to use:**

- Critical features requiring strong test coverage
- Bug fixes that need regression tests
- When quality is paramount

**Example:**

```
User: /tdd Add email validation to signup form

plan-agent: Test plan:
            - Valid email formats
            - Invalid email formats
            - Empty email rejection
            - Edge cases (unicode, long emails)

arbiter (RED): ✅ 8 tests written, all failing as expected

kraken (GREEN): ✅ All 8 tests now passing
                Implemented minimal validation logic

arbiter (VALIDATE): ✅ 247 tests passing (8 new), 0 failing

TDD workflow complete!
```

**Agents:**

- **plan-agent** (Opus): Designs test cases and approach (no implementation)
- **arbiter** (Sonnet): Writes failing tests (RED phase)
- **kraken** (Opus): Writes minimal code to pass tests (GREEN phase)
- **arbiter** (Sonnet): Validates full suite passes

---

### /refactor

**Purpose:** Safe code restructuring with review gates.

**Pipeline:**

```
┌──────────┐    ┌────────────┐    ┌──────────┐    ┌──────────────┐    ┌───────────┐
│ phoenix  │───▶│   plan-    │───▶│  kraken  │───▶│plan-reviewer │───▶│ arbiter  │
└──────────┘    │   agent    │    └──────────┘    └──────────────┘    └───────────┘
  Analyze         Plan             Implement       Review              Verify
  current         changes          refactor        changes             tests pass
```

**Principles:**

1. Tests first - ensure adequate coverage before refactoring
2. Small steps - each change independently verifiable
3. Behavior preserved - no functional changes
4. Reviewable - changes easy to review

**When to use:**

- Extract module/function
- Improve architecture
- Remove duplication
- Technical debt reduction

**Example:**

```
User: /refactor Extract validation logic into separate module

phoenix: Found validation logic spread across 4 files
         - form.ts (lines 45-120)
         - api.ts (lines 200-280)
         - user.ts (lines 15-45)
         - order.ts (lines 88-130)

plan-agent: Plan:
            1. Create src/validation/index.ts
            2. Extract common validators
            3. Update imports one file at a time
            4. Run tests after each change

kraken: Completed all 4 steps, tests green after each

plan-reviewer: ✅ All behavior preserved
               ✅ DRY improved (removed 45 duplicate lines)
               ✅ New structure consistent

arbiter: ✅ 312 tests passing, 0 regressions

Refactoring complete!
```

**Agents:**

- **phoenix** (Opus): Analyzes current code using TLDR-code, identifies improvement areas
- **plan-agent** (Opus): Creates safe refactoring plan with small steps
- **kraken** (Opus): Implements refactoring following plan exactly
- **plan-reviewer** (Opus): Reviews changes for correctness, no behavior changes
- **arbiter** (Sonnet): Validates all tests still pass

---

### /explore

**Purpose:** Codebase discovery through parallel specialized searches.

**Pipeline:**

```
         ┌─────────┐
         │  scout  │ ─┐
         │ (grep)  │  │
         └─────────┘  │
                      │
         ┌───────────────┐      ┌────────────┐
         │tldr-explorer  │ ─────▶│  (merged)  │
         │ (symbols)     │      │  findings  │
         └───────────────┘      └────────────┘
                      │
         ┌──────────────────────┐
         │pathfinder            │
         │ (patterns)           │
         └──────────────────────┘

         Parallel                 Merged
         exploration              results
```

**Why three perspectives?**

- **scout**: "What files contain X?" - Pattern matching
- **tldr-explorer**: "How is X connected?" - Code structure (95% token savings)
- **pathfinder**: "What patterns exist?" - High-level understanding

**When to use:**

- Onboarding to new codebase
- Understanding unfamiliar code
- "How does X work?"
- "Find where Y is implemented"

**Example:**

```
User: /explore How does the payment system work?

Running parallel exploration...
┌──────────────────────────────────────────────┐
│ scout: Searching for payment code...         │
│ tldr-explorer: Building symbol graph...      │
│ pathfinder: Analyzing patterns...            │
└──────────────────────────────────────────────┘

scout findings:
- src/services/payment.ts (main service)
- src/api/routes/payment.ts (API endpoints)
- src/models/transaction.ts (data model)
- tests/payment.test.ts (test coverage)

tldr-explorer findings:
- PaymentService.process() → StripeClient.charge()
- process() calls: validateCard → createTransaction → chargeCard → notifyUser
- 4 entry points from API routes

pathfinder findings:
- Uses service pattern (all services in src/services/)
- Error handling: custom PaymentError class
- Follows existing auth pattern for validation

┌─────────────────────────────────────────────────┐
│ Payment System Overview                         │
├─────────────────────────────────────────────────┤
│ Entry: POST /api/payment/charge                 │
│ Flow:  API → PaymentService → StripeClient      │
│ Model: Transaction (stored in DB)               │
│ Errors: PaymentError (custom error class)       │
└─────────────────────────────────────────────────┘
```

**Agents:**

- **scout** (Sonnet): Text search, grep patterns, file discovery
- **tldr-explorer** (general-purpose): Symbol index, call graphs via TLDR-code
- **pathfinder** (Sonnet): Patterns, conventions, documentation

**Note:** All three run in parallel for speed. Results are merged for comprehensive understanding.

---

### /review

**Purpose:** Multi-perspective code review with parallel specialists.

**Pipeline:**

```
         ┌──────────┐
         │  critic  │ ─┐
         │ (code)   │  │
         └──────────┘  │
                       │
         ┌──────────────┐  │      ┌──────────────┐
         │plan-reviewer │ ─┼─────▶│ review-agent │
         │ (plan)       │  │      │ (synthesis)  │
         └──────────────┘  │      └──────────────┘
                       │
         ┌──────────────┐  │
         │plan-reviewer │ ─┘
         │ (change)     │
         └──────────────┘

         Parallel                Sequential
         perspectives            synthesis
```

**Review perspectives:**

- **critic**: Is this good code? (Style, patterns, readability)
- **plan-reviewer**: Does this match the design? (Architecture, plan adherence)
- **plan-reviewer**: Is this change safe? (Risk, impact, regressions)
- **review-agent**: Overall assessment and recommendations

**When to use:**

- PR review
- Before merging significant changes
- Quality gates

**Example:**

```
User: /review the authentication changes

Phase 1: Running parallel reviews...
┌────────────────────────────────────────────┐
│ critic: Reviewing code quality...          │
│ plan-reviewer: Checking architecture...    │
│ plan-reviewer: Assessing change impact...  │
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

**Verdicts:**

- **APPROVE**: Ready to merge, all issues are minor
- **REQUEST_CHANGES**: Blocking issues must be fixed
- **NEEDS_DISCUSSION**: Architectural decisions need input

**Agents:**

- **critic** (Opus): Code quality, style, patterns, readability
- **plan-reviewer** (Opus): Architecture alignment with plan
- **plan-reviewer** (Opus): Change impact and risk assessment
- **review-agent** (Opus): Synthesizes all reviews, final verdict

---

### /test

**Purpose:** Comprehensive test suite execution with parallel fast tests.

**Pipeline:**

```
         ┌───────────┐
         │ arbiter   │ ─┐
         │ (unit)    │  │
         └───────────┘  │
                        ├──▶ ┌─────────┐
         ┌───────────┐  │    │  atlas  │
         │  arbiter  │ ─┘    │ (e2e)   │
         │ (integ)   │       └─────────┘
         └───────────┘

         Parallel              Sequential
         fast tests            slow tests
```

**Why this order?**

1. Fast feedback - unit tests fail fast
2. Parallel efficiency - no dependency between unit and integration
3. E2E gating - only run slow E2E tests if faster tests pass

**When to use:**

- Before releases or merges
- After major changes
- Full system verification

**Example:**

```
User: /test the new payment feature

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

**Agents:**

- **arbiter** (Sonnet): Runs unit tests, type checks, linting (parallel)
- **arbiter** (Sonnet): Runs integration tests (parallel)
- **atlas** (Opus): Runs E2E/acceptance tests (after fast tests pass)

---

### /security

**Purpose:** Dedicated security vulnerability analysis.

**Pipeline:**

```
┌─────────┐    ┌───────────┐
│  aegis  │───▶│ arbiter   │
└─────────┘    └───────────┘
  Security       Verify
  audit          fixes
```

**When to use:**

- Before handling auth, payments, user data
- Security-sensitive features
- Before releases
- Vulnerability scanning

**Scans for:**

- SQL injection, XSS, CSRF
- Broken authentication/authorization
- Sensitive data exposure, hardcoded secrets
- Security misconfigurations
- Vulnerable dependencies

**Example:**

```
User: /security the payment processing code

Phase 1: Security audit...

┌─────────────────────────────────────────────────────────────┐
│ Security Audit Report                                       │
├─────────────────────────────────────────────────────────────┤
│ Scope: src/services/payment/                                │
│ Files scanned: 12                                           │
│ Lines analyzed: 2,847                                       │
├─────────────────────────────────────────────────────────────┤
│ CRITICAL (1)                                                │
│ ──────────                                                  │
│ [C1] SQL Injection in payment.py:89                         │
│      query = f"SELECT * FROM orders WHERE id = {order_id}"  │
│      Fix: Use parameterized queries                         │
│                                                             │
│ HIGH (2)                                                    │
│ ────────                                                    │
│ [H1] Hardcoded API key in stripe_client.py:12               │
│      STRIPE_KEY = "sk_live_..."                             │
│      Fix: Move to environment variable                      │
│                                                             │
│ [H2] Missing input validation in refund.py:45               │
│      amount = request.json['amount']  # No validation       │
│      Fix: Validate amount is positive number                │
├─────────────────────────────────────────────────────────────┤
│ Summary: 1 critical, 2 high, 1 medium, 0 low                │
│ Status: BLOCKING - Fix critical issues before release       │
└─────────────────────────────────────────────────────────────┘

Fix the issues, then run: /security --verify
```

**Agents:**

- **aegis** (Opus): Comprehensive security scan, OWASP Top 10 coverage
- **arbiter** (Sonnet): Verifies fixes, runs security tests

---

### /release

**Purpose:** Structured release preparation with safety gates.

**Pipeline:**

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌──────────┐    ┌─────────┐
│  aegis  │───▶│  atlas  │───▶│ review-agent │───▶│  herald  │───▶│  scribe │
└─────────┘    └─────────┘    └──────────────┘    └──────────┘    └─────────┘
  Security       E2E            Final              Version         Release
  audit          tests          review             bump            notes
```

**Why this order?**

1. Security first - catch vulnerabilities before they ship
2. E2E tests - verify full system works
3. Final review - human-in-the-loop approval
4. Version bump - only after approval
5. Documentation - ship with proper release notes

**Blockers:**

- Critical security vulnerability
- E2E tests failing
- Review verdict is RELEASE_BLOCKED

**When to use:**

- Before any production deployment
- Preparing releases
- Shipping to users

**Example:**

```
User: /release v2.0.0

Phase 1: Security audit...
✅ No critical vulnerabilities
⚠️ 2 low-severity issues (documented)

Phase 2: E2E tests...
✅ 156/156 E2E tests passing

Phase 3: Final review...
✅ RELEASE_APPROVED
- 47 commits since v1.9.0
- 3 new features
- 12 bug fixes
- No breaking changes

Phase 4: Version bump...
✅ Version bumped to 2.0.0
✅ CHANGELOG.md updated
✅ Git tag created

Phase 5: Release notes...
✅ RELEASE-v2.0.0.md created

┌─────────────────────────────────────────┐
│ Release v2.0.0 Ready                    │
├─────────────────────────────────────────┤
│ Security: ✅ Passed                     │
│ Tests: ✅ 156/156                       │
│ Review: ✅ Approved                     │
│                                         │
│ Next steps:                             │
│ 1. git push origin v2.0.0              │
│ 2. Create GitHub release               │
│ 3. Deploy to production                │
└─────────────────────────────────────────┘
```

**Agents:**

- **aegis** (Opus): Security vulnerability scan
- **atlas** (Opus): Full E2E test suite
- **review-agent** (Opus): Final release review, approval/blocking decision
- **herald** (Sonnet): Version bump, changelog generation
- **scribe** (Sonnet): Release notes, documentation updates

---

### /migrate

**Purpose:** Safe framework, language, or infrastructure migrations.

**Pipeline:**

```
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐    ┌───────────┐
│  oracle  │───▶│ phoenix  │───▶│   plan-    │───▶│  kraken  │───▶│ surveyor  │
└──────────┘    └──────────┘    │   agent    │    └──────────┘    └───────────┘
  Research       Analyze          Plan             Implement       Review
  target         current          migration        changes         migration
```

**Why extra gates?**

Migrations are high-risk:

- Breaking changes between versions
- Dependency conflicts
- Data format changes
- API deprecations

Extra research and review phases catch issues early.

**When to use:**

- Framework upgrades (React 17 → 18)
- Language version (Python 3.9 → 3.12)
- Database migration (MongoDB → PostgreSQL)
- Infrastructure changes (AWS → GCP)

**Example:**

```
User: /migrate from Express to Fastify

Phase 1: Researching Fastify...
Key differences:
- Schema-based validation (vs middleware)
- Plugin architecture
- Async/await native
- Different middleware pattern

Phase 2: Analyzing current Express usage...
Impact analysis:
- 23 route files to update
- 8 middleware to convert
- 3 plugins need Fastify equivalents
- Test coverage: 78%

Phase 3: Creating migration plan...

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
✅ Fastify server running alongside Express
✅ Core routes migrated
✅ Tests passing

[Continues through phases...]

Phase 5: Reviewing migration...
✅ All Express code removed
✅ 23/23 routes migrated
✅ Performance improved (2.1x faster)
✅ No security regressions

Migration complete! Express → Fastify
```

**Agents:**

- **oracle** (Sonnet): Research target framework/version, breaking changes
- **phoenix** (Opus): Analyze current codebase for migration impact (uses TLDR-code)
- **plan-agent** (Opus): Create phased migration plan with rollback strategy
- **kraken** (Opus): Implement migration changes phase by phase
- **surveyor** (Opus): Review migration for completeness, no regressions

---

## Agent Reference

### Execution Agents

| Agent       | Model  | Role               | Typical Usage                                  |
| ----------- | ------ | ------------------ | ---------------------------------------------- |
| **kraken**  | Opus   | TDD implementation | Heavy lifting, complex features, follows plans |
| **spark**   | Opus   | Quick fixes        | Fast turnaround, minimal changes               |
| **arbiter** | Sonnet | Test runner        | Unit/integration tests, verification           |
| **atlas**   | Opus   | E2E tests          | End-to-end flows, acceptance tests             |

### Investigation Agents

| Agent           | Model  | Role                 | Typical Usage                                    |
| --------------- | ------ | -------------------- | ------------------------------------------------ |
| **scout**       | Sonnet | Code search          | Grep, glob, file discovery, TLDR-code navigation |
| **sleuth**      | Sonnet | Bug triage           | Initial investigation, symptom gathering         |
| **debug-agent** | Opus   | Root cause analysis  | Deep debugging, complex issues                   |
| **profiler**    | Sonnet | Performance analysis | CPU/memory profiling, bottleneck detection       |
| **pathfinder**  | Sonnet | Pattern discovery    | Conventions, architectural patterns              |

### Analysis Agents

| Agent             | Model   | Role               | Typical Usage                                      |
| ----------------- | ------- | ------------------ | -------------------------------------------------- |
| **phoenix**       | Opus    | Code analysis      | Refactoring prep, impact analysis (uses TLDR-code) |
| **oracle**        | Sonnet  | External research  | API docs, best practices, external knowledge       |
| **tldr-explorer** | General | Symbol exploration | Call graphs, dependencies (via TLDR-code)          |

### Review Agents

| Agent             | Model | Role                | Typical Usage                              |
| ----------------- | ----- | ------------------- | ------------------------------------------ |
| **critic**        | Opus  | Code quality review | Style, readability, patterns               |
| **plan-reviewer** | Opus  | Architecture review | Plan adherence, design consistency         |
| **review-agent**  | Opus  | Review synthesis    | Merge multiple perspectives, final verdict |
| **surveyor**      | Opus  | Migration review    | Migration completeness, regression check   |

### Planning Agents

| Agent          | Model | Role                    | Typical Usage                     |
| -------------- | ----- | ----------------------- | --------------------------------- |
| **plan-agent** | Opus  | Implementation planning | Create detailed plans with phases |

### Coordination Agents

| Agent      | Model  | Role                 | Typical Usage                         |
| ---------- | ------ | -------------------- | ------------------------------------- |
| **aegis**  | Opus   | Security audit       | Vulnerability scanning, OWASP Top 10  |
| **herald** | Sonnet | Release coordination | Version bumps, changelog generation   |
| **scribe** | Sonnet | Documentation        | Release notes, handoffs, docs updates |

## Workflow Composition Patterns

### Sequential Pattern

Used when each phase depends on the previous:

```
agent1 → agent2 → agent3
```

Example: /fix (scout → premortem → spark → arbiter)

### Parallel Pattern

Used when agents can work independently:

```
     agent1 ─┐
     agent2 ─┼──▶ merge
     agent3 ─┘
```

Example: /explore (scout ‖ tldr-explorer ‖ pathfinder)

### Gated Pattern

Used when approval is needed before proceeding:

```
agent1 → gate → agent2 → agent3
```

Example: /release (aegis → atlas → review-agent → herald → scribe)

### Phased Pattern

Used for large tasks broken into incremental phases:

```
[phase1: agents] → [phase2: agents] → [phase3: agents]
```

Example: /migrate (each phase can be run independently)

## Best Practices

### When to Use Workflows

1. **Use workflows for multi-step tasks**
   - Multiple files to change
   - Need planning before implementation
   - Require verification/testing

2. **Skip workflows for simple tasks**
   - Single-line changes
   - Documentation updates
   - Simple questions

3. **Chain workflows for complex projects**
   ```
   /explore → understand codebase
   /build → implement feature
   /review → get feedback
   /test → verify everything works
   ```

### Workflow Flags

Many workflows support flags for customization:

```
/fix --quick          # Skip scout if location known
/build --no-research  # Skip research phase
/test --quick         # Unit tests only
/review --security    # Add security review
/release --patch      # Patch release (lighter process)
/migrate --phase 1    # Run specific migration phase
```

### Working with Handoffs

Workflows create handoffs for continuity:

```
thoughts/shared/handoffs/
├── feature-name/
│   ├── current.md        # Latest state
│   ├── 01-research.md    # Research findings
│   └── 02-plan.md        # Implementation plan
```

Use handoffs to:

- Resume work across sessions
- Share context with team
- Track decisions and progress

## Extending Workflows

Workflows are defined in `.claude/skills/<workflow>/SKILL.md`. Each workflow has:

```
.claude/skills/
└── workflow-name/
    └── SKILL.md          # Workflow definition
```

To create a custom workflow:

1. Copy an existing workflow as a template
2. Modify the agent pipeline
3. Update the skill metadata
4. Test with a real scenario

See existing workflows for patterns and conventions.

## Troubleshooting

### Workflow not activating?

- Be specific about your goal
- Or invoke explicitly: `/fix`, `/build`, etc.

### Agent failing?

- Check if the right model is available (Opus/Sonnet)
- Review agent logs in `.claude/cache/agents/`

### Tests not running?

- Ensure test commands are configured in project
- Check arbiter/atlas agent definitions

### Slow workflows?

- Use parallel patterns where possible
- Skip optional phases (research, docs)
- Use `--quick` flags for faster iteration

### Context too large?

- Workflows now use TLDR-code for 95% token savings
- See [TLDR documentation]($CLAUDE_PROJECT_DIR/docs/tools/tldr.md)

## Related Documentation

- [Agents]($CLAUDE_PROJECT_DIR/docs/agents/README.md) - Individual agent documentation
- [Hooks]($CLAUDE_PROJECT_DIR/docs/hooks/README.md) - Lifecycle extensions
- [Skills]($CLAUDE_PROJECT_DIR/docs/skills/help.md) - Skill system overview
- [TLDR-code]($CLAUDE_PROJECT_DIR/docs/tools/tldr.md) - Token-efficient code analysis
- [Pre-mortem]($CLAUDE_PROJECT_DIR/.claude/skills/premortem/SKILL.md) - Risk analysis technique

## Getting Help

```
/help           # Interactive discovery
/help workflows # Workflow-specific help
```

For questions or issues, see the main [README]($CLAUDE_PROJECT_DIR/README.md).
