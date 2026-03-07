# Fix Skill — Debugging Procedures

## Sleuth Investigation Prompt

```
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
```

## Diagnosis Report Format

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

## Premortem Context

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

**Risk decision:**
- No HIGH tigers → proceed to implementation
- HIGH tigers found → present to user: accept / modify approach / research mitigations

## Handoff Schema

**Location:** `thoughts/shared/handoffs/fix/{scope}/{timestamp}_{description}.yaml`

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

## Error Handling

| Error | Action |
|-------|--------|
| Investigation finds nothing | Ask user for more context |
| User rejects diagnosis | Refine hypothesis with user input |
| Fix breaks other tests | Rollback, refine approach |
| User rejects verification | Offer to revert or adjust |
| Commit fails | Present error, offer retry |
