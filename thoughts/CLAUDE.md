# Thoughts Directory - Session Continuity Guide

The `thoughts/` directory preserves context across Claude Code sessions through structured documentation.

## Directory Structure

```
thoughts/
├── ledgers/              # Session continuity (survives /clear)
├── shared/               # Cross-session documentation
│   ├── plans/            # Implementation plans
│   ├── research/         # Codebase analysis
│   └── handoffs/         # Session transfer documents
├── local/                # User-specific notes
└── reasoning/            # Session analysis and learnings
```

## Key Concepts

### Continuity Ledger
**Location**: `thoughts/ledgers/CONTINUITY_CLAUDE-<session-name>.md`

Maintains state within a session. Survives `/clear` without losing fidelity.

**Format**:
- Goal, Constraints, Key Decisions
- State section with Done/Now/Next checkboxes
- Open Questions marked UNCONFIRMED
- Working Set (branch, files, commands)

**Checkbox states**: `[x]` done, `[→]` in progress, `[ ]` pending

### Implementation Plan
**Location**: `thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md`

Detailed technical specifications before implementation.

### Research Document
**Location**: `thoughts/shared/research/YYYY-MM-DD-ENG-XXXX-description.md`

Comprehensive codebase analysis answering specific questions.

### Handoff Document
**Location**: `thoughts/shared/handoffs/{session}/YYYY-MM-DD_HH-MM-SS_description.md`

Transfers context to a new session when resuming work.

## Workflow

### Single-Session Work
```
1. Create continuity_ledger (if >30 min work expected)
2. Work on task
3. Update ledger before /clear
4. Resume from ledger after /clear
```

### Multi-Session Work
```
1. Create plan (planning session)
2. Implement from plan (implementation session)
3. Create handoff when done
4. Resume handoff in next session
```

## Comparison

| Tool | Scope | Location |
|------|-------|----------|
| continuity_ledger | Session | `thoughts/ledgers/` |
| plan | Feature | `thoughts/shared/plans/` |
| research | Topic | `thoughts/shared/research/` |
| handoff | Cross-session | `thoughts/shared/handoffs/` |

## Rules

1. **Always clear, never compact** - Use `/clear` with ledger at 70%+ context
2. **One ledger per workstream** - Multiple active tasks = multiple ledgers
3. **File-based state** - Checkboxes survive `/clear` with full fidelity
