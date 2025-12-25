---
description: Create handoff document for transferring work to another session
---

# Create Handoff

You are tasked with writing a handoff document to hand off your work to another agent in a new session. You will create a handoff document that is thorough, but also **concise**. The goal is to compact and summarize your context without losing any of the key details of what you're working on.


## Process
### 1. Filepath & Metadata
Use the following information to understand how to create your document:

**First, determine the session name from the active ledger:**
```bash
ls CONTINUITY_CLAUDE-*.md 2>/dev/null | head -1 | sed 's/CONTINUITY_CLAUDE-\(.*\)\.md/\1/'
```

This returns the active work stream name (e.g., `open-source-release`). Use this as the handoff folder name.

If no ledger exists, use `general` as the folder name.

**Create your file under:** `thoughts/shared/handoffs/{session-name}/YYYY-MM-DD_HH-MM-SS_description.md`, where:
- `{session-name}` is from the ledger (e.g., `open-source-release`) or `general` if no ledger
- `YYYY-MM-DD` is today's date
- `HH-MM-SS` is the current time in 24-hour format
- `description` is a brief kebab-case description

Run the `~/.claude/scripts/spec_metadata.sh` script to generate all relevant metadata

### 1b. Braintrust Trace IDs (for Artifact Index)
Read the Braintrust session state file to get trace IDs for linking this handoff to the session:

```bash
cat ~/.claude/state/braintrust_sessions/*.json | jq -s 'sort_by(.started) | last'
```

This returns JSON with:
- `root_span_id`: The Braintrust trace ID (use this)
- `current_turn_span_id`: The current turn span ID (use this as turn_span_id)

The `session_id` is the filename stem (same as root_span_id in most cases).

If no state file exists (Braintrust not configured), leave these fields blank.

**Examples:**
- With ledger `open-source-release`: `thoughts/shared/handoffs/open-source-release/2025-01-08_13-55-22_create-context-compaction.md`
- No ledger (general): `thoughts/shared/handoffs/general/2025-01-08_13-55-22_create-context-compaction.md`

### 2. Handoff writing.
using the above conventions, write your document. use the defined filepath, and the following YAML frontmatter pattern. Use the metadata gathered in step 1, Structure the document with YAML frontmatter followed by content:

Use the following template structure:
```markdown
---
date: [Current date and time with timezone in ISO format]
session_name: [From ledger, e.g., "open-source-release" - see step 1]
researcher: [Researcher name from thoughts status]
git_commit: [Current commit hash]
branch: [Current branch name]
repository: [Repository name]
topic: "[Feature/Task Name] Implementation Strategy"
tags: [implementation, strategy, relevant-component-names]
status: complete
last_updated: [Current date in YYYY-MM-DD format]
last_updated_by: [Researcher name]
type: implementation_strategy
root_span_id: [Braintrust trace ID - see step 1b]
turn_span_id: [Current turn span ID - see step 1b]
---

# Handoff: {very concise description}

## Task(s)
{description of the task(s) that you were working on, along with the status of each (completed, work in progress, planned/discussed). If you are working on an implementation plan, make sure to call out which phase you are on. Make sure to reference the plan document and/or research document(s) you are working from that were provided to you at the beginning of the session, if applicable.}

## Critical References
{List any critical specification documents, architectural decisions, or design docs that must be followed. Include only 2-3 most important file paths. Leave blank if none.}

## Recent changes
{describe recent changes made to the codebase that you made in line:file syntax}

## Learnings
{describe important things that you learned - e.g. patterns, root causes of bugs, or other important pieces of information someone that is picking up your work after you should know. consider listing explicit file paths.}

## Post-Mortem (Required for Artifact Index)

### What Worked
{Describe successful approaches, patterns that helped, tools that worked well. Be specific - these get indexed for future sessions.}
- Approach 1: [what and why it worked]
- Pattern: [pattern name] was effective because [reason]

### What Failed
{Describe attempted approaches that didn't work, errors encountered, dead ends. This helps future sessions avoid the same mistakes.}
- Tried: [approach] → Failed because: [reason]
- Error: [error type] when [action] → Fixed by: [solution]

### Key Decisions
{Document important choices made during this task and WHY they were made. Future sessions will reference these.}
- Decision: [choice made]
  - Alternatives considered: [other options]
  - Reason: [why this choice]

## Artifacts
{ an exhaustive list of artifacts you produced or updated as filepaths and/or file:line references - e.g. paths to feature documents, implementation plans, etc that should be read in order to resume your work.}

## Action Items & Next Steps
{ a list of action items and next steps for the next agent to accomplish based on your tasks and their statuses}

## Other Notes
{ other notes, references, or useful information - e.g. where relevant sections of the codebase are, where relevant documents are, or other important things you leanrned that you want to pass on but that don't fall into the above categories}
```
---

### 3. Confirm completion

Once the document is saved, respond to the user with the template between <template_response></template_response> XML tags. do NOT include the tags in your response.

<template_response>
Handoff created and synced! You can resume from this handoff in a new session with the following command:

```bash
/resume_handoff path/to/handoff.md
```
</template_response>

for example (between <example_response></example_response> XML tags - do NOT include these tags in your actual response to the user)

<example_response>
Handoff created and synced! You can resume from this handoff in a new session with the following command:

```bash
/resume_handoff thoughts/shared/handoffs/open-source-release/2025-01-08_13-44-55_create-context-compaction.md
```
</example_response>

---

### 4. Mark Session Outcome

After confirming the handoff was created, use the AskUserQuestion tool to ask about the session outcome:

```
Question: "How did this task/session go?"
Options:
  - SUCCEEDED: Task completed successfully
  - PARTIAL_PLUS: Mostly done, minor issues remain
  - PARTIAL_MINUS: Some progress, major issues remain
  - FAILED: Task abandoned or blocked
```

Based on the user's response, run:
```bash
uv run python scripts/context_graph_mark.py --handoff <handoff_id> --outcome <OUTCOME>
```

To get the handoff_id, query the database:
```bash
sqlite3 .claude/cache/context-graph/context.db "SELECT id FROM handoffs ORDER BY indexed_at DESC LIMIT 1"
```

If the database doesn't exist yet (first handoff), skip this step.

---
##.  Additional Notes & Instructions
- **more information, not less**. This is a guideline that defines the minimum of what a handoff should be. Always feel free to include more information if necessary.
- **be thorough and precise**. include both top-level objectives, and lower-level details as necessary.
- **avoid excessive code snippets**. While a brief snippet to describe some key change is important, avoid large code blocks or diffs; do not include one unless it's necessary (e.g. pertains to an error you're debugging). Prefer using `/path/to/file.ext:line` references that an agent can follow later when it's ready, e.g. `packages/dashboard/src/app/dashboard/page.tsx:12-24`
