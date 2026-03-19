# Ralph Patterns Reference

## Verification Checklist

**CRITICAL: Don't trust agent's "I'm done" signal. Verify independently.**

After each agent completes, ALL must pass before marking [x]:

```yaml
Verification Checklist:
  Tests:
    - [ ] Run test suite: `npm test` / `pytest` / `go test ./...`
    - [ ] All tests pass (0 failures)
    - [ ] No test regressions

  Type Check:
    - [ ] Run: `npm run typecheck` / `mypy` / `tsc --noEmit`
    - [ ] No type errors

  Lint:
    - [ ] Run: `npm run lint` / `ruff check` / `golangci-lint`
    - [ ] No new lint errors

  Files:
    - [ ] Expected files exist (from PRD requirements)
    - [ ] No unexpected deletions

  PRD Acceptance:
    - [ ] Changes satisfy PRD requirements
    - [ ] Functionality matches specification
```

### Verification Commands by Stack

```bash
# JavaScript/TypeScript
npm test && npm run typecheck && npm run lint

# Python
pytest && mypy . && ruff check .

# Go
go test ./... && go vet ./...

# Rust
cargo test && cargo check && cargo clippy
```

**If ANY check fails:** Do NOT mark [x]. Pass failure details to recovery agent. Increment retry counter.

## Error Recovery

### 1. Parse Error Output
Extract: error message, stack trace, failed file/line.

### 2. Classify and Route

| Error Type | Recovery |
|------------|----------|
| Syntax error | Retry with spark for quick fix |
| Test failure | Spawn arbiter to investigate |
| Type error | Spawn spark with error context |
| Unclear | Spawn debug-agent |

### 3. Retry Pattern

```
Attempt 1: Original instruction
Attempt 2: Add error context + clearer instruction
Attempt 3: Spawn debug-agent for root cause
Attempt 4: ESCALATE to user
```

Max 3 retries per task before escalation.

### 4. Escalation Format

```
<BLOCKED/>
Story: STORY-001
Task: <description>
Reason: Failed after 3 retry attempts
Errors: [list of errors]
Need: User intervention to diagnose
```

## Plan Gate Pattern

Stress-test the plan before entering the delegation loop. Catches architectural flaws, missing dependencies, and scope creep early -- when changes are cheap.

### When to Apply

- ALWAYS before Phase 3 delegation loop (unless user says "skip premortem")
- Especially critical for: new stack components, external integrations, schema changes

### How It Works

1. Spawn `premortem` agent with PRD path + task file path
2. Agent analyzes: risk of each task, missing dependencies, ordering issues, scope gaps
3. Returns severity-ranked risk list

### Decision Matrix

| Risk Severity | Action |
|---------------|--------|
| HIGH | BLOCK Phase 3. Present to user. Require "accept risks" or "revise plan" |
| MEDIUM | Note in state.json under `risks` key. Proceed with awareness |
| LOW | Log and proceed |

### Example Prompt

```
Spawn premortem agent:
  "Review this PRD and task breakdown for risks:
   PRD: /tasks/prd-<feature>.md
   Tasks: /tasks/tasks-<feature>.md
   Identify: missing dependencies, wrong ordering, scope gaps,
   architectural risks, security concerns.
   Rate each: HIGH/MEDIUM/LOW severity."
```

---

## Goal Verification Pattern

Independent verification that implementation matches PRD acceptance criteria. Prevents the orchestrator from marking its own homework.

### When to Apply

- ALWAYS before merging in Phase 4 (4.1.5)
- After all delegation loop tasks are complete

### How It Works

1. Spawn `plan-reviewer` agent with: PRD path, `git diff main...HEAD`, task list
2. Agent maps each acceptance criterion to actual code changes
3. Returns pass/fail per criterion + gap list

### Decision Matrix

| Result | Action |
|--------|--------|
| All criteria PASS | Proceed to merge |
| Any criteria FAIL | Block merge, route gaps back to delegation loop as new tasks |
| Criteria ambiguous | Ask user to clarify acceptance criteria |

### Example Prompt

```
Spawn plan-reviewer agent:
  "Verify implementation against PRD acceptance criteria:
   PRD: /tasks/prd-<feature>.md
   Tasks: /tasks/tasks-<feature>.md
   Diff: git diff main...HEAD
   For each acceptance criterion, check if the diff satisfies it.
   Return: {criterion: string, status: 'pass'|'fail', evidence: string}[]"
```

