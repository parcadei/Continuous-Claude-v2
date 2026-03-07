# Code Review Skill

## Iron Law
NO completion claims without fresh verification evidence.

## Verification Gates

### Before Claiming "Done"
```yaml
MUST Verify:
  1. Code compiles/builds without errors
  2. All existing tests pass
  3. New tests added for new functionality
  4. No lint/type errors introduced
  5. Manual smoke test performed

Evidence Required:
  - Build output showing success
  - Test output showing pass
  - Screenshot or log of manual verification
  - Lint/type check results
```

### Completion Claim Format
```yaml
Template:
  ## Verification Evidence
  - Build: [PASS/FAIL] - `npm run build` output
  - Tests: [PASS/FAIL] - `npm test` output
  - Lint: [PASS/FAIL] - `npm run lint` output
  - Manual: [VERIFIED] - [describe what was tested]

Forbidden Claims:
  - "Should work now"
  - "I think it's fixed"
  - "Try it and let me know"
  - "Done" without evidence
```

## Review Practices

### Receiving Feedback
```yaml
Mindset:
  - Feedback improves code quality
  - Every comment deserves consideration
  - Ask clarifying questions
  - Don't take criticism personally

Response Pattern:
  - Acknowledge the feedback
  - Address each point specifically
  - Explain reasoning for disagreements
  - Thank reviewer for thorough review
```

### Requesting Reviews
```yaml
Before Requesting:
  - Self-review first (fresh eyes)
  - Run all checks locally
  - Write clear PR description
  - Link related issues

PR Description Template:
  ## Summary
  [1-2 sentence description]

  ## Changes
  - [Bullet list of changes]

  ## Testing
  - [How this was tested]

  ## Checklist
  - [ ] Tests added/updated
  - [ ] Docs updated if needed
  - [ ] No breaking changes (or noted)
```

### Code Quality Checklist
```yaml
Architecture:
  - [ ] Single responsibility principle
  - [ ] No circular dependencies
  - [ ] Appropriate abstraction level
  - [ ] Clear module boundaries

Security:
  - [ ] Input validation
  - [ ] No hardcoded secrets
  - [ ] Parameterized queries
  - [ ] Appropriate error handling

Performance:
  - [ ] No N+1 queries
  - [ ] Appropriate caching
  - [ ] No memory leaks
  - [ ] Efficient algorithms

Maintainability:
  - [ ] Clear naming
  - [ ] Reasonable function length
  - [ ] No magic numbers
  - [ ] Tests are readable
```

## Anti-Patterns

```yaml
False Completion:
  - "Fixed the bug" (without testing)
  - "Updated the code" (without verification)
  - "Should be working" (speculation)
  - Marking task done before verification

Required Pattern:
  - "Verified working: [evidence]"
  - "Tests pass: [output]"
  - "Confirmed fix: [steps taken]"
```

## Integration with SuperClaude

```yaml
Activation:
  - PR|Review|Merge|Complete keywords
  - Task completion context
  - Code review requests
  - "Done" or "finished" claims

Persona Alignment:
  - qa persona primary
  - security persona for security review
  - performance persona for perf review
  - architect persona for design review

Severity:
  - FALSE completion claim → CRITICAL violation
  - Missing verification → HIGH severity
  - Incomplete checklist → MEDIUM severity
```

---
*ClaudeKit Skills | code-review v1.0 | Evidence-based completion*
