# Fix Skill — Agent Reference

## Agent Roster

| Agent | Role | Used In |
|-------|------|---------|
| `sleuth` | Parallel investigation (logs, db, git, runtime) | bug, hook |
| `debug-hooks` | Hook-specific structured investigation | hook |
| `kraken` | TDD implementation, regression tests | all scopes |
| `oracle` | External research (correct versions, alternatives) | deps |
| `scout` / `research-codebase` | Codebase context gathering | pr-comments |
| `github-search` | Fetch PR comments and context | pr-comments |
| `plan-agent` | Create multi-step fix plan | deps, pr-comments |
| `dependency-preflight` | Check current dependency state | deps |
| `qlty-check` | Post-fix quality verification | deps |
| `premortem` | Risk assessment before implementation | all scopes |
| `general-purpose` | Git commit workflow | all scopes |
| `create_handoff` | Session handoff doc | always |

## Chain Flows by Scope

### bug

```
sleuth (logs + git + runtime investigation)
  |
  v
[HUMAN CHECKPOINT: confirm diagnosis]
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
[HUMAN CHECKPOINT: verify fix]
  |
  v
commit
```

### hook

```
debug-hooks (structured hook investigation)
  |
  v
[HUMAN CHECKPOINT: confirm diagnosis]
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
[HUMAN CHECKPOINT: verify fix]
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
[HUMAN CHECKPOINT: plan review]
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
[HUMAN CHECKPOINT: verify fix]
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
[HUMAN CHECKPOINT: verify fix]
  |
  v
commit (reference PR comments)
```

## Implementation Prompts

### bug — kraken prompt

```
Implement fix with TDD approach.

Root cause: {diagnosis.root_cause}
Files: {diagnosis.files_to_modify}
Approach: {diagnosis.approach}

Follow implement_task workflow:
1. Write failing test that reproduces the bug
2. Implement minimal fix to pass test
3. Refactor if needed
4. Run full test suite
```

### hook — kraken prompt

```
Fix hook issue.

Root cause: {diagnosis.root_cause}

Follow hook-developer patterns:
1. Check hook registration in settings.json
2. Verify shell wrapper exists and is executable
3. Test hook manually with mock input
4. Rebuild if TypeScript source was modified
5. Verify hook fires correctly
```

### deps — kraken prompt

```
Fix dependency issue.

Root cause: {diagnosis.root_cause}

Follow plan-agent workflow:
1. Research correct dependency versions
2. Create implementation plan
3. Update lockfiles
4. Run dependency-preflight
5. Run qlty-check
```

### pr-comments — kraken prompt

```
Address PR feedback.

Comments: {diagnosis.pr_comments}

Follow plan-agent workflow:
1. Research codebase for context
2. Create implementation plan for each comment
3. Implement changes
4. Commit with reference to comment
```

### regression test — kraken prompt

```
Create regression test for the fix.

Bug: {original_issue}
Fix: {implementation_summary}

Follow test-driven-development:
1. Write test that would have caught this bug
2. Verify test fails against pre-fix code (mentally)
3. Verify test passes against fixed code
4. Test should be minimal and focused
```

---

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
