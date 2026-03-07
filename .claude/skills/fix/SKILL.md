---
name: fix
description: Meta-skill workflow orchestrator for bug investigation and resolution. Routes to debug, implement, test, and commit based on scope.
allowed-tools: [Bash, Read, Grep, Write, Edit, Task]
---

# Fix

Workflow orchestrator for bug investigation and resolution. Chains specialized agents based on issue scope.

**References:**
- Agent chains + implementation prompts: `references/agents.md`
- Investigation templates + handoff schema: `references/debugging-procedures.md`

## Usage

```
/fix <scope> [options] [description]
```

## Question Flow (No Arguments)

If the user types just `/fix` with no or partial arguments, guide them through this question flow.

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
- "Bug" → scope=bug, skip to Phase 2
- "Hook" → scope=hook, skip to Phase 2
- "Dependencies" → scope=deps, skip to Phase 2
- "PR Comments" → scope=pr-comments, skip to Phase 2

### Phase 1: Issue Type

```yaml
question: "What kind of issue are you dealing with?"
options:
  - label: "Something is broken/not working" → bug scope
  - label: "Claude Code hook not firing" → hook scope
  - label: "Import/dependency errors" → deps scope
  - label: "Need to address PR feedback" → pr-comments scope
```

### Phase 2: Issue Details

Free text — capture the error message, unexpected behavior, or PR link.

### Phase 3: Investigation Depth

```yaml
options:
  - label: "Diagnose and fix" → full workflow
  - label: "Diagnose only (dry run)" → --dry-run
  - label: "Quick fix" → skip investigation, go straight to spark
```

### Phase 4: Testing & Commit

```yaml
multiSelect: true
options:
  - label: "Write a regression test" → include regression phase
  - label: "Commit the fix" → include commit phase
  - label: "Just fix, nothing else" → --no-test --no-commit
```

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

| Scope | Chain |
|-------|-------|
| `bug` | sleuth → diagnose → premortem → kraken (TDD) → kraken (test) → commit |
| `hook` | debug-hooks → diagnose → premortem → kraken (hook-dev) → test → commit |
| `deps` | dependency-preflight → oracle → plan-agent → premortem → kraken → qlty-check → commit |
| `pr-comments` | github-search → research-codebase → plan-agent → premortem → kraken → commit |

See `references/agents.md` for full per-scope flow diagrams.

## Options

| Option | Effect |
|--------|--------|
| `--no-test` | Skip regression test creation |
| `--dry-run` | Diagnose only, don't implement fix |
| `--no-commit` | Don't auto-commit the fix |

## Workflow Phases

### Phase 1: Parse Arguments

```bash
SCOPE="${1:-bug}"
NO_TEST=false; DRY_RUN=false; NO_COMMIT=false
for arg in "$@"; do
  case $arg in
    --no-test) NO_TEST=true ;;
    --dry-run) DRY_RUN=true ;;
    --no-commit) NO_COMMIT=true ;;
  esac
done
```

### Phase 2: Investigation (Parallel)

Spawn `sleuth` (bug/hook) or scope-appropriate agents (deps/pr-comments).

See `references/debugging-procedures.md` for the full sleuth investigation prompt.

### Phase 3: Diagnosis Report

Present structured findings: logs, database state, git state, runtime state, root cause hypothesis, proposed fix, risk rating.

See `references/debugging-procedures.md` for the full diagnosis report template.

### Phase 4: Human Checkpoint (Diagnosis)

**REQUIRED — never skip.**

```
AskUserQuestion(
  question="Proceed with the proposed fix?",
  options=["yes", "no", "modify"]
)
```

If "modify" → gather new requirements and update approach.
If "no" → create diagnostic handoff and exit.
If `--dry-run` → create diagnostic handoff and exit here.

### Phase 4.5: Risk Assessment (Premortem)

Run `/premortem quick` after diagnosis approval.

See `references/debugging-procedures.md` for premortem context template.

**Risk decision:**
- No HIGH tigers → proceed to Phase 5
- HIGH tigers found → present to user: accept / modify / research mitigations

### Phase 5: Implementation

Route to `kraken` with scope-appropriate prompt.

See `references/agents.md` for per-scope kraken prompts.

### Phase 6: Regression Test (unless --no-test)

Spawn `kraken` to write a focused regression test.

See `references/agents.md` for the regression test prompt.

### Phase 7: Human Checkpoint (Verification)

```
AskUserQuestion(
  question="Fix implemented. Please verify and confirm.",
  options=["looks good", "needs adjustment", "revert"]
)
```

If "needs adjustment" → return to Phase 5.
If "revert" → run rollback and exit.

### Phase 8: Commit (unless --no-commit)

Spawn `general-purpose` agent following the commit skill: git diff review → descriptive message → await confirmation → execute.

## Handoff Creation

**Always create a handoff**, even with `--dry-run`.

See `references/debugging-procedures.md` for the full YAML schema.

**Location:** `thoughts/shared/handoffs/fix/{scope}/{timestamp}_{description}.yaml`

## Examples

```bash
/fix bug                  # Investigate → diagnose → implement → test → commit
/fix bug --dry-run        # Diagnose only, no code changes
/fix hook --no-commit     # Fix hook, skip auto-commit
/fix bug --no-test        # Fix and commit, no regression test
/fix pr-comments          # Fetch PR, plan, implement, commit
```

## Checkpoints Summary

| Checkpoint | Purpose | Skip Condition |
|------------|---------|----------------|
| After diagnosis | Confirm root cause | Never skip |
| After premortem | Accept or mitigate risks | No HIGH tigers |
| After fix | Verify resolution | Never skip |
| Before commit | Review changes | `--no-commit` |

Human checkpoints prevent wrong fixes, ensure user understands changes, and catch edge cases.
