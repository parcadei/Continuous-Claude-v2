---
name: build
description: Workflow orchestrator that chains existing skills for feature development
user_invocable: true
keywords: [build, greenfield, brownfield, tdd, refactor, workflow, orchestrate]
---

# Build - Workflow Orchestrator

You are a workflow orchestrator that chains existing skills for feature development. You coordinate the execution of multiple skills in sequence, passing handoffs between them and pausing for human checkpoints at phase boundaries.

## When to Use

Activate when user says things like:
- "/build"
- "build a feature"
- "implement a new feature"
- "create something new"
- "start a project"
- "greenfield development"
- "brownfield development"
- "I want to build X"
- "let's start working on X"

## Invocation

```
/build <mode> [options] [description]
```

## Question Flow (No Arguments)

If the user types just `/build` with no or partial arguments, guide them through this question flow to infer the right configuration. Use AskUserQuestion for each phase.

### Phase 0: Workflow Selection

```yaml
question: "What would you like to do?"
header: "Workflow"
options:
  - label: "Help me choose (Recommended)"
    description: "I'll ask a few questions to pick the right workflow"
  - label: "Greenfield - new feature"
    description: "Chain: discovery → plan → validate → implement → commit → PR"
  - label: "Brownfield - existing code"
    description: "Chain: onboard → research → plan → validate → implement"
  - label: "TDD - test-first"
    description: "Chain: plan → test-driven-development → implement"
  - label: "Refactor - improve structure"
    description: "Chain: impact analysis → plan → TDD → implement"
```

**Mapping:**
- "Help me choose" → Continue to Phase 1-4 questions
- "Greenfield" → Set mode=greenfield, skip to Phase 5 (description)
- "Brownfield" → Set mode=brownfield, skip to Phase 5 (description)
- "TDD" → Set mode=tdd, skip to Phase 5 (description)
- "Refactor" → Set mode=refactor, skip to Phase 5 (description)

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to understand your workflow needs. Did you mean..."
header: "Clarify"
options:
  - label: "Help me choose"
    description: "Not sure which workflow - guide me through questions"
  - label: "Greenfield - new feature"
    description: "Building something new with no existing code"
  - label: "Brownfield - existing code"
    description: "Adding to or modifying existing codebase"
  - label: "Neither - let me explain differently"
    description: "I'll describe what I'm trying to do"
```

### Phase 1: Project Context

```yaml
question: "Is this a new feature or work in existing code?"
header: "Context"
options:
  - label: "New feature from scratch"
    description: "No existing code to integrate with"
  - label: "Adding to existing codebase"
    description: "Need to understand current code first"
  - label: "Refactoring existing code"
    description: "Improving without changing behavior"
```

**Mapping:**
- "New feature from scratch" → greenfield mode
- "Adding to existing codebase" → brownfield mode
- "Refactoring existing code" → refactor mode

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to make sure I understand. Did you mean..."
header: "Clarify"
options:
  - label: "New feature from scratch"
    description: "Building something new with no existing code"
  - label: "Adding to existing codebase"
    description: "Integrating with code that already exists"
  - label: "Refactoring existing code"
    description: "Improving structure without changing behavior"
  - label: "Neither - let me explain differently"
    description: "I'll provide more details"
```

### Phase 2: Requirements Clarity

```yaml
question: "How clear are your requirements?"
header: "Requirements"
options:
  - label: "I have a clear spec/description"
    description: "Know exactly what to build"
  - label: "I have a rough idea"
    description: "Need help fleshing out details"
  - label: "Just exploring possibilities"
    description: "Want to discover what's possible"
```

**Mapping:**
- "Clear spec" → --skip-discovery
- "Rough idea" → run discovery-interview first
- "Exploring" → run discovery-interview with broader scope

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to make sure I understand your requirements state. Did you mean..."
header: "Clarify"
options:
  - label: "I have a clear spec/description"
    description: "Ready to implement - no discovery needed"
  - label: "I have a rough idea"
    description: "Need some help defining the details"
  - label: "Just exploring possibilities"
    description: "Don't know exactly what's possible yet"
  - label: "Neither - let me explain differently"
    description: "I'll describe my situation better"
