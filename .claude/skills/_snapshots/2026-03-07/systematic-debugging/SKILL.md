# Systematic Debugging Skill

## Iron Law
NO fixes without root cause investigation. Jumping to solutions causes:
- Wrong fixes that mask real issues
- Recurring bugs
- Wasted time

## 4-Phase Framework

### Phase 1: Root Cause Investigation [MANDATORY]
```yaml
Steps:
  1. Reproduce the issue reliably
  2. Gather evidence (logs, stack traces, error messages)
  3. Identify what changed recently (git log, deployments)
  4. Form hypothesis about root cause
  5. Document findings before proceeding

Red Flags (return to Phase 1):
  - Cannot reproduce consistently
  - Multiple unrelated symptoms
  - Fix doesn't match root cause
  - "It works on my machine"
```

### Phase 2: Pattern Analysis
```yaml
Steps:
  1. Search codebase for similar patterns
  2. Check if issue exists elsewhere
  3. Review related tests
  4. Identify scope of impact

Questions:
  - Is this a systemic issue or isolated?
  - Are there other places with same pattern?
  - What tests should have caught this?
```

### Phase 3: Hypothesis Testing
```yaml
Steps:
  1. Create minimal reproduction
  2. Test hypothesis with smallest change
  3. Verify fix addresses root cause (not symptom)
  4. Check for side effects

Validation:
  - Does the fix match the root cause?
  - Are there regression risks?
  - What edge cases exist?
```

### Phase 4: Implementation
```yaml
Steps:
  1. Implement fix targeting root cause
  2. Add tests preventing recurrence
  3. Document the fix and why it works
  4. Review for similar patterns to fix

Completion Criteria:
  - Root cause addressed (not masked)
  - Tests added
  - No new issues introduced
  - Documentation updated if needed
```

## Anti-Patterns to Avoid

```yaml
Forbidden:
  - "Let me try this and see if it works"
  - Making multiple changes at once
  - Fixing symptoms instead of causes
  - Skipping reproduction steps
  - Not documenting findings

Required:
  - "The root cause is X because Y"
  - Single change per test
  - Evidence-based conclusions
  - Reproducible test case
  - Written investigation notes
```

## Integration with SuperClaude

```yaml
Activation:
  - Bug|Error|Fix|Debug keywords detected
  - Error stack traces in context
  - User reports issue
  - Test failures

Persona Alignment:
  - analyzer persona primary
  - qa persona for test coverage
  - security persona if vulnerability related
```

---
*ClaudeKit Skills | systematic-debugging v1.0 | Root cause first*
