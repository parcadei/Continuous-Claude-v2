# Implementation Plans - Feature Specifications

The `plans/` directory contains detailed technical plans for implementing features before work begins.

## Purpose

Implementation plans are **comprehensive technical specifications** that:
- Define success before coding starts
- Align teams on approach
- Serve as reference during implementation
- Enable others to continue work mid-implementation

## Format & Naming

**Filename**: `YYYY-MM-DD-ENG-XXXX-description.md`
- `YYYY-MM-DD` - Plan creation date
- `ENG-XXXX` - Ticket/issue number (omit if no ticket)
- `description` - Feature name in kebab-case

## Document Structure

1. **Overview** - Brief description of what's being implemented
2. **Current State Analysis** - What exists, what's missing, constraints
3. **Desired End State** - Definition of "done" with verification
4. **Key Discoveries** - Important findings from research
5. **What We're NOT Doing** - Explicit out-of-scope
6. **Implementation Approach** - High-level strategy
7. **Phases** - Each with changes, success criteria (automated + manual)
8. **Testing Strategy** - Unit, integration, manual
9. **Performance Considerations** - Any implications
10. **References** - Tickets, research docs, similar implementations

## Usage

```bash
# Create a plan
/create_plan <ticket-or-context>

# Implement from a plan
/implement_plan thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md
```

## Guidelines

- Separate automated from manual verification
- Use `file:line` references for code changes
- Make success criteria measurable
- Include "what we're NOT doing" to prevent scope creep
- Link to research docs that informed decisions
