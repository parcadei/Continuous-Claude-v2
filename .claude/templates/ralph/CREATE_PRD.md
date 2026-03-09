# PRD Template — Structured Spec Format

> Adapted from spec-kit's structured specification pattern.
> Ralph generates this during Phase 1 after user interview.

---

## Feature: {{FEATURE_NAME}}

**Owner:** Ralph / {{PROJECT}}
**Status:** Draft | Approved
**Priority:** P1 (Must-have) | P2 (Should-have) | P3 (Nice-to-have)

---

## 1. Overview

_One paragraph describing what this feature does and why it matters._

---

## 2. User Stories

List user stories in priority order. Each must be testable.

### US1 [P1]: {{Story Title}}
**As a** {{role}}, **I want** {{capability}}, **so that** {{benefit}}.

**Acceptance Criteria:**
- **Given** {{precondition}}, **When** {{action}}, **Then** {{expected result}}
- **Given** {{precondition}}, **When** {{action}}, **Then** {{expected result}}

### US2 [P1]: {{Story Title}}
**As a** {{role}}, **I want** {{capability}}, **so that** {{benefit}}.

**Acceptance Criteria:**
- **Given** {{precondition}}, **When** {{action}}, **Then** {{expected result}}

### US3 [P2]: {{Story Title}}
...

---

## 3. Non-Goals (Explicit)

What this feature deliberately does NOT do:

- {{Non-goal 1}} — _reason_
- {{Non-goal 2}} — _reason_
- {{Non-goal 3}} — _reason_

---

## 4. Technical Considerations

### 4.1 Stack & Constraints
- Framework: {{from knowledge tree}}
- Key files: {{from knowledge tree}}
- Constraints: {{from interview}}

### 4.2 Relevant Learnings
_Populated from Phase 0 memory recall:_
- {{Learning 1 — past pattern or decision}}
- {{Learning 2 — pitfall to avoid}}

### 4.3 Dependencies
- External: {{APIs, services, packages}}
- Internal: {{other features, modules}}

---

## 5. Success Metrics (Technology-Agnostic)

Measurable outcomes — not implementation details:

| Metric | Target | How to Verify |
|--------|--------|---------------|
| {{metric}} | {{target}} | {{verification method}} |
| {{metric}} | {{target}} | {{verification method}} |

---

## 6. Needs Clarification

> **Rule:** Max 3 items. If more than 3 are unclear, the feature isn't ready for implementation. Return to interview.

- [ ] [NEEDS CLARIFICATION] {{Question 1}}
- [ ] [NEEDS CLARIFICATION] {{Question 2}}
- [ ] [NEEDS CLARIFICATION] {{Question 3}}

_All items must be resolved before proceeding to task breakdown._

---

## 7. Quick Mode Flag

> For features requiring fewer than 3 tasks, skip user stories and use a simplified format:
> - **Goal:** One sentence
> - **Acceptance:** 2-3 bullet points
> - **Files:** Expected file list
>
> Set `quick_mode: true` in `.ralph/state.json` to enable.

---

_PRD Template v1.0 — Structured Spec Format (spec-kit inspired)_
