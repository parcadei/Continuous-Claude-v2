---
name: fix
description: Meta-skill workflow orchestrator for bug investigation and resolution. Routes to debug, implement, test, and commit based on scope.
allowed-tools: [Bash, Read, Grep, Write, Edit, Task]
---

# Fix

Workflow orchestrator for bug investigation and resolution. Chains specialized skills based on issue scope.

## Usage

```
/fix <scope> [options] [description]
```

## Question Flow (No Arguments)

If the user types just `/fix` with no or partial arguments, guide them through this question flow. Use AskUserQuestion for each phase.

### Phase 0: Workflow Selection

```yaml
question: "What would you like to fix?"
header: "Fix type"
options:
  - label: "Help me choose (Recommended)"
    description: "I'll ask questions to pick the right fix workflow"
  - label: "Bug - something is broken"
    description: "Chain: investigate → diagnose → implement → test → commit"
  - label: "Hook - Claude Code hook issue"
    description: "Chain: debug-hooks → hook-developer → implement → test"
  - label: "Dependencies - import/package errors"
    description: "Chain: preflight → research → plan → implement → qlty-check"
  - label: "PR Comments - address reviewer feedback"
    description: "Chain: github-search → research → plan → implement → commit"
```

**Mapping:**
- "Help me choose" → Continue to Phase 1-4 questions
- "Bug" → Set scope=bug, skip to Phase 2 (issue details)
- "Hook" → Set scope=hook, skip to Phase 2 (issue details)
- "Dependencies" → Set scope=deps, skip to Phase 2 (issue details)
- "PR Comments" → Set scope=pr-comments, skip to Phase 2 (issue details)

**If Answer is Unclear (via "Other"):**
```yaml
question: "I want to understand what kind of fix you need. Did you mean..."
header: "Clarify"
options:
  - label: "Help me choose"
    description: "Not sure - guide me through questions"
  - label: "Bug - something is broken"
    description: "Code isn't working as expected"
  - label: "Hook - Claude Code hook issue"
    description: "Hooks not firing or producing wrong output"
  - label: "Neither - let me explain differently"
    description: "I'll describe my issue"
```

### Phase 1: Issue Type

```yaml
question: "What kind of issue are you dealing with?"
header: "Issue type"
options:
  - label: "Something is broken/not working"
    description: "Bug in the code"
  - label: "Claude Code hook not firing"
    description: "Hook-specific debugging"
  - label: "Import/dependency errors"
    description: "Package or module issues"
  - label: "Need to address PR feedback"
    description: "Reviewer comments to fix"
```

**Mapping:**
- "Something broken" → bug scope
- "Hook not firing" → hook scope
- "Import errors" → deps scope
- "PR feedback" → pr-comments scope

### Phase 2: Issue Details

```yaml
question: "Can you describe the issue?"
header: "Details"
options: []  # Free text - user describes the problem
```

Capture the error message, unexpected behavior, or PR link.

### Phase 3: Investigation Depth

```yaml
question: "How should I investigate?"
header: "Investigation"
options:
  - label: "Diagnose and fix"
    description: "Find the problem and implement a fix"
  - label: "Diagnose only (dry run)"
    description: "Just tell me what's wrong, don't change code"
  - label: "Quick fix"
    description: "I know the issue, just fix it fast"
```

**Mapping:**
- "Diagnose only" → --dry-run
- "Quick fix" → skip investigation, go straight to spark agent

### Phase 4: Testing & Commit

```yaml
question: "After fixing, should I..."
header: "After fix"
multiSelect: true
options:
  - label: "Write a regression test"
    description: "Prevent this bug from recurring"
  - label: "Commit the fix"
    description: "Create a git commit"
  - label: "Just fix, nothing else"
    description: "I'll handle tests and git"
```

**Mapping:**
- No "regression test" → --no-test
- No "commit" → --no-commit

### Summary Before Execution

```
Based on your answers, I'll run:

**Scope:** bug
**Issue:** "Login button not responding on Safari"
**Chain:** sleuth (investigate) → spark (fix) → arbiter (test) → commit
**Options:** (none)

Proceed? [Yes / Adjust settings]
```

## Scopes

| Scope | Chain | Description |
|-------|-------|-------------|
| `bug` | debug -> implement_task -> test-driven-development -> commit | General bug fix workflow |
| `hook` | debug-hooks -> hook-developer -> implement_task -> test hook | Hook-specific debugging |
| `deps` | dependency-preflight -> oracle -> plan-agent -> implement_plan -> qlty-check | Dependency issues |
| `pr-comments` | github-search -> research-codebase -> plan-agent -> implement_plan -> commit | Address PR feedback |

## Options

| Option | Effect |
|--------|--------|
| `--no-test` | Skip regression test creation |
| `--dry-run` | Diagnose only, don't implement fix |
| `--no-commit` | Don't auto-commit the fix |

## Workflow

### Phase 1: Parse Arguments

```bash
# Parse scope and options
SCOPE="${1:-bug}"
NO_TEST=false
DRY_RUN=false
NO_COMMIT=false

for arg in "$@"; do
  case $arg in
    --no-test) NO_TEST=true ;;
    --dry-run) DRY_RUN=true ;;
    --no-commit) NO_COMMIT=true ;;
  esac
done
```

