---
name: cli-reference
description: Claude Code CLI commands, flags, headless mode, and automation patterns
allowed-tools: [Read]
---

# CLI Reference

Complete reference for Claude Code command-line interface.

## When to Use

- "What CLI flags are available?"
- "How do I use headless mode?"
- "Claude in automation/CI/CD"
- "Output format options"
- "System prompt via CLI"
- "How do I spawn agents properly?"

## Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `claude` | Start interactive REPL | `claude` |
| `claude "query"` | REPL with initial prompt | `claude "explain this project"` |
| `claude -p "query"` | Headless mode (SDK) | `claude -p "explain function"` |
| `cat file \| claude -p` | Process piped content | `cat logs.txt \| claude -p "explain"` |
| `claude -c` | Continue most recent | `claude -c` |
| `claude -c -p "query"` | Continue via SDK | `claude -c -p "check types"` |
| `claude -r "id" "query"` | Resume session | `claude -r "auth" "finish PR"` |
| `claude update` | Update version | `claude update` |
| `claude mcp` | Configure MCP servers | See MCP docs |

## Session Control

| Flag | Description | Example |
|------|-------------|---------|
| `--continue, -c` | Load most recent conversation | `claude --continue` |
| `--resume, -r` | Resume session by ID/name | `claude --resume auth-refactor` |
| `--session-id` | Use specific UUID | `claude --session-id "550e8400-..."` |
| `--fork-session` | Create new session on resume | `claude --resume abc --fork-session` |

## Headless Mode (Critical for Agents)

| Flag | Description | Example |
|------|-------------|---------|
| `--print, -p` | Non-interactive, exit after | `claude -p "query"` |
| `--output-format` | `text`, `json`, `stream-json` | `claude -p --output-format json` |
| `--max-turns` | Limit agentic turns | `claude -p --max-turns 100 "query"` |
| `--verbose` | Full turn-by-turn output | `claude --verbose` |
| `--dangerously-skip-permissions` | Skip permission prompts | `claude -p --dangerously-skip-permissions` |
| `--include-partial-messages` | Include streaming events | `claude -p --output-format stream-json --include-partial-messages` |
| `--input-format` | Input format (text/stream-json) | `claude -p --input-format stream-json` |

## Tool Control

| Flag | Description | Example |
|------|-------------|---------|
| `--allowedTools` | Auto-approve these tools | `"Bash(git log:*)" "Read"` |
| `--disallowedTools` | Block these tools | `"Bash(rm:*)" "Edit"` |
| `--tools` | Only allow these tools | `--tools "Bash,Edit,Read"` |

## Subagent Definition (--agents flag)

Define custom subagents inline via JSON:

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on code quality and security.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  },
  "debugger": {
    "description": "Debugging specialist for errors and test failures.",
    "prompt": "You are an expert debugger. Analyze errors and provide fixes."
  }
}'
```

### Agent Fields

| Field | Required | Description |
|-------|----------|-------------|
| `description` | Yes | When to invoke this agent |
| `prompt` | Yes | System prompt for behavior |
| `tools` | No | Allowed tools (inherits all if omitted) |
| `model` | No | `sonnet`, `haiku`, or `claude-opus-4-5-20251101` |

### Key Insight
When Lead uses Task tool, it auto-spawns from these definitions. No manual spawn needed.

## System Prompt Customization

| Flag | Behavior | Modes |
|------|----------|-------|
| `--system-prompt` | **Replace** entire prompt | Interactive + Print |
| `--system-prompt-file` | **Replace** from file | Print only |
| `--append-system-prompt` | **Append** to default (recommended) | Interactive + Print |

**Use `--append-system-prompt`** for most cases - preserves Claude Code capabilities.

## Model Selection

| Flag | Description | Example |
|------|-------------|---------|
| `--model` | Set model for session | `--model claude-sonnet-4-5` |
| `--fallback-model` | Fallback if default overloaded | `--fallback-model sonnet` |

Aliases: `sonnet`, `opus`, `haiku`

## MCP Configuration

| Flag | Description | Example |
|------|-------------|---------|
| `--mcp-config` | Load MCP servers from JSON | `--mcp-config ./mcp.json` |
| `--strict-mcp-config` | Only use these MCP servers | `--strict-mcp-config --mcp-config ./mcp.json` |

## Advanced Flags

| Flag | Description | Example |
|------|-------------|---------|
| `--add-dir` | Add working directories | `--add-dir ../apps ../lib` |
| `--agent` | Specify agent for session | `--agent my-custom-agent` |
| `--permission-mode` | Start in permission mode | `--permission-mode plan` |
| `--permission-prompt-tool` | MCP tool for permissions | `--permission-prompt-tool mcp_auth` |
| `--plugin-dir` | Load plugins from directory | `--plugin-dir ./my-plugins` |
| `--settings` | Load settings from file/JSON | `--settings ./settings.json` |
| `--setting-sources` | Which settings to load | `--setting-sources user,project` |
| `--betas` | Beta API headers | `--betas interleaved-thinking` |
| `--debug` | Enable debug mode | `--debug "api,hooks"` |
| `--ide` | Auto-connect to IDE | `--ide` |
| `--chrome` | Enable Chrome integration | `--chrome` |
| `--no-chrome` | Disable Chrome for session | `--no-chrome` |
| `--enable-lsp-logging` | Verbose LSP debugging | `--enable-lsp-logging` |
| `--version, -v` | Output version | `claude -v` |

## Output Formats

### JSON (for parsing)
```bash
claude -p "query" --output-format json
# {"result": "...", "session_id": "...", "usage": {...}}
```

### Streaming (for real-time monitoring)
```bash
claude -p "query" --output-format stream-json
# Newline-delimited JSON events
```

### Structured Output (schema validation)
```bash
claude -p "Extract data" \
  --output-format json \
  --json-schema '{"type":"object","properties":{...}}'
```

## Headless Agent Pattern (CRITICAL)

Proper headless agent spawn:

```bash
claude -p "$TASK_PROMPT" \
  --session-id "$UUID" \
  --dangerously-skip-permissions \
  --max-turns 100 \
  --output-format stream-json \
  --agents '{...}' \
  --append-system-prompt "Context: ..."
```

**Missing any of these causes hangs:**
- `--session-id` - Track the session
- `--dangerously-skip-permissions` - Headless requires this
- `--max-turns` - Prevents infinite loops

## Common Patterns

### CI/CD Automation
```bash
claude -p "Run tests and fix failures" \
  --dangerously-skip-permissions \
  --max-turns 50 \
  --output-format json | jq '.result'
```

### Piped Input
```bash
cat error.log | claude -p "Find root cause"
gh pr diff | claude -p "Review for security"
```

### Multi-turn Session
```bash
id=$(claude -p "Start task" --output-format json | jq -r '.session_id')
claude -p "Continue" --resume "$id"
```

### Stream Monitoring
```bash
claude -p "Long task" \
  --output-format stream-json \
  --include-partial-messages | while read -r line; do
    echo "$line" | jq '.type'
done
```

## Keyboard Shortcuts (Interactive)

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current |
| `Ctrl+D` | Exit |
| `Ctrl+R` | Reverse search history |
| `Esc Esc` | Rewind changes |
| `Shift+Tab` | Toggle permission mode |

## Quick Commands

| Prefix | Action |
|--------|--------|
| `/` | Slash command |
| `!` | Bash mode |
| `#` | Add to memory |
| `@` | File mention |
