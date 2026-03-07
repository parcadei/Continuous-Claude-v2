# Discovery Interview: Question Banks & Templates

---

## Category Question Banks

### Category A: Problem & Goals
- What's the current pain point? How do people solve it today?
- What does success look like? How will you measure it?
- Who are the stakeholders beyond end users?
- What happens if this doesn't get built?

**Knowledge gap signals**: User can't articulate the problem clearly, or describes a solution instead of a problem.

---

### Category B: User Experience & Journey
- Walk me through: a user opens this for the first time. What do they see? What do they do?
- What's the core action? (The one thing users MUST be able to do)
- What errors can happen? What should users see when things go wrong?
- How technical are your users? (Power users vs. novices)

**Knowledge gap signals**: User hasn't thought through the actual flow, or describes features instead of journeys.

---

### Category C: Data & State
- What information needs to be stored? Temporarily or permanently?
- Where does data come from? Where does it go?
- Who owns the data? Are there privacy/compliance concerns?
- What happens to existing data if requirements change?

**Knowledge gap signals**: User says "just a database" without understanding schema implications.

---

### Category D: Technical Landscape
- What existing systems does this need to work with?
- Are there technology constraints? (Language, framework, platform)
- What's your deployment environment? (Cloud, on-prem, edge)
- What's the team's technical expertise?

**Knowledge gap signals**: User picks technologies without understanding tradeoffs.

**Research triggers**:
- "I've heard X is good" → Research X vs alternatives
- "We use Y but I'm not sure if..." → Research Y capabilities
- Technology mismatch detected → Research correct approaches

---

### Category E: Scale & Performance
- How many users/requests do you expect? (Now vs. future)
- What response times are acceptable?
- What happens during traffic spikes?
- Is this read-heavy, write-heavy, or balanced?

**Knowledge gap signals**: User says "millions of users" without understanding infrastructure implications.

---

### Category F: Integrations & Dependencies
- What external services does this need to talk to?
- What APIs need to be consumed? Created?
- Are there third-party dependencies? What's the fallback if they fail?
- What authentication/authorization is needed for integrations?

**Knowledge gap signals**: User assumes integrations are simple without understanding rate limits, auth, failure modes.

---

### Category G: Security & Access Control
- Who should be able to do what?
- What data is sensitive? PII? Financial? Health?
- Are there compliance requirements? (GDPR, HIPAA, SOC2)
- How do users authenticate?

**Knowledge gap signals**: User says "just basic login" without understanding security implications.

---

### Category H: Deployment & Operations
- How will this be deployed? By whom?
- What monitoring/alerting is needed?
- How do you handle updates? Rollbacks?
- What's your disaster recovery plan?

**Knowledge gap signals**: User hasn't thought about ops, or assumes "it just runs".

---

## Completeness Checklist

Before writing the spec, verify answers exist for:

```markdown
### Problem Definition
- [ ] Clear problem statement
- [ ] Success metrics defined
- [ ] Stakeholders identified

### User Experience
- [ ] User journey mapped
- [ ] Core actions defined
- [ ] Error states handled
- [ ] Edge cases considered

### Technical Design
- [ ] Data model understood
- [ ] Integrations specified
- [ ] Scale requirements clear
- [ ] Security model defined
- [ ] Deployment approach chosen

### Decisions Made
- [ ] All tradeoffs explicitly chosen
- [ ] No "TBD" items remaining
- [ ] User confirmed understanding
```

---

## Spec Output Template

Save to `thoughts/shared/specs/YYYY-MM-DD-<name>.md`:

```markdown
# [Project Name] Specification

## Executive Summary
[2-3 sentences: what, for whom, why]

## Problem Statement
[The problem this solves, current pain points, why now]

## Success Criteria
[Measurable outcomes that define success]

## User Personas
[Who uses this, their technical level, their goals]

## User Journey
[Step-by-step flow of the core experience]

## Functional Requirements
### Must Have (P0)
- [Requirement with acceptance criteria]

### Should Have (P1)
- [Requirement with acceptance criteria]

### Nice to Have (P2)
- [Requirement with acceptance criteria]

## Technical Architecture
### Data Model
[Key entities and relationships]

### System Components
[Major components and their responsibilities]

### Integrations
[External systems and how we connect]

### Security Model
[Auth, authorization, data protection]

## Non-Functional Requirements
- Performance: [specific metrics]
- Scalability: [expected load]
- Reliability: [uptime requirements]
- Security: [compliance, encryption]

## Out of Scope
[Explicitly what we're NOT building]

## Open Questions for Implementation
[Technical details to resolve during implementation]

## Appendix: Research Findings
[Summary of research conducted during discovery]
```

---

## Handling Different User Types

### Technical User
- Can skip some education
- Still probe for assumptions ("You mentioned Kubernetes - have you considered the operational complexity?")
- Focus more on tradeoffs than explanations

### Non-Technical User
- More education needed
- Use analogies ("Think of an API like a waiter - it takes your order to the kitchen")
- Offer more research options
- Don't overwhelm with technical options

### User in a Hurry
- Acknowledge time pressure
- Prioritize: "If we only have 10 minutes, let's focus on [core UX and data model]"
- Note what wasn't covered as risks

---

## Knowledge Gap Signal Reference

| Signal | What to do |
|--------|------------|
| "I think..." or "Maybe..." | Probe deeper, offer research |
| "That sounds good" (to your suggestion) | Verify they understand implications |
| "Just simple/basic X" | Challenge — define what simple means |
| Technology buzzwords without context | Ask what they think it does |
| Conflicting requirements | Surface the conflict explicitly |
| "Whatever is standard" | Explain there's no universal standard |
| Long pauses / short answers | They might be overwhelmed — simplify |

---

## Common Conflicts to Watch For

- "Simple AND feature-rich"
- "Real-time AND cheap infrastructure"
- "Highly secure AND frictionless UX"
- "Flexible AND performant"
- "Fast to build AND future-proof"
