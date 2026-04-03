# Agent System Comprehensive Guide

This guide helps you choose the right agent for your task and understand how to compose agents into workflows.

## Quick Selection

| I want to...             | Use Agent     | Alternative       |
| ------------------------ | ------------- | ----------------- |
| Understand the codebase  | scout         | research-codebase |
| Research best practices  | oracle        | -                 |
| Design a new feature     | architect     | plan-agent        |
| Plan a refactoring       | phoenix       | -                 |
| Validate a plan          | plan-reviewer | validate-agent    |
| Implement with tests     | kraken        | -                 |
| Make a quick fix         | spark         | -                 |
| Debug an issue           | sleuth        | debug-agent       |
| Run unit tests           | arbiter       | -                 |
| Run E2E tests            | atlas         | -                 |
| Review feature code      | critic        | -                 |
| Review refactoring       | judge         | -                 |
| Review migration         | surveyor      | -                 |
| Audit security           | aegis         | -                 |
| Prepare a release        | herald        | -                 |
| Create handoff docs      | scribe        | -                 |
| Orchestrate complex work | maestro       | -                 |

## Agent Categories

### 1. Orchestrators

#### maestro

- **Model:** Opus
- **Purpose:** Coordinate multiple agents for complex multi-phase work
- **When to use:** Task requires multiple agents in sequence or parallel
- **Patterns:**
  - **Pipeline:** Linear dependency chain (scout → architect → kraken → arbiter)
  - **Swarm:** Parallel research (scout + oracle + scout → synthesize)
  - **Hierarchical:** Plan → Implement → Validate (default)
  - **Generator-Critic:** Iterative refinement (architect → critic → architect)
  - **Jury:** Majority vote (critic₁ + critic₂ + critic₃ → decision)

**Example:**

```
Task: "Design and implement user authentication"
maestro decomposes into:
  ├── scout (internal auth patterns)
  ├── oracle (external best practices)
  ├── architect (design)
  ├── plan-reviewer (validate)
  ├── kraken (implement)
  └── arbiter (test)
```

#### kraken

- **Model:** Opus
- **Purpose:** Implementation using strict TDD workflow
- **When to use:** Need to implement with test-first discipline
- **Features:**
  - Checkpoint/resume support for long implementations
  - Validation states: PENDING → IN_PROGRESS → VALIDATED → FAILED
  - Writes tests before code
  - Refactors after green tests
- **Checkpoints:** `thoughts/shared/handoffs/<task>/current.md`

**Example:**

```
/build tdd "user registration endpoint"
→ kraken writes failing test
→ kraken implements minimum code
→ kraken refactors
→ creates checkpoint at phase boundary
```

### 2. Planners

#### architect

- **Model:** Opus
- **Purpose:** Feature planning + API integration planning
- **When to use:**
  - Designing new features
  - Planning API/service integrations
- **Output:**
  - `thoughts/shared/plans/<feature>-plan.md`
  - `.claude/cache/agents/architect/latest-output.md`
- **Produces:**
  - Interfaces and data models
  - Phase-by-phase roadmap
  - Dependencies and risks
  - Integration plan (for APIs): auth strategies, error handling matrix, resilience patterns

**Example:**

```
Task: "Plan GitHub API integration"
architect produces:
  - Auth: OAuth2 flow with token refresh
  - Error handling: 401/403/404/429/500/502/503
  - Resilience: Retry with exp backoff, circuit breaker, rate limiting
  - Phases: 1) Auth 2) Read ops 3) Write ops 4) Webhooks
```

#### phoenix

- **Model:** Opus
- **Purpose:** Refactoring planning + framework migration planning
- **When to use:**
  - Refactoring technical debt
  - Migrating frameworks/versions
  - Infrastructure changes
- **Output:**
  - `thoughts/shared/plans/refactor-<target>-plan.md`
  - `.claude/cache/agents/phoenix/latest-output.md`
- **Produces:**
  - Technical debt analysis
  - Transformation plan with rollback strategy
  - Breaking change analysis
  - Codemods for automated transformation

**Example:**