```

### Phase 3: Development Approach

```yaml
question: "How should I approach development?"
header: "Approach"
options:
  - label: "Just implement it"
    description: "Standard implementation flow"
  - label: "Write tests first (TDD)"
    description: "Test-driven development"
  - label: "Validate plan before coding"
    description: "Get plan reviewed before implementation"
```

**Mapping:**
- "Just implement" → standard chain
- "Tests first" → tdd mode (overrides previous if not refactor)
- "Validate plan" → keep validate-agent in chain

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to make sure I understand your preferred approach. Did you mean..."
header: "Clarify"
options:
  - label: "Just implement it"
    description: "Standard development - implement then test"
  - label: "Write tests first (TDD)"
    description: "Test-driven - tests before implementation"
  - label: "Validate plan before coding"
    description: "Review plan with validate-agent first"
  - label: "Neither - let me explain differently"
    description: "I have a different workflow in mind"
```

### Phase 4: Post-Implementation

```yaml
question: "What should happen after implementation?"
header: "Finish"
multiSelect: true
options:
  - label: "Auto-commit changes"
    description: "Create git commit when done"
  - label: "Create PR description"
    description: "Generate PR summary"
  - label: "Just leave files changed"
    description: "I'll handle git myself"
```

**Mapping:**
- No "Auto-commit" selected → --skip-commit
- No "Create PR" selected → --skip-pr

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to understand what you need after implementation. Which apply?"
header: "Clarify"
multiSelect: true
options:
  - label: "Auto-commit changes"
    description: "I'll create a git commit with your changes"
  - label: "Create PR description"
    description: "I'll generate a PR summary for you"
  - label: "Just leave files changed"
    description: "No git operations - you'll handle it"
  - label: "Neither - let me explain differently"
    description: "I have different post-implementation needs"
```

### Phase 5: Description

Finally, ask for the feature description:

```yaml
question: "Describe what you want to build (1-2 sentences):"
header: "Feature"
options: []  # Free text input via "Other"
```

### Summary Before Execution

Before starting, show what will run:

```
Based on your answers, I'll run:

**Mode:** brownfield
**Chain:** onboard → research-codebase → plan-agent → implement_plan
**Options:** --skip-commit
**Description:** "Add user authentication with OAuth"

Proceed? [Yes / Adjust settings]
```

This ensures the user knows exactly what will happen before any agents spawn.

## Modes

| Mode | Chain | Use Case |
|------|-------|----------|
| `greenfield` | discovery-interview -> plan-agent -> validate-agent -> implement_plan -> commit -> describe_pr | New feature from scratch |
| `brownfield` | onboard -> research-codebase -> plan-agent -> validate-agent -> implement_plan | Feature in existing codebase |
| `tdd` | plan-agent -> test-driven-development -> implement_plan | Test-first implementation |
| `refactor` | tldr-code (impact) -> plan-agent -> test-driven-development -> implement_plan | Safe refactoring with impact analysis |

## Options

| Option | Effect |
|--------|--------|
| `--skip-discovery` | Skip interview phase (use existing spec or description) |
| `--skip-validate` | Skip validation phase (trust plan as-is) |
| `--skip-commit` | Don't auto-commit after implementation |
| `--skip-pr` | Don't create PR description |
| `--parallel` | Run independent research agents in parallel |

## Handoff Directory

All handoffs go to: `thoughts/shared/handoffs/<session>/`

Session name derived from:
1. Existing continuity ledger name, OR
2. Generated from feature description: `build-<date>-<kebab-description>`

## Orchestration Process

### Step 0: Parse Arguments

Parse the mode and options from user input:

```
/build greenfield --skip-validate Add user authentication
       ^mode      ^options        ^description