### Phase 2: Investigation (Parallel)

Spawn sleuth agent for parallel investigation:

```
Task(
  subagent_type="sleuth",
  prompt="""
  Investigate this issue in parallel:

  1. **Logs**: Check recent logs for errors
     - Application logs
     - System logs if relevant
     - Build/test output

  2. **Database State** (if applicable):
     - Check for stuck/invalid records
     - Verify schema matches expectations

  3. **Git State**:
     - Recent commits that might relate
     - Uncommitted changes
     - Current branch context

  4. **Runtime State**:
     - Running processes
     - Port conflicts
     - Environment variables

  Issue description: {user_description}

  Return structured findings with evidence.
  """
)
```

### Phase 3: Diagnosis Report

Present findings to user:

```markdown
## Diagnosis Report

### Scope: {scope}

### Evidence Found

**Logs:**
- [Finding with timestamp/line reference]

**Database:**
- [Finding with table/query reference]

**Git State:**
- [Recent relevant commits]
- [Uncommitted changes]

**Runtime:**
- [Process/port findings]

### Root Cause Analysis

**Primary Hypothesis:** [Most likely cause based on evidence]

**Supporting Evidence:**
1. [Evidence 1]
2. [Evidence 2]

**Alternative Hypotheses:**
- [Alternative 1]: [Why less likely]

### Proposed Fix

**Approach:** [How to fix]

**Files to Modify:**
- `path/to/file.ts:123` - [Change description]

**Risk Assessment:** [Low/Medium/High] - [Why]

---

**Proceed with fix?** (yes/no/modify approach)
```

### Phase 4: Human Checkpoint (Diagnosis)

**REQUIRED:** Wait for user confirmation before implementing.

```
AskUserQuestion(
  question="Proceed with the proposed fix?",
  options=["yes", "no", "modify"]
)
```

If user says "modify", gather new requirements and update approach.
If user says "no", create diagnostic handoff and exit.
If `--dry-run`, create diagnostic handoff and exit here.

### Phase 4.5: Risk Assessment (Premortem)

**After diagnosis approval, before implementation:**

Run a quick premortem on the proposed fix to catch risks:

```
/premortem quick
```

**Context for premortem:**
```yaml
premortem:
  mode: quick
  context: "Bug fix for {diagnosis.root_cause}"

  check_for:
    - Will this fix break other functionality?
    - Is rollback possible if fix causes issues?
    - Are there related edge cases not covered?
    - Does the fix match codebase patterns?
    - Any external dependencies affected?
```

**Risk Decision:**
- **No HIGH tigers**: Proceed to implementation
- **HIGH tigers found**: Present to user with options:
  - Accept risks and proceed
  - Modify approach to address risks
  - Research mitigation strategies

```
AskUserQuestion(
  question="Pre-mortem found {n} risks in the proposed fix. Proceed?",
  options=[
    "Accept risks and implement",
    "Modify fix approach",
    "Research mitigations first"
  ]
)
```

If "Research mitigations", spawn scout + oracle in parallel per risk, then re-present options.

### Phase 5: Implementation

Route to appropriate implementation skill based on scope:

#### bug scope:
```
Task(
  subagent_type="kraken",
  prompt="""
  Implement fix with TDD approach.

  Root cause: {diagnosis.root_cause}
  Files: {diagnosis.files_to_modify}
  Approach: {diagnosis.approach}

  Follow implement_task workflow:
  1. Write failing test that reproduces the bug
  2. Implement minimal fix to pass test
  3. Refactor if needed
  4. Run full test suite
  """
)
```

#### hook scope:
```
Task(
  subagent_type="kraken",
  prompt="""
  Fix hook issue.

  Root cause: {diagnosis.root_cause}

  Follow hook-developer patterns:
  1. Check hook registration in settings.json
  2. Verify shell wrapper exists and is executable
  3. Test hook manually with mock input
  4. Rebuild if TypeScript source was modified
  5. Verify hook fires correctly
  """
)
```

#### deps scope:
```
Task(
  subagent_type="kraken",
  prompt="""
  Fix dependency issue.

  Root cause: {diagnosis.root_cause}

  Follow plan-agent workflow:
  1. Research correct dependency versions
  2. Create implementation plan
  3. Update lockfiles
  4. Run dependency-preflight
  5. Run qlty-check
  """
)
```

#### pr-comments scope:
```
Task(
  subagent_type="kraken",
  prompt="""
  Address PR feedback.

  Comments: {diagnosis.pr_comments}

  Follow plan-agent workflow:
  1. Research codebase for context
  2. Create implementation plan for each comment
  3. Implement changes
  4. Commit with reference to comment
  """
)
```

### Phase 6: Regression Test (unless --no-test)

```
Task(
  subagent_type="kraken",
  prompt="""
  Create regression test for the fix.

  Bug: {original_issue}
  Fix: {implementation_summary}

  Follow test-driven-development:
  1. Write test that would have caught this bug
  2. Verify test fails against pre-fix code (mentally)
  3. Verify test passes against fixed code
  4. Test should be minimal and focused
  """
)
```

