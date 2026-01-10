---
description: Transform vague ideas into detailed specs through deep interviews
user_invocable: true
model: opus
---

# Discovery Interview

Transform vague ideas into detailed, implementable specifications.

## Core Philosophy

**Don't ask obvious questions. Don't accept surface answers. Don't assume knowledge.**

## Interview Process

### Phase 1: Initial Orientation (2-3 questions)
- "In one sentence, what problem are you trying to solve?"
- "Who will use this?"
- "New thing or improving existing?"

Determine PROJECT TYPE: Backend, Frontend, CLI, Mobile, Full-stack, Script, Library

### Phase 2: Category Deep Dive

Work through relevant categories IN ORDER (2-4 questions each):

| Category | Focus Areas |
|----------|-------------|
| A: Problem & Goals | Pain point, success metrics, stakeholders |
| B: User Experience | Journey, core action, errors, user level |
| C: Data & State | Storage, data flow, privacy |
| D: Technical | Integrations, constraints, deployment |
| E: Scale | Users, response times, spikes |
| F: Dependencies | External services, APIs, fallbacks |
| G: Security | Access control, compliance, auth |
| H: Operations | Deployment, monitoring, recovery |

### Phase 3: Research Loops
When uncertainty detected, offer research before continuing.

### Phase 4: Conflict Resolution
Surface conflicts explicitly. Common: "simple AND feature-rich", "real-time AND cheap".

### Phase 5: Completeness Check
Verify all categories covered before writing spec.

### Phase 6: Spec Generation
Output to: `thoughts/shared/specs/YYYY-MM-DD-<n>.md`

### Phase 7: Implementation Handoff
Ask: Start now? Review first? Plan implementation? Done for now?

## Iteration Rules

- **Minimum 10-15 questions** for real projects
- **At least 2 questions per relevant category**
- **At least 1 research loop** for non-trivial projects
- **Always completeness check** before writing
- **Summarize understanding** before finalizing

## References

For category questions: `cat ref/categories.md`
For spec template: `cat ref/spec-template.md`
For user type handling: `cat ref/user-types.md`