```

Build the skill chain based on mode:

```python
CHAINS = {
    "greenfield": ["discovery-interview", "plan-agent", "validate-agent", "implement_plan", "commit", "describe_pr"],
    "brownfield": ["onboard", "research-codebase", "plan-agent", "validate-agent", "implement_plan"],
    "tdd": ["plan-agent", "test-driven-development", "implement_plan"],
    "refactor": ["tldr-impact", "plan-agent", "test-driven-development", "implement_plan"]
}
```

Apply options to modify chain:
- `--skip-discovery`: Remove "discovery-interview" from chain
- `--skip-validate`: Remove "validate-agent" from chain
- `--skip-commit`: Remove "commit" from chain
- `--skip-pr`: Remove "describe_pr" from chain

### Step 1: Setup

1. Create handoff directory:
   ```bash
   SESSION="build-$(date +%Y%m%d)-<kebab-description>"
   mkdir -p "thoughts/shared/handoffs/$SESSION"
   ```

2. Create orchestration state file:
   ```bash
   cat > "thoughts/shared/handoffs/$SESSION/orchestration.yaml" << EOF
   session: $SESSION
   mode: <mode>
   options: [<options>]
   description: "<description>"
   started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
   chain: [<skill1>, <skill2>, ...]
   current_phase: 0
   phases:
     - skill: <skill1>
       status: pending
     - skill: <skill2>
       status: pending
     ...
   EOF
   ```

### Step 2: Execute Chain

For each skill in the chain:

#### Phase Execution Pattern

```
1. Read previous handoff (if exists)
2. Execute skill (spawn agent or invoke directly)
3. Capture skill output/handoff
4. Update orchestration state
5. Human checkpoint (if phase boundary)
6. Continue or handle error
```

#### Skill Execution Details

**discovery-interview:**
```
Task(
  subagent_type="discovery-interview",
  prompt="""
  [Contents of discovery-interview SKILL.md]

  ---

  ## Context
  Feature request: <description>
  Handoff directory: thoughts/shared/handoffs/<session>/

  Conduct the interview and create spec.
  """
)
```
Output: Spec file at `thoughts/shared/specs/<name>-spec.md`

**onboard:**
```
Task(
  subagent_type="onboard",
  prompt="""
  [Contents of onboard SKILL.md]

  ---

  Analyze this codebase and create continuity ledger.
  Handoff directory: thoughts/shared/handoffs/<session>/
  """
)
```
Output: TLDR caches, continuity ledger

**research-codebase:**
```
Task(
  subagent_type="research-codebase",
  prompt="""
  [Contents of research-codebase SKILL.md]

  ---

  Research question: How should we implement <description>?
  Focus areas: [based on spec or description]
  Handoff directory: thoughts/shared/handoffs/<session>/
  """
)
```
Output: Research document at `thoughts/shared/research/<date>-<topic>.md`

**tldr-impact (for refactor mode):**
```bash
# Run impact analysis on the function/module being refactored
tldr impact <target> src/ --depth 3 > thoughts/shared/handoffs/<session>/impact-analysis.json

# Also run architecture analysis
tldr arch src/ > thoughts/shared/handoffs/<session>/architecture.json
```
Output: Impact and architecture analysis files

**plan-agent:**
```
Task(
  subagent_type="plan-agent",
  prompt="""
  [Contents of plan-agent SKILL.md]

  ---

  ## Context
  Feature request: <description>

  [Include spec if exists from discovery-interview]
  [Include research findings if exists]
  [Include impact analysis if refactor mode]

  Handoff directory: thoughts/shared/handoffs/<session>/
  """
)
```
Output: Plan at `thoughts/shared/plans/PLAN-<name>.md`, handoff at `<session>/plan-<name>.md`

**CHECKPOINT: After plan-agent**
```
Plan created: thoughts/shared/plans/PLAN-<name>.md

Please review the plan. Options:
1. Approve and continue to [next phase]
2. Request changes to plan
3. Abort workflow

[Show plan summary]
```

**validate-agent:**
```
Task(
  subagent_type="validate-agent",
  prompt="""
  [Contents of validate-agent SKILL.md]

  ---

  Plan to validate: [Plan content]
  Plan path: thoughts/shared/plans/PLAN-<name>.md
  Handoff directory: thoughts/shared/handoffs/<session>/
  """
)
```
Output: Validation handoff at `<session>/validation-<name>.md`

**CHECKPOINT: After validate-agent (if issues found)**
```
Validation complete with issues:
- [Issue 1]
- [Issue 2]

Options:
1. Proceed anyway (acknowledge risks)
2. Update plan and re-validate
3. Abort workflow
```

**test-driven-development (for tdd/refactor modes):**
```
Present TDD guidance to user:

"Entering TDD mode. For each feature:
1. Write failing test first
2. Implement minimal code to pass
3. Refactor while keeping tests green

I'll guide you through each cycle. Starting with first test..."
```
This is interactive - guide user through TDD cycles.

**implement_plan:**
```
# Check plan size
if task_count <= 3:
    # Direct implementation
    Follow implement_plan skill directly
