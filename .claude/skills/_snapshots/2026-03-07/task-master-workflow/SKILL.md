---
name: task-master-workflow
description: Automatically assists with task-master-ai workflows when user discusses tasks, implementation work, opens .taskmaster files, or mentions what to work on. Proactively manages task status, logs progress, and suggests next tasks without explicit commands.
---

# Task Master Workflow Assistant

Automatically manage Task Master workflows by detecting when the user is working with tasks and proactively assisting without requiring explicit commands.

## Automatic Activation Triggers

Invoke this skill when detecting any of these patterns:

### File-Based Triggers
- User opens or edits files in `.taskmaster/` directory
- User opens or edits `.taskmaster/tasks/tasks.json`
- User opens or edits individual task files (`.taskmaster/tasks/task-*.md`)
- User opens project `STATUS.md` or `NOTES.md` files in Q4 goals projects

### Conversation Triggers
- User mentions "task", "subtask", "next task", "current task"
- User asks "what's next", "what should I work on", "show me tasks"
- User mentions specific task IDs like "task 1.2", "working on 3.1"
- User says "done", "finished", "completed", "mark as done"
- User mentions "implementation", "working on", "implementing"
- User discusses blocking issues or progress updates

### Context Triggers
- User just completed code changes and discusses what was implemented
- User is planning work for the session
- User references Task Master in any context

## Workflow Decision Tree

### Starting a Work Session

When user indicates they want to start working or asks what to work on:

1. **Fetch Next Task**
   - Use MCP tool `next_task` or run `task-master next`
   - If no task available, suggest creating tasks or running `task-master list`

2. **Show Task Details**
   - Use MCP tool `get_task` or run `task-master show <id>`
   - Present task title, description, details, and test strategy
   - Highlight any dependencies or blockers

3. **Provide Context Summary**
   - Summarize what needs to be implemented (2-3 sentences)
   - Break down into first concrete step
   - Suggest marking task as `in-progress`

4. **Offer to Mark In-Progress**
   - Ask: "Should I mark task <id> as in-progress?"
   - If confirmed, use `set_task_status` MCP tool or run `task-master set-status --id=<id> --status=in-progress`

### During Implementation

When user is actively coding or discussing implementation:

1. **Track Progress Contextually**
   - Remember which task ID user is working on
   - Note implementation decisions and approaches
   - Identify blockers or challenges mentioned

2. **Suggest Logging Progress**
   - When user completes a meaningful chunk of work, offer: "Want me to log this progress to task <id>?"
   - When user mentions blockers, offer: "Should I add this blocker to the task notes?"
   - Periodically (every 2-3 significant changes) suggest updating task

3. **Log Progress When Confirmed**
   - Use MCP tool `update_subtask` or run `task-master update-subtask --id=<id> --prompt="<summary>"`
   - Summarize what was implemented, decisions made, and any issues encountered
   - Keep summaries concise but informative (2-4 sentences)
   - Include relevant file paths, function names, or key implementation details

### Completing Work

When user indicates task completion:

1. **Verify Completion**
   - Ask: "Is task <id> fully complete and tested?"
   - If user confirms, proceed to mark done
   - If user indicates partial completion, offer to add notes about remaining work

2. **Mark Task as Done**
   - Use MCP tool `set_task_status` or run `task-master set-status --id=<id> --status=done`
   - Confirm completion with success message

3. **Automatically Fetch Next Task**
   - Immediately use `next_task` MCP tool or run `task-master next`
   - Show the next available task details
   - Suggest starting on it or ask if user wants to take a break

## Notes

- Never manually edit `.taskmaster/tasks/tasks.json` - always use commands
- Task markdown files in `.taskmaster/tasks/` are auto-generated
- Parent task status auto-updates based on subtask progress (v0.27.2+)
- Use `--research` flag for AI-enhanced task operations (requires PERPLEXITY_API_KEY)
- MCP integration provides faster operations than bash commands when available