---

## DEPLOY Phase (Vercel-linked projects only)

When the project has `.vercel/project.json`, Ralph adds a deployment verification step after VERIFY:

The full TDD cycle becomes: RED -> GREEN -> VERIFY -> DEPLOY (if Vercel-linked)

1. **Delegate** to `deployer` agent: "Verify preview deployment for task X.Y"
2. **Deployer checks**: latest deployment status, build logs, preview URL
3. **Pass criteria**: `deploy_status: "preview_success"` in verification block
4. **Fail handling**: If deploy fails, create a follow-up fix task (don't block the current task)

This phase is **skipped** for non-Vercel projects (no `.vercel/project.json`).

Template control:
- `deploy_on_complete: preview` (default for Vercel projects) -- verify preview deploy
- `deploy_on_complete: none` -- skip deploy verification even in Vercel projects

## Phase 4: Store Learnings

After successful completion, store for future features:

```bash
cd $CLAUDE_OPC_DIR && PYTHONPATH=. uv run python scripts/core/store_learning.py \
  --session-id "ralph-<feature-name>" \
  --type ARCHITECTURAL_DECISION \
  --content "<summary of what worked, patterns used, decisions made>" \
  --context "<feature name and type>" \
  --tags "ralph,feature,<stack-tags>" \
  --confidence high
```

### What to Store

| Type | Content Example |
|------|-----------------|
| `ARCHITECTURAL_DECISION` | "Used React Query for data fetching with optimistic updates" |
| `WORKING_SOLUTION` | "Parallel agent spawning for independent files reduced time by 40%" |
| `CODEBASE_PATTERN` | "Authentication middleware follows existing pattern in src/auth/" |
| `ERROR_FIX` | "Type error in form validation - fixed by adding explicit generic" |

**Automated by Hooks:**
- `prd-roadmap-sync` hook updates ROADMAP.md with completion
- `roadmap-completion` hook marks goals as done when TaskUpdate fires

## Learning Feedback Loop

```
Session 1: Agent implements auth middleware
  → Fails: forgot token refresh
  → Stored: [FAILED_APPROACH] "Auth without refresh handling"

Session 2: Agent implements similar auth
  → Recalls: "Auth without refresh" (similarity: 0.85)
  → Sees: "Error: tokens expired mid-session"
  → Applies: Adds refresh logic proactively
  → Succeeds
  → Stored: [WORKING_SOLUTION] "Auth with token refresh"

Session 3+: Future agents see both patterns
  → Avoid the failure, apply the solution
```

## PRD Template Fields

PRD lives at `/tasks/prd-<feature>.md`. Required sections:

- Overview / Goal
- Target User
- Core Functionality
- Out of Scope
- Technical Considerations (include memory learnings + knowledge tree paths)
- Acceptance Criteria

Load template: `cat ~/.claude/ai-dev-tasks/create-prd.md`

## Task Breakdown Template

Tasks live at `/tasks/tasks-<feature>.md`. Format:

```
Parent: 1.0 Feature Name
  1.1 Sub-task: specific atomic work
  1.2 Sub-task: another atomic piece
  ...
```

**Tracer bullet ordering:** Build simplest end-to-end path first (happy path through full stack), then layer error handling, edge cases, optimizations. Validates wiring early.

Load template: `cat ~/.claude/ai-dev-tasks/generate-tasks.md`

## Example Session

```
User: Build a contact form with email validation

Ralph:
1. "Let me gather requirements..." [AskUserQuestion]
2. [Asks 3-5 clarifying questions with A/B/C options]
3. "Generating PRD to /tasks/prd-contact-form.md..." [Write PRD]
4. "Breaking into tasks..." [Write tasks]
5. "Starting delegation loop..."
6. [Task(arbiter)] "Write failing tests for form component"
7. [Task(kraken)] "Implement form to pass tests" + [Task(kraken)] "Implement validation logic" # parallel
8. [Waits, runs verification checklist]
9. [Task(arbiter)] "Verify full suite passes"
10. "All checks pass. Merging to main. Storing learnings."
```

Note: Ralph NEVER called Edit/Write for implementation. All went through Task tool.