else:
    # Agent orchestration mode
    For each task:
        Task(
          subagent_type="implement_task",
          prompt="""
          [Contents of implement_task SKILL.md]

          ---

          Plan: [Plan content]
          Your task: Task N of M: <task description>
          Previous handoff: [Previous task handoff or "First task"]
          Handoff directory: thoughts/shared/handoffs/<session>/
          """
        )
```
Output: Task handoffs at `<session>/task-NN-<description>.md`

**CHECKPOINT: After each implementation phase**
```
Phase [N] Complete

Automated verification:
- [x] Tests passing
- [x] Type check passed
- [ ] Manual testing required

Please verify:
- [Manual test items from plan]

Continue to next phase? [Y/n]
```

**commit:**
```
Follow commit skill:
1. Show git status and diff
2. Present commit plan
3. Execute on user approval
4. Generate reasoning file
```

**describe_pr:**
```
Follow describe_pr skill:
1. Create PR if not exists
2. Generate description from changes
3. Update PR with description
```

### Step 3: Handle Errors

If any phase fails or returns blocked status:

```yaml
# Update orchestration.yaml
phases:
  - skill: plan-agent
    status: complete
  - skill: validate-agent
    status: blocked
    error: "Validation found deprecated library"
    blocker: "Need to replace X with Y"
```

Present to user:
```
Workflow blocked at: validate-agent

Issue: Validation found deprecated library
Blocker: Need to replace X with Y