### Phase 7: Human Checkpoint (Verification)

```
AskUserQuestion(
  question="Fix implemented. Please verify and confirm.",
  options=["looks good", "needs adjustment", "revert"]
)
```

If "needs adjustment", gather feedback and return to Phase 5.
If "revert", run rollback command and exit.

### Phase 8: Commit (unless --no-commit)

```
Task(
  subagent_type="general-purpose",
  prompt="""
  Follow commit skill:

  1. Review changes with git diff
  2. Create descriptive commit message
  3. Reference issue/ticket if applicable
  4. Present plan and await confirmation
  5. Execute commit
  """
)
```

## Chain Details by Scope

### bug

```
sleuth (investigation)
  |
  v
[HUMAN CHECKPOINT: diagnosis]
  |
  v
[PREMORTEM: quick risk check]
  |
  v
kraken (implement_task + TDD)
  |
  v
kraken (regression test)
  |
  v
[HUMAN CHECKPOINT: verification]
  |
  v
commit
```

### hook

```
debug-hooks (structured investigation)
  |
  v
[HUMAN CHECKPOINT: diagnosis]
  |
  v
[PREMORTEM: quick risk check]
  |
  v
kraken (implement_task + hook-developer patterns)
  |
  v
test hook manually
  |
  v
[HUMAN CHECKPOINT: verification]
  |
  v
commit
```

### deps

```
dependency-preflight (check current state)
  |
  v
oracle (find correct versions/alternatives)
  |
  v
plan-agent (create fix plan)
  |
  v
[HUMAN CHECKPOINT: diagnosis + plan review]
  |
  v
[PREMORTEM: quick risk check]
  |
  v
kraken (implement_plan)
  |
  v
qlty-check
  |
  v
[HUMAN CHECKPOINT: verification]
  |
  v
commit
```

### pr-comments

```
github-search (fetch PR context)
  |
  v
research-codebase (understand context)
  |
  v
plan-agent (plan for each comment)
  |
  v
[HUMAN CHECKPOINT: plan review]
  |
  v
[PREMORTEM: quick risk check]
  |
  v
kraken (implement_plan)
  |
  v
[HUMAN CHECKPOINT: verification]
  |
  v
commit (reference PR comments)
```

## Handoff Creation

**Always create a handoff**, even with `--dry-run`:

```yaml
---
session: fix-{scope}-{short-description}
ts: {ISO timestamp}
commit: {git commit hash}
branch: {git branch}
status: {complete|partial|blocked|diagnosis-only}
---

scope: {bug|hook|deps|pr-comments}
options: {flags used}

issue:
  description: {original user description}
  evidence: {key findings from investigation}

diagnosis:
  root_cause: {identified cause}
  hypothesis: {why we think this}
  files: [{affected files}]

fix:
  approach: {what was done}
  files_modified: [{files changed}]
  test_added: {test file if created}

verification:
  test_command: {command to verify}
  human_confirmed: {true|false}

next:
  - {any follow-up needed}
```

**Location:** `thoughts/shared/handoffs/fix/{scope}/{timestamp}_{description}.yaml`

## Examples

### Basic Bug Fix
```
/fix bug
# -> Investigates, diagnoses, implements, tests, commits
```

### Diagnose Only
```
/fix bug --dry-run
# -> Investigates, creates diagnosis handoff, stops
```

### Fix Without Auto-Commit
```
/fix hook --no-commit
# -> Full fix workflow but stops before commit
```

### Quick Fix (No Regression Test)
```
/fix bug --no-test
# -> Implements fix, commits, no regression test
```

### Address PR Comments
```
/fix pr-comments
# -> Fetches PR, creates plan, implements, commits
```

## Error Handling

| Error | Action |
|-------|--------|
| Investigation finds nothing | Ask user for more context |
| User rejects diagnosis | Refine hypothesis with user input |
| Fix breaks other tests | Rollback, refine approach |
| User rejects verification | Offer to revert or adjust |
| Commit fails | Present error, offer retry |

## Integration with Other Skills

This skill orchestrates:
- `debug` / `debug-hooks`: Initial investigation
- `sleuth`: Parallel investigation agent
- `kraken`: TDD implementation agent
- `implement_task`: Single task implementation
- `test-driven-development`: Test creation
- `plan-agent`: Complex fix planning
- `dependency-preflight`: Dependency checks
- `oracle` / `research-codebase`: Context gathering
- `github-search`: PR context fetching
- `qlty-check`: Quality verification
- `premortem`: Risk assessment before implementation
- `commit`: Git commit workflow
- `create_handoff`: Session handoff

## Checkpoints Summary

| Checkpoint | Purpose | Skip Condition |
|------------|---------|----------------|
| After diagnosis | Confirm root cause | Never skip |
| After premortem | Accept or mitigate risks | No HIGH tigers |
| After fix | Verify resolution | Never skip |
| Before commit | Review changes | `--no-commit` |

The human checkpoints are critical for:
1. Preventing wrong fixes from being implemented
2. Ensuring user understands what changed
3. Catching edge cases only humans notice
