---
name: meeting-brief-generator
description: Generates structured meeting briefs when user opens meeting-agendas files, discusses meetings, or mentions calls. Auto-extracts context from related projects, creates checklists, and links to Q4 goals documentation.
---

# Meeting Brief Generator

Automatically generate structured meeting briefs with context from related projects when user prepares for meetings.

## Automatic Activation Triggers

Invoke this skill when detecting any of these patterns:

### File-Based Triggers
- User opens or edits files in meeting-agendas/ directory
- User opens files matching patterns: *meeting*.md, *agenda*.md, *brief*.md
- User edits files with call or meeting in the filename

### Conversation Triggers
- User mentions meeting, call, brief, agenda
- User asks prep for meeting, prepare for call
- User says meeting with, call with
- User mentions specific people in meeting context

## Brief Structure Template

When generating a meeting brief, use this standardized structure with Quick Context, Key Topics, Preparation Checklist, Questions to Ask, Expected Outcomes, and Related Context sections.

## Context Enhancement Process

Search for related project files by mapping meeting topics to Q4 goal projects. Look for STATUS.md, NOTES.md, and taskmaster tasks to provide relevant context.

## Proactive Behaviors

When user opens a meeting file, automatically search for related context and offer to generate or enhance the brief with project information.

## Notes

- Extract attendees from filename patterns
- Link to specific locations in STATUS.md
- Maintain consistent brief structure
- Always search for context before asking user
