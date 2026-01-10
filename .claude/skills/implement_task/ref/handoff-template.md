# Handoff Document Template

```markdown
---
date: [ISO timestamp]
task_number: [N]
task_total: [Total]
status: [success | partial | blocked]
---

# Task Handoff: [Task Description]

## Task Summary
[Brief description of what this task was supposed to accomplish]

## What Was Done
- [Bullet points of actual changes made]

## Files Modified
- `path/to/file.ts:45-67` - [What was changed]

## Decisions Made
- [Decision 1]: [Rationale]

## Patterns/Learnings for Next Tasks
- [Any patterns discovered]

## TDD Verification
- [ ] Tests written BEFORE implementation
- [ ] Each test failed first (RED), then passed (GREEN)
- [ ] Tests run: [command] → [N] passing
- [ ] Refactoring kept tests green

## Code Quality
- Issues found: [N]
- Issues auto-fixed: [M]
- Remaining: [Brief or "None"]

## Issues Encountered
[Problems and resolutions, or blockers]

## Next Task Context
[What next task should know]
```

## Resume Handoff Guide

When reading previous handoffs:
1. Read completely
2. Extract: Files Modified, Patterns/Learnings, Next Task Context
3. Verify files still exist and match
4. Apply learnings

**Look for:**
- Files Modified → may need to read for context
- Decisions Made → follow consistent approaches
- Patterns/Learnings → apply to your work
- Issues Encountered → avoid repeating mistakes
