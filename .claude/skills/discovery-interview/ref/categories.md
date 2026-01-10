# Category Deep Dive Questions

## Category A: Problem & Goals
- What's the current pain point? How do people solve it today?
- What does success look like? How will you measure it?
- Who are the stakeholders beyond end users?
- What happens if this doesn't get built?

**Gap signals**: Can't articulate problem clearly, describes solution instead of problem.

## Category B: User Experience & Journey
- Walk me through: user opens this for the first time. What do they see?
- What's the core action? (The one thing users MUST do)
- What errors can happen? What should users see?
- How technical are your users?

**Gap signals**: Hasn't thought through flow, describes features not journeys.

## Category C: Data & State
- What information needs to be stored? Temporarily or permanently?
- Where does data come from? Where does it go?
- Who owns the data? Privacy/compliance concerns?
- What happens to existing data if requirements change?

**Gap signals**: Says "just a database" without schema implications.

## Category D: Technical Landscape
- What existing systems does this need to work with?
- Are there technology constraints?
- What's your deployment environment?
- What's the team's technical expertise?

**Gap signals**: Picks technologies without tradeoffs ("real-time with REST").

## Category E: Scale & Performance
- How many users/requests? Now vs. future?
- What response times are acceptable?
- What happens during traffic spikes?
- Read-heavy, write-heavy, or balanced?

**Gap signals**: Says "millions of users" without infrastructure understanding.

## Category F: Integrations & Dependencies
- What external services does this need to talk to?
- What APIs need to be consumed? Created?
- Third-party fallbacks if they fail?
- Auth for integrations?

**Gap signals**: Assumes integrations are simple without rate limits, auth, failures.

## Category G: Security & Access Control
- Who should be able to do what?
- What data is sensitive? PII? Financial? Health?
- Compliance requirements? (GDPR, HIPAA, SOC2)
- How do users authenticate?

**Gap signals**: Says "just basic login" without security implications.

## Category H: Deployment & Operations
- How will this be deployed? By whom?
- What monitoring/alerting is needed?
- How do you handle updates? Rollbacks?
- Disaster recovery plan?

**Gap signals**: Hasn't thought about ops, assumes "it just runs".
