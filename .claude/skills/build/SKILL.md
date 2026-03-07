---
name: build
description: Workflow orchestrator that chains existing skills for feature development
metadata:
  user_invocable: true
  keywords: [build, greenfield, brownfield, tdd, refactor, workflow, orchestrate]
---

# Build - Workflow Orchestrator

You are a workflow orchestrator that chains existing skills for feature development. You coordinate the execution of multiple skills in sequence, passing handoffs between them and pausing for human checkpoints at phase boundaries.

## Invocation

```
/build <mode> [options] [description]
/build resume <handoff-path>
```

**No arguments?** Run the interactive question flow to infer configuration.
@references/question-flows.md

## Modes

| Mode | Chain | Use Case |
|------|-------|----------|
| `greenfield` | discovery-interview → plan-agent → validate-agent → implement_plan → commit → describe_pr | New feature from scratch |
| `brownfield` | onboard → research-codebase → plan-agent → validate-agent → implement_plan | Feature in existing codebase |
| `tdd` | plan-agent → test-driven-development → implement_plan | Test-first implementation |
| `refactor` | tldr-impact → plan-agent → test-driven-development → implement_plan | Safe refactoring with impact analysis |

## Options

| Option | Effect |
|--------|--------|
| `--skip-discovery` | Skip interview phase (use existing spec or description) |
| `--skip-validate` | Skip validation phase (trust plan as-is) |
| `--skip-commit` | Don't auto-commit after implementation |
| `--skip-pr` | Don't create PR description |
| `--parallel` | Run independent research agents in parallel |
| `--no-checkpoint` | Skip human checkpoints (advanced users only) |

## Handoff Directory

All handoffs go to: `thoughts/shared/handoffs/<session>/`

Session name derived from:
1. Existing continuity ledger name, OR
2. Generated from feature description: `build-<date>-<kebab-description>`

## Orchestration Process

### Step 0: Parse Arguments

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
- `--skip-discovery`: Remove "discovery-interview"
- `--skip-validate`: Remove "validate-agent"
- `--skip-commit`: Remove "commit"
- `--skip-pr`: Remove "describe_pr"

### Step 1: Setup

```bash
SESSION="build-$(date +%Y%m%d)-<kebab-description>"
mkdir -p "thoughts/shared/handoffs/$SESSION"
```

Create `orchestration.yaml`:
```yaml
session: $SESSION
mode: <mode>
options: [<options>]
description: "<description>"
started: <timestamp>
chain: [<skill1>, <skill2>, ...]
current_phase: 0
phases:
  - skill: <skill1>
    status: pending
  - skill: <skill2>
    status: pending
```

### Step 2: Execute Chain

For each skill in the chain:
1. Read previous handoff (if exists)
2. Execute skill (spawn agent or invoke directly)
3. Capture skill output/handoff
4. Update orchestration state
5. Human checkpoint (if phase boundary)
6. Continue or handle error

**Detailed per-skill execution and example sessions:** @references/modes.md

### Step 3: Handle Errors

Present blocked state to user with options: Retry / Skip / Abort / Manual intervention.
Update `orchestration.yaml` with `status: blocked`, `error`, and `blocker` fields.

### Step 4: Completion

```
Build workflow complete!

Session: thoughts/shared/handoffs/<session>/

Artifacts created:
- Spec: thoughts/shared/specs/<name>-spec.md (if greenfield)
- Plan: thoughts/shared/plans/PLAN-<name>.md
- Validation: <session>/validation-<name>.md
- Implementation handoffs: <session>/task-*.md
- PR: #<number> (if not --skip-pr)

Commit: <hash> (if not --skip-commit)
Total phases: N completed, M skipped
```

## Human Checkpoints

| After Phase | Checkpoint Purpose |
|-------------|-------------------|
| discovery-interview | Verify spec captures requirements |
| plan-agent | Approve implementation plan |
| validate-agent (if issues) | Acknowledge validation concerns |
| Each implement task | Verify phase works before continuing |
| commit | Approve commit message and files |

## Resume Support

```bash
/build resume thoughts/shared/handoffs/<session>/
```

Reads `orchestration.yaml` and continues from the last incomplete phase.

## Parallel Execution

With `--parallel`, independent phases run concurrently (e.g., onboard + research-codebase in brownfield). Dependencies are always respected.

## Configuration

Set defaults in `.claude/settings.json`:

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
