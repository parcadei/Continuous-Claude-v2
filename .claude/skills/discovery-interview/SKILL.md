---
name: discovery-interview
description: Deep interview process to transform vague ideas into detailed specs. Works for technical and non-technical users.
metadata:
  user-invocable: true
  model: claude-opus-4-5-20251101
---

# Discovery Interview

Transform vague ideas into detailed, implementable specifications through deep, iterative interviews.

**References**: `references/question-banks.md` — full question banks, completeness checklist, spec template, user type guidance.

## Core Philosophy

**Don't ask obvious questions. Don't accept surface answers. Don't assume knowledge.**

1. Deeply understand what the user *actually* wants (not what they say)
2. Detect knowledge gaps and educate when needed
3. Surface hidden assumptions and tradeoffs
4. Research when uncertainty exists
5. Only write a spec when you have complete understanding

---

## Interview Process

### Phase 1: Initial Orientation (2-3 questions max)

Start broad. Determine PROJECT TYPE from answers:

| Type | Focus |
|------|-------|
| Backend service/API | Data, scaling, integrations |
| Frontend/Web app | UX, state, responsiveness |
| CLI tool | Ergonomics, composability, output formats |
| Mobile app | Offline, platform, permissions |
| Full-stack app | All of the above |
| Script/Automation | Triggers, reliability, idempotency |
| Library/SDK | API design, docs, versioning |

---

### Phase 2: Category-by-Category Deep Dive

Work through relevant categories IN ORDER. For each: ask 2-4 questions, detect uncertainty, educate when needed, track decisions.

Full question banks in `references/question-banks.md`. Categories:

| Category | Key Focus |
|----------|-----------|
| A: Problem & Goals | Pain point, success metrics, stakeholders |
| B: User Experience | First-run journey, core action, error states |
| C: Data & State | Storage needs, data ownership, privacy |
| D: Technical Landscape | Existing systems, constraints, deployment |
| E: Scale & Performance | User load, response times, traffic patterns |
| F: Integrations | External services, APIs, fallback plans |
| G: Security | Access control, sensitive data, compliance |
| H: Deployment | Ops, monitoring, rollback, disaster recovery |

---

### Phase 3: Research Loops

When uncertainty or knowledge gaps detected:

```
AskUserQuestion(
  question: "You mentioned [X]. There are several approaches with tradeoffs. Research first?",
  options: [
    {label: "Yes, research it", description: "I'll investigate options and explain the tradeoffs"},
    {label: "No, I know what I want", description: "Skip research, I'll specify the approach"},
    {label: "Tell me briefly", description: "Quick overview without deep research"}
  ]
)
```

If user wants research: spawn oracle agent or use WebSearch → summarize findings in plain language → return with informed follow-up questions.

---

### Phase 4: Conflict Resolution

When conflicting requirements surface:

```
AskUserQuestion(
  question: "Conflict: You want [X] but also [Y]. These don't work together because [reason]. Which is more important?",
  options: [
    {label: "Prioritize X", description: "[What you lose]"},
    {label: "Prioritize Y", description: "[What you lose]"},
    {label: "Explore alternatives", description: "Research ways to get both"}
  ]
)
```

Common conflicts: Simple AND feature-rich, Real-time AND cheap, Secure AND frictionless, Fast to build AND future-proof.

---

### Phase 5: Completeness Check

Before writing the spec, verify all checklist items are answered (see `references/question-banks.md`). If anything is missing, go back and ask.

---

### Phase 6: Spec Generation

Only after completeness check passes:

1. **Confirm understanding first**:
   ```
   "Before I write the spec, let me confirm:
   You're building [X] for [users] to solve [problem].
   Key decisions: [Decision 1], [Decision 2].
   Is this accurate?"
   ```

2. **Generate spec** to `thoughts/shared/specs/YYYY-MM-DD-<name>.md` (full template in `references/question-banks.md`).

---

### Phase 7: Implementation Handoff

After spec is written:

```
AskUserQuestion(
  question: "Spec created. How would you like to proceed?",
  options: [
    {label: "Start implementation now"},
    {label: "Review spec first"},
    {label: "Plan implementation", description: "Create detailed task plan"},
    {label: "Done for now"}
  ]
)
```

If "Start implementation now": say `implement the <name> spec` to activate drift prevention.
If "Plan implementation": invoke `/create_plan` with spec path.

---

## AskUserQuestion Best Practices

- **Bad**: "What database do you want?" (assumes they know databases)
- **Good**: "What kind of data will you store, and how often read vs written?"

Always include uncertainty options:
```
options: [
  {label: "Option A", description: "Clear choice with implications"},
  {label: "Option B", description: "Alternative with different tradeoffs"},
  {label: "I'm not sure", description: "Let's explore this more"},
  {label: "Research this", description: "I'll investigate and come back"}
]
```

Use `multiSelect: true` for feature selection questions.

---

## Iteration Rules

1. Never write the spec after just 3-5 questions — that produces slop
2. Minimum 10-15 questions across categories for any real project
3. At least 2 questions per relevant category
4. At least 1 research loop for any non-trivial project
5. Always do a completeness check before writing
6. Summarize understanding before finalizing
