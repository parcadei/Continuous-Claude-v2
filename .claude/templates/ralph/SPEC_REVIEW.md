# Spec Compliance Review Template

> Two-stage review: This is Stage 1 (spec compliance). Stage 2 (code quality) follows separately.
> Adapted from superpowers' two-stage review pattern.

---

## Review Context

**Story:** {{STORY_ID}}
**PRD:** `/tasks/prd-{{feature}}.md`
**Reviewer Agent:** critic (spec-focused prompt)

---

## Review Instructions

You are reviewing whether the implementation matches the PRD requirements. You are NOT reviewing code quality — that comes in Stage 2.

**Key assumption:** The implementer may have cut corners. Verify everything independently against the original requirements. Do not trust the agent's completion report at face value.

---

## Checklist

### User Story Coverage

For each user story in the PRD:

- [ ] **US1:** Implementation exists that satisfies acceptance criteria
  - Given/When/Then verified: {{yes/no + evidence}}
- [ ] **US2:** Implementation exists that satisfies acceptance criteria
  - Given/When/Then verified: {{yes/no + evidence}}
- [ ] **US3:** (repeat for all stories)

### Non-Goals Respected

- [ ] No code was written for items listed under "Non-Goals"
- [ ] No scope creep beyond PRD boundaries

### Success Metrics Achievable

- [ ] Each success metric from the PRD has a verification path
- [ ] Metrics are testable with existing infrastructure

### Files Expected

- [ ] All files referenced in task breakdown exist
- [ ] No unexpected files created outside PRD scope

---

## Findings

### Gaps (spec requirements not met)

| User Story | Gap | Severity |
|------------|-----|----------|
| {{US_ID}} | {{what's missing}} | Critical / Major / Minor |

### Scope Creep (work beyond spec)

| File | Extra Work | Impact |
|------|------------|--------|
| {{file}} | {{what was added}} | Keep / Remove |

---

## Verdict

- [ ] **PASS** — All user stories satisfied, no gaps
- [ ] **PASS WITH NOTES** — Minor gaps documented, non-blocking
- [ ] **FAIL** — Critical gaps require implementation fixes

**Summary:** {{one-line summary}}

---

_Spec Review Template v1.0 — Two-Stage Review (superpowers inspired)_