```
Task: "Migrate from React Class components to Hooks"
phoenix produces:
  - Inventory: 42 class components
  - Breaking changes: lifecycle methods
  - Phases: 1) Leaf components 2) Mid-tier 3) Top-level
  - Codemod: jscodeshift transform script
  - Rollback: feature flag to toggle implementation
```

#### plan-agent

- **Model:** Opus
- **Purpose:** Lightweight planning with research and codebase analysis
- **When to use:** Need a plan with external research (docs, best practices)
- **Uses:** MCP tools (Nia, Perplexity, RepoPrompt)
- **Output:** `.claude/cache/agents/plan-agent/latest-output.md`

**Example:**

```
Task: "Plan rate limiting for API"
plan-agent:
  1. Researches rate limiting strategies (Nia, web)
  2. Explores codebase for existing patterns (RepoPrompt)
  3. Produces plan with research citations
```

#### validate-agent

- **Model:** (not specified)
- **Purpose:** Validate plans against best practices and codebase
- **When to use:** After creating a plan, before implementation
- **Checks:**
  - Security considerations
  - Interface compatibility
  - Dependency availability
  - Test coverage requirements

### 3. Explorers

#### scout

- **Model:** Sonnet
- **Purpose:** Comprehensive codebase exploration and pattern finding
- **When to use:** Need to understand project structure, find conventions, map architecture
- **Tools:** Fast search (Morph, rp-cli, AST-grep, Grep, Glob)
- **Output:** `.claude/cache/agents/scout/latest-output.md`
- **Produces:**
  - File location maps
  - Architecture diagrams
  - Convention summaries
  - Pattern documentation

**Use scout instead of Explore.** Scout uses Sonnet with a 197-line detailed prompt and produces accurate results. Explore used Haiku and was less accurate.

**Example:**

```
Task: "Find all authentication patterns in codebase"
scout:
  - Uses AST-grep for auth-related patterns
  - Maps auth files and their relationships
  - Documents conventions (JWT vs session, token storage)
  - Produces architecture diagram of auth flow
```

#### oracle

- **Model:** Opus
- **Purpose:** External research (web, docs, APIs)
- **When to use:** Need best practices, library documentation, or external knowledge
- **Tools:** Web search (Perplexity), docs (Nia), scraping (Firecrawl), GitHub search
- **Output:** `.claude/cache/agents/oracle/latest-output.md`
- **Features:**
  - Always cites sources
  - States confidence levels
  - Compares alternatives

**Example:**

```
Task: "Research best practices for async Python error handling"
oracle:
  - Searches web for async/await patterns
  - Queries Python docs via Nia
  - Finds GitHub examples
  - Produces report with citations and confidence levels
```

#### pathfinder

- **Model:** Opus
- **Purpose:** Analyze external repositories
- **When to use:** Need to understand how another project solves a problem
- **Process:**
  1. Clones repo to /tmp
  2. Analyzes structure
  3. Documents patterns
  4. Extracts learnings
- **Output:** `.claude/cache/agents/pathfinder/latest-output.md`

**Example:**

```
Task: "How does FastAPI handle dependency injection?"
pathfinder:
  - Clones tiangolo/fastapi to /tmp
  - Analyzes fastapi/dependencies.py
  - Documents Depends() pattern
  - Extracts examples
```

#### research-codebase

- **Model:** (spawns sub-agents)
- **Purpose:** Document codebase as-is without evaluation
- **When to use:** Need comprehensive technical documentation
- **Process:**
  - Spawns codebase-locator (find files)
  - Spawns codebase-analyzer (analyze behavior)
  - Spawns codebase-pattern-finder (extract patterns)
  - Synthesizes results
- **Output:** `thoughts/shared/research/YYYY-MM-DD-topic.md`

**Note:** Describes what exists, doesn't critique or recommend.

### 4. Implementers

#### kraken (see Orchestrators above)

#### spark

- **Model:** Sonnet
- **Purpose:** Lightweight fixes and quick tweaks
- **When to use:** Small, focused changes without TDD overhead
- **Tools:** Fast analysis (rp-cli, grep), syntax checks
- **Output:** `.claude/cache/agents/spark/latest-output.md`
- **Knows limits:** Escalates to kraken if scope grows

**Example:**

