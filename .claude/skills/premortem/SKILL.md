---
name: premortem
description: Pre-implementation risk analysis - identify what could go wrong
user-invocable: true
---

# Premortem

Risk analysis before implementation. Identify what could go wrong.

## Usage

```
/premortem              # Full analysis
/premortem quick        # Fast check before implementation
```

## Process

### Step 1: Context Gathering
Read the plan/spec/task to analyze.

### Step 2: Identify Risks

For each risk, classify:

| Severity | Impact |
|----------|--------|
| HIGH | Blocks release, data loss, security breach |
| MEDIUM | Degraded experience, requires workaround |
| LOW | Minor inconvenience, cosmetic |

| Likelihood | Probability |
|------------|-------------|
| HIGH | >50% chance |
| MEDIUM | 10-50% chance |
| LOW | <10% chance |

### Step 3: Categorize Risks

**Technical:**
- Dependencies failing
- Performance issues
- Integration problems
- Data migration risks

**Process:**
- Unclear requirements
- Missing expertise
- Time constraints
- Coordination issues

**External:**
- Third-party changes
- Compliance requirements
- User behavior assumptions

### Step 4: Mitigation Strategies

For each HIGH/MEDIUM risk:
1. Prevention - how to avoid
2. Detection - how to notice
3. Recovery - how to fix

### Step 5: Present Findings

```markdown
## Risk Summary

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| [Description] | HIGH | MEDIUM | [Strategy] |
```

## Quick Mode

For `/premortem quick`, check only:
- Will this break other functionality?
- Is rollback possible?
- Related edge cases not covered?
- Does fix match codebase patterns?
- External dependencies affected?

## References

For full template: `cat ref/premortem-template.md`
For risk categories: `cat ref/risk-categories.md`
