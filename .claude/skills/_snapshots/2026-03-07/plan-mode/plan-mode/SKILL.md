---
name: plan-mode
description: Concise plan format - brevity over grammar, end with unresolved questions
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# Plan Mode

CONCISE plans. Sacrifice grammar for brevity.

## Format Rules [C:10]

1. **Brevity first** - sacrifice grammar for concision
2. **Bullets > prose** - no paragraphs, no explanations
3. **End with questions** - always list unresolved

## Structure Template

```markdown
# [Title: 3-5 words]

## What
- [bullet]
- [bullet]

## How
- [file]: [1-line change]
- [file]: [1-line change]

## Unresolved Questions
- [question]?
- [question]?
```

## Anti-Patterns

| Bad | Why |
|-----|-----|
| "First, I'll need to understand..." | Prose filler |
| Long explanatory paragraphs | Not scannable |
| Missing questions section | Forces assumptions |
| Time estimates ("2-3 weeks") | Never estimate |

## Good Example

```markdown
# Add User Auth

## What
- JWT tokens for API
- Redis session store
- Protected routes

## How
- auth/jwt.ts: token create/verify
- middleware/auth.ts: route guard
- redis.ts: session adapter

## Unresolved Questions
- Refresh token rotation?
- Session timeout value?
- OAuth providers needed?
```

## Bad Example

```markdown
# Plan for Adding User Authentication

This plan outlines our comprehensive approach for implementing
user authentication in the application. We'll leverage JWT for
stateless authentication while using Redis for session management.

First, we need to understand the current architecture...
[continues for 3 paragraphs]
```

## When to Use

- System enters plan mode (EnterPlanMode)
- User asks to create/write a plan
- Complex multi-step tasks

## Workflow Integration

Plan mode typically triggers:
1. **Exploration** - scout agent finds relevant code
2. **Design** - plan-agent creates approach
3. **Format** - this skill ensures concise output
4. **Validation** - validate-agent checks against precedent
