---
name: fix
description: Bug investigation and resolution workflow orchestrator
allowed-tools: [Bash, Read, Grep, Write, Edit, Task]
---

# Fix

Workflow orchestrator for bug investigation and resolution.

## Usage

```
/fix <scope> [options] [description]
/fix                    # Guided question flow
/fix bug               # General bug fix
/fix hook              # Hook-specific debugging
/fix deps              # Dependency issues
/fix pr-comments       # Address PR feedback
```

## Scopes

| Scope | Chain |
|-------|-------|
| `bug` | debug → implement_task → tdd → commit |
| `hook` | debug-hooks → hook-developer → implement → test |
| `deps` | preflight → research → plan → implement → qlty-check |
| `pr-comments` | github-search → research → plan → implement → commit |

## Options

| Option | Effect |
|--------|--------|
| `--no-test` | Skip regression test |
| `--dry-run` | Diagnose only |
| `--no-commit` | Don't auto-commit |

## Workflow

1. **Investigation** - Spawn sleuth agent for parallel investigation
2. **Diagnosis** - Present findings, wait for user confirmation
3. **Premortem** - Quick risk check (`/premortem quick`)
4. **Implementation** - Route to appropriate skill based on scope
5. **Regression Test** - Create test that would catch the bug
6. **Verification** - User confirms fix works
7. **Commit** - Create commit with reference

## Checkpoints

| Checkpoint | Purpose | Skip? |
|------------|---------|-------|
| After diagnosis | Confirm root cause | Never |
| After premortem | Accept/mitigate risks | No HIGH tigers |
| After fix | Verify resolution | Never |
| Before commit | Review changes | `--no-commit` |

## References

For detailed workflows: `cat ref/workflows.md`
For question flow: `cat ref/question-flow.md`
For handoff creation: `cat ref/handoff.md`
