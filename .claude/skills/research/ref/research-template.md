# Research Document Template

```markdown
---
date: [ISO timestamp]
researcher: [Name]
git_commit: [hash]
branch: [branch]
repository: [repo]
topic: "[Topic]"
tags: [research, codebase, components]
status: complete
last_updated: [YYYY-MM-DD]
last_updated_by: [Name]
---

# Research: [Topic]

**Date**: [timestamp]
**Researcher**: [Name]
**Git Commit**: [hash]
**Branch**: [branch]
**Repository**: [repo]

## Research Question
[Original user query]

## Summary
[High-level documentation answering the question]

## Detailed Findings

### [Component/Area 1]
- Description ([file.ext:line](link))
- How it connects to other components
- Current implementation details

### [Component/Area 2]
...

## Code References
- `path/to/file.py:123` - Description
- `another/file.ts:45-67` - Description

## Architecture Documentation
[Patterns, conventions, design implementations]

## Historical Context (from thoughts/)
- `thoughts/shared/something.md` - Historical decision
- `thoughts/local/notes.md` - Past exploration

## Related Research
[Links to other research documents]

## Open Questions
[Areas needing further investigation]
```

## Frontmatter Rules

- Always include frontmatter
- Use snake_case for multi-word fields
- Update `last_updated` and `last_updated_by` for follow-ups
- Add `last_updated_note` for follow-up research