```
Task: "Fix typo in error message"
spark:
  - Finds the message with grep
  - Makes the edit
  - Runs syntax check
  - Done (no test needed)
```

#### agentica-agent

- **Model:** Sonnet
- **Purpose:** Build Python agents using Agentica SDK
- **When to use:** Implementing Python agents with agentic functions, spawn, or custom agent classes
- **Knows:**
  - `@agentic()` for simple functions
  - `spawn()` for reusable agents
  - Custom agent classes
  - MCP tool integration patterns
- **Output:** `.claude/cache/agents/agentica-agent/latest-output.md`

### 5. Debuggers

#### sleuth

- **Model:** Opus
- **Purpose:** General bug investigation and root cause analysis
- **When to use:** Need to investigate issues and identify root causes
- **Process:**
  1. Forms hypotheses
  2. Investigates systematically (codebase + git history)
  3. Documents each step
  4. Identifies root cause with confidence level
  5. Provides actionable fixes and prevention strategies
- **Output:** `.claude/cache/agents/sleuth/latest-output.md`

**Example:**

```
Task: "Login fails silently"
sleuth:
  - Hypothesis 1: Error swallowed in try/catch
  - Investigates: Finds bare except: pass
  - Hypothesis 2: Missing validation
  - Root cause: Exception handler doesn't log
  - Fix: Add logging + validation
```

#### debug-agent

- **Model:** Opus
- **Purpose:** Issue investigation via logs/code search with MCP tools
- **When to use:** Need debugging with access to MCP tools and external docs
- **Tools:** RepoPrompt, Morph, AST-grep, external documentation
- **Output:** `.claude/cache/agents/debug-agent/latest-output.md`

**Similar to sleuth but with MCP tool access.**

#### profiler

- **Model:** Opus
- **Purpose:** Performance profiling, race conditions, memory issues
- **When to use:** Need to identify bottlenecks, concurrency issues, or memory leaks
- **Analyzes:**
  - CPU profiling
  - Memory profiling
  - Concurrency patterns
  - Database/IO bottlenecks
- **Output:** `.claude/cache/agents/profiler/latest-output.md`
- **Produces:**
  - Quantified performance assessments
  - Optimization recommendations
  - Benchmark comparisons

### 6. Validators

#### arbiter

- **Model:** Opus
- **Purpose:** Unit and integration test execution and validation
- **When to use:** Need to run tests, analyze failures, validate acceptance criteria
- **Features:**
  - Runs pytest/jest/etc
  - Analyzes failures with tracebacks
  - Checks acceptance criteria
  - Root cause analysis
  - Suggests fixes
- **Output:** `.claude/cache/agents/arbiter/latest-output.md`

**Example:**

```
Task: "Run tests and validate auth feature"
arbiter:
  - Runs: pytest tests/auth/
  - Result: 8 passed, 2 failed
  - Analyzes: test_token_refresh failed - KeyError: 'refresh_token'
  - Root cause: Missing field in response
  - Suggests: Add refresh_token to AuthResponse model
```

#### atlas

- **Model:** Opus
- **Purpose:** End-to-end and acceptance test execution
- **When to use:** Need to run E2E tests, browser automation, full-stack validation
- **Tools:** Playwright, Cypress, Selenium
- **Features:**
  - Captures screenshots/videos on failure
  - Validates user journeys
  - API health checks
  - Visual regression checks
- **Output:** `.claude/cache/agents/atlas/latest-output.md`

### 7. Reviewers

#### critic

- **Model:** Sonnet
- **Purpose:** Feature and implementation code review
- **When to use:** Need code quality review for features or implementations
- **Reviews:**
  - Correctness
  - Quality
  - Patterns
  - Testing
  - Documentation
- **Findings:** Categorized by severity (Critical, Suggestion, Nitpick, Question)
- **Output:** `.claude/cache/agents/critic/latest-output.md`

**Example:**

```
Task: "Review auth implementation"
critic:
  - Critical: Password stored in plain text
  - Suggestion: Add rate limiting to login endpoint
  - Nitpick: Use const instead of let for immutable config
  - Question: Why JWT instead of session cookies?
```

#### judge

