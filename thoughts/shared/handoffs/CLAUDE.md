# Handoff Documents - Cross-Session Transfer

The `handoffs/` directory contains documents that transfer work context between sessions.

## Purpose

Handoff documents enable:
- Transferring work to a new session
- Passing knowledge to another team member
- Capturing learnings for future reference
- Quick resumption without rereading code
- Avoiding repeated mistakes

## Format & Naming

**Structure**: `handoffs/{session-name}/YYYY-MM-DD_HH-MM-SS_description.md`
- `{session-name}` - From continuity ledger or `general`
- `YYYY-MM-DD_HH-MM-SS` - Date and time created
- `description` - Brief kebab-case summary

## Document Structure

1. **YAML Frontmatter** - date, session_name, git_commit, branch, tags
2. **Task(s)** - Description with status (completed, in progress, planned)
3. **Critical References** - 2-3 most important spec/architecture docs
4. **Recent Changes** - In `file:line` format
5. **Learnings** - Patterns, root causes, integration points
6. **Post-Mortem** (Required):
   - What Worked - Successful approaches
   - What Failed - Approaches that didn't work and why
   - Key Decisions - Choices made with rationale
7. **Artifacts** - Exhaustive list of produced/updated files
8. **Action Items & Next Steps** - Specific tasks for next session
9. **Other Notes** - Additional relevant information

## Usage

```bash
# Create handoff
/create_handoff

# Resume from handoff (by path)
/resume_handoff thoughts/shared/handoffs/ENG-1234/YYYY-MM-DD_HH-MM-SS_description.md

# Resume from handoff (by ticket)
/resume_handoff ENG-1234
```

## Guidelines

- More information, not less (err on comprehensive)
- Use `file:line` references over code snippets
- Separate what worked from what failed
- Learnings should be specific with file:line refs
- Next steps should be actionable
- Include cross-references to plans and research