Options:
1. Retry this phase
2. Skip this phase (not recommended)
3. Abort workflow
4. Manual intervention (I'll help you fix it)
```

### Step 4: Completion

When all phases complete:

```
Build workflow complete!

Session: thoughts/shared/handoffs/<session>/

Artifacts created:
- Spec: thoughts/shared/specs/<name>-spec.md (if greenfield)
- Plan: thoughts/shared/plans/PLAN-<name>.md
- Validation: <session>/validation-<name>.md
- Implementation handoffs: <session>/task-*.md
- PR: #<number> (if --skip-pr not set)

Commit: <hash> (if --skip-commit not set)

Total phases: N completed, M skipped
```

## Human Checkpoints

Checkpoints pause for human verification at critical decision points:

| After Phase | Checkpoint Purpose |
|-------------|-------------------|
| discovery-interview | Verify spec captures requirements |
| plan-agent | Approve implementation plan |
| validate-agent (if issues) | Acknowledge validation concerns |
| Each implement task | Verify phase works before continuing |
| commit | Approve commit message and files |

**To skip checkpoints:** Run with `--no-checkpoint` (advanced users only)

## Resume Support

If workflow is interrupted, resume from last checkpoint:

```bash
/build resume thoughts/shared/handoffs/<session>/
```

This reads `orchestration.yaml` and continues from the last incomplete phase.

## Example Sessions

### Greenfield Feature

```
User: /build greenfield Add user authentication with OAuth

Claude: Starting greenfield workflow for "Add user authentication with OAuth"

Creating session: build-20260108-user-auth-oauth
Chain: discovery-interview -> plan-agent -> validate-agent -> implement_plan -> commit -> describe_pr

Phase 1/6: Discovery Interview
[Spawns discovery-interview agent]

Interview questions:
1. What OAuth providers do you need? (Google, GitHub, etc.)
2. What user data should we store after auth?
3. Should sessions persist across browser closes?
...

[After interview completes]

Spec created: thoughts/shared/specs/2026-01-08-user-auth-spec.md

Phase 2/6: Planning
[Spawns plan-agent]

Plan created: thoughts/shared/plans/PLAN-user-auth.md

--- CHECKPOINT ---
Plan Summary:
- Task 1: Set up OAuth provider configuration
- Task 2: Create user model and session storage
- Task 3: Implement OAuth callback endpoints
- Task 4: Add auth middleware
- Task 5: Create login/logout routes

Approve plan and continue? [Y/n]

User: Y

Phase 3/6: Validation
[Spawns validate-agent]

Validation: PASSED
All tech choices are current best practices.

Phase 4/6: Implementation (5 tasks)
[Spawns implementation agents for each task]

Task 1/5: OAuth configuration... Complete
Task 2/5: User model... Complete
Task 3/5: OAuth callbacks... Complete
Task 4/5: Auth middleware... Complete
Task 5/5: Login/logout routes... Complete

--- CHECKPOINT ---
All implementation complete.
Tests: 24 passing
Manual verification needed:
- [ ] Test OAuth flow end-to-end
- [ ] Verify session persistence

Continue to commit? [Y/n]

User: Y

Phase 5/6: Commit
[Shows changes, creates commit]

Phase 6/6: PR Description
[Creates/updates PR]

Build complete!
PR #42: https://github.com/user/repo/pull/42
```

### TDD Mode

```
User: /build tdd Add rate limiting to API endpoints

Claude: Starting TDD workflow for "Add rate limiting to API endpoints"

Phase 1/3: Planning
[Creates plan with test specifications]

--- CHECKPOINT ---
Plan approved? [Y/n]

User: Y

Phase 2/3: TDD Implementation

Let's start with the first test. According to the plan, we need to test:
"Rate limiter returns 429 after 100 requests per minute"

RED - Write failing test:
```python
def test_rate_limiter_returns_429_after_limit():
    limiter = RateLimiter(limit=100, window=60)
    for _ in range(100):
        assert limiter.check("user1") == True
    assert limiter.check("user1") == False
```

Running test... FAILED (as expected - RateLimiter doesn't exist)

GREEN - Implement minimal code:
[Guides through implementation]

Running test... PASSED

REFACTOR - Any cleanup needed?

Next test: "Rate limiter resets after window expires"
...

Phase 3/3: Implementation
[Integrates rate limiter into endpoints]

Build complete!
```

### Refactor Mode

```
User: /build refactor Extract auth logic into separate module

Claude: Starting refactor workflow for "Extract auth logic into separate module"

Phase 1/4: Impact Analysis
Running: tldr impact auth src/ --depth 3

Impact analysis complete:
- 12 files directly call auth functions
- 3 entry points affected
- No circular dependencies detected

Architecture analysis:
- auth is currently in: src/api/middleware/
- Callers in: src/api/routes/, src/api/handlers/

--- CHECKPOINT ---
Review impact before planning? [Y/n]

User: Y

[Shows detailed impact report]

Phase 2/4: Planning
[Creates refactor plan based on impact analysis]

...
```

## Error Recovery

### If a phase fails:

```
Phase 3 (validate-agent) failed:

Error: WebSearch unavailable

Options:
1. Retry phase (recommended)
2. Skip validation (--skip-validate)
3. Abort workflow

Choice:
```

### If implementation is blocked:

```
Task 3/5 blocked:

Blocker: Database schema doesn't match expected structure
Found: users.email (VARCHAR)
Expected: users.email (UNIQUE VARCHAR)

Options:
1. Create migration to fix schema
2. Adjust plan to work with current schema
3. Abort and investigate

Choice:
```

## Parallel Execution

With `--parallel` option, independent phases run concurrently:

```
/build brownfield --parallel Add dashboard feature

Phase 1: Onboard (started)
Phase 2: Research-codebase (started in parallel)

[Both complete]

Phase 3: Plan-agent (uses results from both)
...
```

Only truly independent phases run in parallel. Dependencies are respected.

## Configuration

### Default mode preferences

Set in `.claude/settings.json`:

```json
{
  "skills": {
    "build": {
      "default_mode": "brownfield",
      "always_validate": true,
      "auto_commit": false,
      "checkpoint_phases": ["plan-agent", "implement_plan"]
    }
  }
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No continuity ledger found" | Run `/onboard` first or use greenfield mode |
| "Plan validation failed" | Review validation output, update plan |
| "Implementation blocked" | Check blocker in handoff, resolve dependency |
| "Workflow stuck" | Check `orchestration.yaml` for state, resume or restart |

## Related Skills

- `/discovery-interview` - Deep interview for requirements
- `/plan-agent` - Create implementation plans
- `/validate-agent` - Validate tech choices
- `/implement_plan` - Execute implementation plans
- `/implement_task` - Single task implementation
- `/test-driven-development` - TDD workflow
- `/commit` - Create commits
- `/describe_pr` - Generate PR descriptions
- `/onboard` - Codebase analysis
- `/research-codebase` - Research existing code
- `/tldr-code` - Code analysis CLI