- **Model:** Sonnet
- **Purpose:** Refactoring and code transformation review
- **When to use:** Verify refactoring preserves behavior and improves quality
- **Checks:**
  - Behavior preservation
  - Quality metrics (complexity, duplication)
  - Safe transformation practices
  - Test coverage maintained
  - Rollback feasibility
- **Output:** `.claude/cache/agents/judge/latest-output.md`

#### surveyor

- **Model:** Sonnet
- **Purpose:** Migration and upgrade review
- **When to use:** Verify migrations are complete, safe, and consistent
- **Audits:**
  - Leftover old patterns
  - New patterns adopted
  - No mixed states
  - Dependencies updated
  - Breaking changes handled
  - Test results
  - Rollback readiness
- **Output:** `.claude/cache/agents/surveyor/latest-output.md`

#### liaison

- **Model:** Sonnet
- **Purpose:** Integration and API review
- **When to use:** Verify integrations are robust, secure, and resilient
- **Checks:**
  - Authentication handling
  - Error handling (all HTTP status codes)
  - Retry logic
  - Circuit breakers
  - Timeouts
  - TLS enforcement
  - Data transformation quality
- **Output:** `.claude/cache/agents/liaison/latest-output.md`

#### plan-reviewer

- **Model:** Sonnet
- **Purpose:** Reviews feature plans and change plans before implementation
- **When to use:** After architect or phoenix creates a plan
- **Auto-detects:** Feature plan vs change plan
- **Checks (feature):**
  - Security considerations
  - Interface definitions
  - Dependencies
  - Test requirements
- **Checks (change):**
  - Tests exist for old patterns
  - Rollback procedures
  - All old patterns found
  - Breaking changes documented
- **Output:** `.claude/cache/agents/plan-reviewer/latest-output.md`

#### review-agent

- **Model:** Opus
- **Purpose:** Compare plan (intent) vs session (reality) vs git diff (changes)
- **When to use:** After implementation, verify code matches plan
- **Gathers:**
  1. Plan file (requirements)
  2. Braintrust session data (what happened)
  3. Git diff (code changes)
- **Produces:**
  - Gap analysis (intent vs reality)
  - Verdict: PASS/FAIL
  - Actionable recommendations
- **Output:** `.claude/cache/agents/review-agent/latest-output.md`

### 8. Specialized

#### aegis

- **Model:** Opus
- **Purpose:** Security vulnerability analysis and audits
- **When to use:** Need to identify vulnerabilities, analyze security risks
- **Audits:**
  - Authentication/authorization
  - Injection vulnerabilities
  - Secrets exposure
  - Dependency vulnerabilities (npm audit, pip-audit)
  - Input validation
  - Hardcoded credentials
- **Output:** `.claude/cache/agents/aegis/latest-output.md`
- **Produces:** Risk-prioritized findings with remediation steps

#### herald

- **Model:** Sonnet
- **Purpose:** Release prep, version bumps, changelog generation
- **When to use:** Need to prepare releases, update versions, generate changelogs
- **Process:**
  1. Gathers changes from git history
  2. Categorizes by conventional commits
  3. Determines version bump (semver)
  4. Updates version files
  5. Generates changelog entries
- **Output:**
  - `.claude/cache/agents/herald/latest-output.md`
  - `CHANGELOG.md`
- **Produces:** Release notes with breaking change migrations

#### scribe

- **Model:** Sonnet
- **Purpose:** Documentation, handoffs, session summaries, ledger management
- **When to use:** Need to document work, create handoffs, update ledgers
- **Creates:**
  - Handoffs: `thoughts/shared/handoffs/<session>/current.md`
  - Ledgers: `thoughts/ledgers/CONTINUITY_CLAUDE-<session>.md`
  - Summaries: `.claude/cache/scribe/latest-summary.md`
- **Follows:** create_handoff and continuity_ledger skill methodologies

#### chronicler

- **Model:** Opus
- **Purpose:** Session analysis, precedent lookup, learning extraction
- **When to use:** Need to analyze past sessions or find relevant precedent
- **Uses:**
  - Braintrust (or JSONL fallback)
  - Artifact Index
- **Output:** `.claude/cache/agents/chronicler/latest-output.md`
- **Produces:**
  - Extracted learnings
  - Relevant past work
  - Recommendations based on history

