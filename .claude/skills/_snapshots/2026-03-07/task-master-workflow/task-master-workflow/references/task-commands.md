# Task Master Command Reference

Complete reference for task-master-ai commands and MCP tools.

## MCP Tools (Preferred)

### Project Management
- `next_task` - Get next available task to work on
- `get_task` - Show detailed information for specific task (requires task ID)
- `get_tasks` - List all tasks with their current status
- `set_task_status` - Update task status (requires ID and status value)

### Task Updates
- `update_subtask` - Add implementation notes to subtask (requires ID and prompt)
- `update_task` - Update specific task details (requires ID and prompt)
- `add_task` - Create new task with AI assistance (requires prompt, optional --research)

### Analysis
- `analyze_project_complexity` - Analyze complexity of tasks
- `complexity_report` - View detailed complexity analysis report

## Bash Commands (Fallback)

### Core Workflow
- `task-master next` - Get next available task
- `task-master show <id>` - View detailed task information
- `task-master list` - Show all tasks with status
- `task-master set-status --id=<id> --status=<status>` - Update task status

### Task Management
- `task-master add-task --prompt="description" [--research]` - Add new task
- `task-master expand --id=<id> [--research] [--force]` - Break task into subtasks
- `task-master update-task --id=<id> --prompt="changes"` - Update specific task
- `task-master update-subtask --id=<id> --prompt="notes"` - Add implementation notes

### Analysis & Planning
- `task-master analyze-complexity [--research]` - Analyze task complexity
- `task-master complexity-report` - View complexity analysis
- `task-master expand --all [--research]` - Expand all eligible tasks

## Status Values

- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `deferred` - Postponed to later
- `cancelled` - No longer needed
- `blocked` - Waiting on external factors

## Task ID Format

- Main tasks: `1`, `2`, `3`
- Subtasks: `1.1`, `1.2`, `2.1`
- Sub-subtasks: `1.1.1`, `1.1.2`

## Examples

### Starting Work
```bash
task-master next
# Output: Task 1.2 - Implement JWT authentication

task-master show 1.2
# Shows full details, dependencies, test strategy

task-master set-status --id=1.2 --status=in-progress
```

### Logging Progress
```bash
task-master update-subtask --id=1.2 --prompt="Implemented JWT sign/verify functions in src/auth/jwt.ts. Added unit tests for token generation and validation. Tokens expire in 24h with userId in payload."
```

### Completing Task
```bash
task-master set-status --id=1.2 --status=done
task-master next
# Automatically shows next task
```
