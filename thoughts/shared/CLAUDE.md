# Shared Documentation - Cross-Session Reference

The `thoughts/shared/` directory contains documentation shared across all sessions.

## Subdirectories

### `plans/` - Implementation Plans
**Purpose**: Detailed technical specifications for features before implementation.
**Naming**: `YYYY-MM-DD-ENG-XXXX-description.md`
**Created by**: `create_plan` skill
**Used by**: `implement_plan` skill, `resume_handoff` skill

### `research/` - Codebase Research
**Purpose**: Comprehensive documentation of existing code patterns and architecture.
**Naming**: `YYYY-MM-DD-ENG-XXXX-description.md`
**Created by**: `research` skill
**Used by**: Planning and implementation phases

### `handoffs/` - Cross-Session Transfers
**Purpose**: Transfer work context between sessions.
**Structure**: `handoffs/{session-name}/YYYY-MM-DD_HH-MM-SS_description.md`
**Created by**: `create_handoff` skill
**Resumed by**: `resume_handoff` skill

## Linking & References

- **From Plans**: Reference research docs that informed the plan
- **From Handoffs**: Link to plans being implemented and research used
- **From Research**: Link to related research documents

## File Metadata

All shared documents include YAML frontmatter:
```yaml
---
date: [ISO timestamp]
researcher: [Author]
git_commit: [Commit hash]
branch: [Git branch]
topic: "[Topic]"
tags: [relevant, components]
status: complete
last_updated: [YYYY-MM-DD]
---
```

## Guidelines

1. One topic per document
2. Cross-reference freely
3. Keep current (update `last_updated`)
4. Use file:line references
5. Avoid code snippets (use references)
6. Be concise but complete