#### session-analyst

- **Model:** Opus
- **Purpose:** Analyze Claude Code sessions via Braintrust
- **When to use:** Need to analyze session data from Braintrust
- **Output:** `.claude/cache/agents/session-analyst/latest-output.md`

#### braintrust-analyst

- **Model:** (not specified)
- **Purpose:** Execute Braintrust analysis scripts
- **When to use:** Need to run analysis scripts
- **Output:** `.claude/cache/agents/braintrust-analyst/latest-output.md`

#### memory-extractor

- **Model:** (not specified)
- **Purpose:** Extract learnings from sessions for storage
- **When to use:** After completing work, extract learnings for memory system
- **Output:** Learnings stored in archival_memory table

#### onboard

- **Model:** Sonnet
- **Purpose:** Analyze brownfield codebase and create initial continuity ledger
- **When to use:** Starting work on an existing project for the first time
- **Process:**
  1. Analyzes codebase (RepoPrompt or bash)
  2. Detects tech stack
  3. Asks user for goals
  4. Creates initial ledger
- **Output:** `thoughts/ledgers/CONTINUITY_CLAUDE-<session>.md`

#### context-query-agent

- **Model:** (not specified)
- **Purpose:** Query Artifact Index to find relevant precedent
- **When to use:** Need to find past work related to current task
- **Searches:** Handoffs, plans, continuity ledgers, past queries
- **Output:** Concise summary (under 500 tokens)
- **Saves:** Queries for compound learning

## Agent Composition Patterns

### Linear Pipeline

```
scout → architect → plan-reviewer → kraken → arbiter → scribe
```

**When:** Each phase depends on previous output
**Example:** Feature development with research

### Parallel Research

```
scout ─┐
       ├─→ synthesize → architect
oracle ┘
```

**When:** Independent research streams
**Example:** Gather internal patterns + external best practices

### Iterative Refinement

```
architect → critic → architect (revised) → plan-reviewer
```

**When:** Need peer review during planning
**Example:** Complex feature with high stakes

### Test-Fix Loop

```
arbiter → (failures) → spark → arbiter → (pass) → scribe
```

**When:** Fixing test failures
**Example:** CI/CD pipeline failures

### Full Validation Chain

```
kraken → review-agent → arbiter → judge/critic → scribe
```

**When:** Need comprehensive validation
**Example:** Production-critical feature

## Decision Trees

### "I need to implement something"

```
Is it a bug?
├─ YES → sleuth → spark/kraken → arbiter
└─ NO → Is it complex?
    ├─ YES → architect → plan-reviewer → kraken → review-agent
    └─ NO → spark → arbiter
```

### "I need to plan something"

```
What are you planning?
├─ New feature → architect
├─ Refactoring → phoenix
├─ Migration → phoenix
├─ Integration → architect
└─ Quick plan with research → plan-agent
```

### "I need to understand something"

```
What do you need to understand?
├─ This codebase → scout
├─ External project → pathfinder
├─ Best practices → oracle
├─ Comprehensive docs → research-codebase
└─ Past work → chronicler
```

### "I need to validate something"

```
What needs validation?
├─ Plan → plan-reviewer or validate-agent
├─ Feature code → critic
├─ Refactoring → judge
├─ Migration → surveyor
├─ Integration → liaison
├─ Implementation vs plan → review-agent
├─ Tests → arbiter
└─ E2E → atlas
```

## Best Practices

### 1. Choose the Right Model

- **Sonnet agents** (faster, cheaper): scout, spark, critic, judge, surveyor, liaison, scribe, herald, onboard, agentica-agent
- **Opus agents** (thorough, expensive): oracle, pathfinder, architect, phoenix, kraken, arbiter, sleuth, profiler, aegis, maestro, atlas, chronicler

**Rule:** Use Sonnet for routine tasks, Opus for complex/critical work.

### 2. Scout, Not Explore

Always use `scout` for codebase exploration. The deprecated `Explore` agent used Haiku and produced inaccurate results.

### 3. Plan Before Implementing

```
WRONG: /build greenfield "feature" → kraken (no plan)
RIGHT: /build greenfield "feature" → architect → plan-reviewer → kraken
```

