# Toolbar & Collaboration

Vercel's toolbar appears on preview deployments, allowing team members to leave comments and feedback directly on the deployed site. These comments are accessible via Cloud MCP tools (prefixed `mcp__claude_ai_Vercel__`).

## Available Tools

| Tool | What It Does |
|------|-------------|
| `list_toolbar_threads` | List all feedback threads on a deployment or project |
| `get_toolbar_thread` | Get full thread with all comments |
| `reply_to_toolbar_thread` | Post a reply to an existing thread |
| `edit_toolbar_message` | Edit a message you posted |
| `change_toolbar_thread_resolve_status` | Mark a thread as resolved or reopen it |
| `add_toolbar_reaction` | Add an emoji reaction to a message |

## Workflow

```bash
# 1. Check for feedback on recent deployments
mcp__claude_ai_Vercel__list_toolbar_threads

# 2. Read specific thread
mcp__claude_ai_Vercel__get_toolbar_thread  # with threadId

# 3. Reply with implementation status
mcp__claude_ai_Vercel__reply_to_toolbar_thread  # with threadId + message

# 4. Resolve when addressed
mcp__claude_ai_Vercel__change_toolbar_thread_resolve_status  # resolve
```

## Use Cases

- **Code review follow-up**: After deploying a preview, check if reviewers left visual feedback
- **Ralph integration**: Pull toolbar comments as follow-up tasks for the deployer agent
- **Bug reports**: Team members can annotate visual bugs on preview deploys; agents can read and triage them
- **Design feedback**: Designers leave pixel-level feedback on preview URLs; agents can read and implement changes

## Notes

- These are Cloud MCP tools (`mcp__claude_ai_Vercel__*`), not local CLI commands
- No CLI equivalent exists for toolbar operations
- Requires the Vercel cloud MCP connection (available by default in Claude Code sessions)