### 4. Validate Plans

Always run `plan-reviewer` or `validate-agent` after creating a plan. Catches issues before implementation.

### 5. Use Maestro for Complexity

Don't manually chain 5+ agents. Let maestro orchestrate:

```
WRONG: scout → oracle → architect → plan-reviewer → kraken (manual)
RIGHT: maestro "Design and implement auth system" (automatic)
```

### 6. Check Output Files

Always read the agent's output file, don't just rely on the summary:

```bash
cat .claude/cache/agents/scout/latest-output.md
```

### 7. Resume Kraken Sessions

Kraken supports checkpoints. If context clears mid-implementation:

```
Task(
    prompt="Continue user registration implementation",
    subagent_type="kraken",
    resume="user-registration"
)
```

### 8. Cite Sources in Reviews

All review agents (critic, judge, surveyor, liaison) should reference specific files and line numbers.

### 9. Spark for Small, Kraken for Big

```
Typo fix → spark
New feature → kraken
Configuration change → spark
API implementation → kraken
```

### 10. Validate After Implementation

```
kraken (implement) → review-agent (verify) → arbiter (test)
```

## Agent Models Summary

| Agent         | Model  | Speed | Cost | When to Use                 |
| ------------- | ------ | ----- | ---- | --------------------------- |
| scout         | Sonnet | Fast  | Low  | Routine exploration         |
| oracle        | Opus   | Slow  | High | Critical research           |
| architect     | Opus   | Slow  | High | Feature planning            |
| phoenix       | Opus   | Slow  | High | Refactoring planning        |
| plan-agent    | Opus   | Slow  | High | Research-backed planning    |
| kraken        | Opus   | Slow  | High | Implementation              |
| spark         | Sonnet | Fast  | Low  | Quick fixes                 |
| sleuth        | Opus   | Slow  | High | Bug investigation           |
| profiler      | Opus   | Slow  | High | Performance analysis        |
| arbiter       | Opus   | Slow  | High | Test execution              |
| atlas         | Opus   | Slow  | High | E2E tests                   |
| critic        | Sonnet | Fast  | Low  | Code review                 |
| judge         | Sonnet | Fast  | Low  | Refactoring review          |
| surveyor      | Sonnet | Fast  | Low  | Migration review            |
| liaison       | Sonnet | Fast  | Low  | Integration review          |
| plan-reviewer | Sonnet | Fast  | Low  | Plan validation             |
| review-agent  | Opus   | Slow  | High | Implementation verification |
| scribe        | Sonnet | Fast  | Low  | Documentation               |
| herald        | Sonnet | Fast  | Low  | Release prep                |
| aegis         | Opus   | Slow  | High | Security audit              |
| maestro       | Opus   | Slow  | High | Orchestration               |

## Troubleshooting

### Agent fails with "context too large"

- **Cause:** Agent trying to read too many files
- **Fix:** Use scout to narrow scope first, then spawn specific agent

### Agent produces inaccurate results

- **Cause:** Using wrong model (e.g., Explore instead of Scout)
- **Fix:** Check agent model in `.claude/agents/<agent>.md`

### Agent doesn't have access to tool

- **Cause:** Agent definition missing tool in tools list
- **Fix:** Update agent prompt in `.claude/agents/<agent>.md`

### Kraken checkpoint not found

- **Cause:** Checkpoint file moved or renamed
- **Fix:** Check `thoughts/shared/handoffs/<task>/current.md` exists

### Agent output file empty

- **Cause:** Agent failed before writing output
- **Fix:** Check Claude Code logs for error

## Migration Notes

Recent agent consolidations:

- **nexus** → **architect** (integration planning now in architect)
- **pioneer** → **phoenix** (migration planning now in phoenix)
- **validator, sentinel, warden** → **plan-reviewer** (consolidated reviews)

If you see references to deprecated agents, use their replacements.

## Further Reading

- [Agent Development Guide](../../CONTRIBUTING.md#agents)
- [Task Tool Documentation](../skills/task.md)
- [Maestro Orchestration Patterns](../agents/maestro.md)
- [Kraken Checkpoint System](../agents/kraken.md)
