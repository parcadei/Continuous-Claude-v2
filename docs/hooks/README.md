# Hook System

Hooks are automatic behaviors triggered at specific lifecycle points during Claude sessions. They enable powerful features like smart search routing, file conflict prevention, real-time type checking, and multi-session coordination.

## Overview

Hooks run automatically at defined lifecycle events (session start, user prompt, tool use, etc.) and can:
- Inject context into Claude's awareness
- Block/redirect tool calls to more efficient alternatives
- Validate code changes in real-time
- Coordinate across concurrent sessions
- Extract learnings automatically

Hooks are implemented as command-line scripts (TypeScript, Python, shell) that receive JSON input via stdin and return JSON output via stdout.

## Lifecycle Events

Hooks can be registered for these lifecycle events:

### SessionStart
Triggered when a new session begins or a session is resumed.
- **Input**: `{ session_id, hook_event_name, source, cwd }`
- **Source values**: `startup`, `resume`, `clear`, `compact`

### UserPromptSubmit
Triggered when the user submits a prompt (before Claude responds).
- **Input**: `{ session_id, hook_event_name, prompt, cwd }`
- **Use cases**: Skill activation suggestions, memory awareness, pattern inference

### PreToolUse
Triggered before a tool is executed. Can block, allow, modify, or ask for permission.
- **Input**: `{ session_id, tool_name, tool_input, tool_use_id, cwd }`
- **Output**: `{ hookSpecificOutput: { permissionDecision: 'allow'|'deny'|'ask', permissionDecisionReason, updatedInput } }`
- **Use cases**: TLDR enforcement, search routing, file claims, signature injection
- **Note**: Use `updatedInput` to modify the tool's input before execution

### PostToolUse
Triggered after a tool executes successfully.
- **Input**: `{ session_id, tool_name, tool_input, tool_response, cwd }`
- **Use cases**: Type checking, handoff indexing, learning extraction

### PreCompact
Triggered before context window compaction.
- **Input**: `{ session_id, transcript_path }`
- **Use cases**: Save state before compaction

### SubagentStart
Triggered when a subagent (Task tool) spawns.
- **Input**: `{ session_id, agent_id, hook_event_name, cwd }`
- **Use cases**: Pattern-aware coordination, agent registration
- **Cannot block**: Can only inject context

### SubagentStop
Triggered when a subagent completes.
- **Input**: `{ session_id, agent_id, hook_event_name }`
- **Use cases**: Learning extraction, pattern completion tracking

### Stop
Triggered when Claude generates a stop sequence (task completion).
- **Input**: `{ session_id, transcript_path, stop_hook_active }`
- **Use cases**: Auto-handoff creation, force continuation
- **CRITICAL**: Check `stop_hook_active: true` to prevent infinite loops!

### SessionEnd
Triggered when the session terminates (clear, logout).
- **Input**: `{ session_id, transcript_path, reason }`
- **Use cases**: Cleanup, outcome tracking, learning extraction

### PermissionRequest
Triggered when a permission dialog would be shown to the user.
- **Input**: `{ session_id, tool_name, tool_input, cwd }`
- **Output**: `{ hookSpecificOutput: { decision: { behavior: 'allow'|'deny', updatedInput, message, interrupt } } }`
- **Use cases**: Auto-approve trusted operations, auto-deny dangerous ones
- **Requires matcher**: YES (matches tool name)

### Notification
Triggered when Claude Code sends a notification.
- **Input**: `{ session_id, message, notification_type }`
- **Notification types**: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`
- **Use cases**: Custom notification handling, alerts
- **Requires matcher**: YES (matches notification_type)

## Hook Categories

### Session Lifecycle

**session-register** (SessionStart)
- Registers session in PostgreSQL coordination database
- Displays active peer sessions working on the same project
- Enables cross-session file conflict warnings

**session-start-recall** (SessionStart)
- Queries semantic memory for relevant learnings from past sessions
- Injects top 3 learnings related to current work context
- Searches ledgers and handoffs to determine context query

**session-end-cleanup** (SessionEnd)
- Updates continuity ledger timestamps
- Cleans up old agent cache files (7-day retention)
- Triggers background learning extraction via Braintrust

**session-outcome** (SessionEnd)
- Prompts user to mark handoff outcome (SUCCEEDED, PARTIAL_PLUS, PARTIAL_MINUS, FAILED)
- Provides SQLite query to find handoff ID
- Only prompts on user-initiated session end, not auto-compaction

### User Prompt Processing

**skill-activation-prompt** (UserPromptSubmit)
- Matches user prompt against skill-rules.json patterns
- Suggests relevant skills based on priority (critical, high, medium, low)
- Runs pattern inference for agentic workflows (swarm, hierarchical, pipeline, etc.)
- Shows context warnings (context percentage, resource limits)
- Can block response if critical skills are required

**memory-awareness** (UserPromptSubmit)
- Extracts intent from user prompt (removes meta-language)
- Fast text search against archival_memory database
- Injects MEMORY MATCH context if relevant learnings found
- Claude proactively discloses and uses memories

**premortem-suggest** (UserPromptSubmit)
- Suggests running premortem analysis for complex tasks
- Identifies potential failure modes before implementation

### Tool Interception

**tldr-read-enforcer** (PreToolUse:Read)
- Blocks Read tool for code files, returns TLDR structured context instead
- 95% token savings (50-500 tokens vs 3000-20000 raw file)
- Context-aware layers (AST, call graph, CFG, DFG, PDG) based on search intent
- Analyzes transcript and search context to determine relevant layers
- Bypasses for config files, test files, hooks/skills directories

**smart-search-router** (PreToolUse:Grep)
- Classifies queries as structural, semantic, or literal
- Blocks Grep, suggests TLDR search (finds + enriches in one call)
- Stores search context for downstream hooks (tldr-read-enforcer)
- Uses symbol index to detect function/class/variable targets
- Provides cross-file caller information

**file-claims** (PreToolUse:Edit)
- Checks PostgreSQL coordination database for file claims
- Warns if file is being edited by another concurrent session
- Claims file for current session to prevent conflicts
- Part of multi-session coordination layer

**signature-helper** (PreToolUse:Edit)
- Extracts function calls from edit content
- Looks up function signatures from symbol index
- Injects signatures as additional context
- Helps Claude use correct parameters without reading definition files

**import-validator** (PostToolUse:Edit, PostToolUse:Write)
- Validates import statements in edited files
- Checks for missing or incorrect imports
- Suggests corrections

### Validation

**typescript-preflight** (PostToolUse:Edit, PostToolUse:Write)
- Runs tsc + qlty after TypeScript file edits
- Returns type errors and lint issues immediately
- Blocks with error message so Claude can fix before proceeding
- Skips node_modules and test files

**compiler-in-the-loop** (PostToolUse, Stop)
- Runs language-specific compiler/linter after code changes
- Supports Python, TypeScript, Go, Rust
- Injects errors into context for iterative fixing

## Hook Registration

Hooks are registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-register.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/tldr-read-enforcer.sh",
            "timeout": 20
          }
        ]
      }
    ]
  }
}
```

### Hook Configuration

- **matcher**: Tool name pattern to match (e.g., "Read", "Edit|Write", "*")
- **type**: Always "command" for external scripts
- **command**: Path to hook script (use `$CLAUDE_PROJECT_DIR` or `$HOME` for portability)
- **timeout**: Max execution time in seconds

### Matcher Pattern Syntax

| Pattern | Matches | Example |
|---------|---------|---------|
| `Bash` | Exact match | Only Bash tool |
| `Edit\|Write` | OR operator | Edit OR Write |
| `Read.*` | Regex | Read, ReadFile, etc. |
| `mcp__.*__write.*` | MCP tools | MCP write operations |
| `*` | Wildcard | All tools |

**Case-sensitive:** `Bash` does NOT match `bash`

### Events Requiring Matchers

| Event | Requires Matcher | Matcher Values |
|-------|------------------|----------------|
| PreToolUse | YES | Tool name |
| PostToolUse | YES | Tool name |
| PermissionRequest | YES | Tool name |
| Notification | YES (optional) | `permission_prompt`, `idle_prompt`, etc. |
| SessionStart | YES (optional) | `startup`, `resume`, `clear`, `compact` |
| PreCompact | YES (optional) | `manual`, `auto` |
| UserPromptSubmit | NO | — |
| SessionEnd | NO | — |
| Stop | NO | — |
| SubagentStop | NO | — |

### Hook Ordering

Hooks execute in the order listed. For PreToolUse, if any hook returns `deny`, subsequent hooks are skipped.

## Exit Code Behavior

| Exit Code | Behavior | stdout | stderr |
|-----------|----------|--------|--------|
| **0** | Success | JSON processed (or plain text for UserPromptSubmit/SessionStart) | Ignored |
| **2** | Blocking error | **IGNORED** | Error message shown |
| **Other** | Non-blocking error | Ignored | Shown in verbose mode |

### Exit Code 2 by Hook Event

| Hook Event | Effect of Exit Code 2 |
|------------|----------------------|
| PreToolUse | Blocks tool, stderr shown to Claude |
| PermissionRequest | Denies permission, stderr shown to Claude |
| PostToolUse | stderr shown to Claude (tool already ran) |
| UserPromptSubmit | Blocks prompt, erases it, stderr shown to user only |
| Stop | Blocks stoppage, stderr shown to Claude |
| SubagentStop | Blocks stoppage, stderr shown to Claude subagent |
| Notification | stderr shown to user only |
| PreCompact | stderr shown to user only |
| SessionStart | stderr shown to user only |
| SessionEnd | stderr shown to user only |

## Hook Types

### Command Hooks (type: "command")

Execute bash commands or scripts. This is the default and most common type.

```json
{
  "type": "command",
  "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/my-hook.sh",
  "timeout": 60
}
```

### Prompt-Based Hooks (type: "prompt")

Use an LLM (Haiku) to make context-aware decisions. Best for Stop and SubagentStop hooks.

```json
{
  "type": "prompt",
  "prompt": "Evaluate if Claude should stop. Context: $ARGUMENTS. Check if all tasks are complete.",
  "timeout": 30
}
```

**Response schema:**
```json
{
  "decision": "approve" | "block",
  "reason": "Explanation for the decision",
  "continue": false,
  "stopReason": "Message shown to user",
  "systemMessage": "Warning or context"
}
```

**When to use:**
- **Command hooks**: Deterministic rules, fast execution
- **Prompt hooks**: Context-aware decisions, natural language understanding

## Working with MCP Tools

MCP tools follow the naming pattern `mcp__<server>__<tool>`:

| Example | Description |
|---------|-------------|
| `mcp__memory__create_entities` | Memory server's create entities tool |
| `mcp__filesystem__read_file` | Filesystem server's read file tool |
| `mcp__github__search_repositories` | GitHub server's search tool |

**Matcher examples:**
```json
{
  "matcher": "mcp__memory__.*",        // All memory server tools
  "matcher": "mcp__.*__write.*",       // All MCP write operations
  "matcher": "mcp__github__.*"         // All GitHub tools
}
```

## Creating Custom Hooks

### Input/Output Protocol

Hooks receive JSON via stdin and output JSON via stdout.

**Input Schema (varies by event type):**
```typescript
interface SessionStartInput {
  session_id: string;
  hook_event_name: string;
  source: 'startup' | 'resume' | 'clear' | 'compact';
  cwd: string;
}

interface PreToolUseInput {
  session_id: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: Record<string, any>;
  cwd: string;
  transcript_path?: string;
}

interface UserPromptSubmitInput {
  session_id: string;
  hook_event_name: string;
  prompt: string;
  cwd: string;
}
```

**Output Schema:**
```typescript
interface HookOutput {
  result?: 'continue' | 'block';
  message?: string;  // Injected into Claude's context
  hookSpecificOutput?: {
    hookEventName: string;
    permissionDecision?: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
    additionalContext?: string;
  };
}
```

### Example Hook: Simple Reminder

**TypeScript:**
```typescript
import { readFileSync } from 'fs';

interface UserPromptSubmitInput {
  prompt: string;
}

async function main() {
  const input: UserPromptSubmitInput = JSON.parse(
    readFileSync(0, 'utf-8')
  );

  if (input.prompt.includes('delete')) {
    console.log(JSON.stringify({
      message: 'Reminder: Consider backing up before deletion.'
    }));
  } else {
    console.log('{}');
  }
}

main();
```

**Python:**
```python
import json
import sys

def main():
    input_data = json.loads(sys.stdin.read())

    if 'delete' in input_data.get('prompt', '').lower():
        output = {
            'message': 'Reminder: Consider backing up before deletion.'
        }
        print(json.dumps(output))
    else:
        print('{}')

if __name__ == '__main__':
    main()
```

### Example Hook: PreToolUse Blocker

Block dangerous operations:

```typescript
import { readFileSync } from 'fs';

async function main() {
  const input = JSON.parse(readFileSync(0, 'utf-8'));

  if (input.tool_name === 'Bash' &&
      input.tool_input.command?.includes('rm -rf /')) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Dangerous command blocked for safety.'
      }
    }));
  } else {
    console.log('{}');
  }
}

main();
```

### Best Practices

1. **Fail Gracefully**: Always output valid JSON, even on errors. Use `{}` for no-op.
2. **Timeout Awareness**: Keep execution under timeout limit. Use async spawn for slow tasks.
3. **Silent Failures**: Log errors to stderr, not stdout (stdout is parsed as JSON).
4. **Idempotency**: Hooks may run multiple times. Design for idempotent behavior.
5. **Context Injection**: Use `message` for user-visible output, `additionalContext` for Claude-only context.
6. **Token Efficiency**: Keep injected context concise. TLDR hooks save 95% tokens vs raw files.

## Hook Behavior Examples

### TLDR Read Enforcement

When Claude tries to read a code file:

```
Read → tldr-read-enforcer hook intercepts
     → Analyzes search context (from smart-search-router)
     → Returns structured context (L1:AST + L2:CallGraph)
     → Claude receives function signatures + call graph (500 tokens)
     → vs raw file read (5000 tokens)
     → 90% token savings
```

### Smart Search Routing

When Claude tries to grep:

```
Grep "process_data" → smart-search-router hook intercepts
                    → Classifies as "literal" query
                    → Extracts target: "process_data" (function)
                    → Stores search context for tldr-read-enforcer
                    → Blocks Grep, suggests TLDR search instead
                    → TLDR finds + enriches (call graph, docstring)
```

### Multi-Session Coordination

When Claude tries to edit a file:

```
Edit file.py → file-claims hook intercepts
            → Checks PostgreSQL for file claim
            → Session A already editing file.py
            → Warns: "File conflict: Session A is editing file.py"
            → Claude can coordinate or edit different file
```

### Type Checking

When Claude edits a TypeScript file:

```
Edit hook.ts → typescript-preflight hook runs after edit
            → Executes: tsc --noEmit hook.ts
            → Finds: "Type 'string' not assignable to 'number'"
            → Blocks with error message
            → Claude sees error immediately and fixes in next turn
```

### Skill Activation

When user submits a prompt:

```
Prompt: "refactor this code" → skill-activation-prompt hook runs
                             → Matches "refactor" keyword
                             → Suggests: refactor skill (high priority)
                             → Suggests: premortem skill (medium priority)
                             → Claude: /refactor before responding
```

## Advanced Features

### Pattern-Aware Coordination

Subagent hooks detect multi-agent patterns from environment variables:

```bash
PATTERN_TYPE=swarm    # Enables broadcast messaging
PATTERN_TYPE=jury     # Enables vote isolation
PATTERN_TYPE=pipeline # Enables stage sequencing
```

Hooks inject pattern-specific context and coordinate agent interactions.

### Symbol Indexing

The session-symbol-index hook builds a symbol index at session start:

```json
{
  "process_data": {
    "type": "function",
    "location": "/path/to/file.py:42"
  },
  "DataProcessor": {
    "type": "class",
    "location": "/path/to/file.py:10"
  }
}
```

Used by smart-search-router and signature-helper for accurate code understanding.

### Search Context Chaining

smart-search-router stores search context that tldr-read-enforcer consumes:

```json
{
  "timestamp": 1704067200000,
  "queryType": "literal",
  "pattern": "process_data",
  "target": "process_data",
  "targetType": "function",
  "suggestedLayers": ["ast", "call_graph", "cfg"],
  "callers": ["file1.py:10", "file2.py:25"]
}
```

This enables multi-layer context enrichment without repeated tool calls.

### Learning Extraction

session-end-cleanup spawns background process to extract learnings:

```bash
uv run python scripts/braintrust_analyze.py --learn --session-id <id>
```

Uses LLM-as-judge to extract:
- What worked
- What failed
- Decisions made
- Patterns discovered

Stored in archival_memory for future semantic recall.

## Debugging Hooks

### Check Hook Execution

Hooks log to stderr (not stdout, which is parsed as JSON):

```typescript
console.error('[my-hook] Processing input:', input);
```

### Test Hook Manually

```bash
echo '{"session_id":"test","prompt":"delete all files"}' | \
  node .claude/hooks/src/my-hook.js
```

### Disable Hook Temporarily

Comment out in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      // {
      //   "matcher": "Read",
      //   "hooks": [...]
      // }
    ]
  }
}
```

### Check Hook Timeout

If hook exceeds timeout, it's killed and Claude continues. Increase timeout if needed:

```json
{
  "timeout": 30  // seconds
}
```

## Performance Considerations

- **TLDR hooks**: 95% token savings (50-500 tokens vs 3000-20000 raw)
- **Search routing**: Prevents inefficient Grep scans
- **Signature injection**: Avoids reading definition files (saves 1000+ tokens per function)
- **Symbol indexing**: One-time 5s cost at session start, saves 100+ tool calls
- **Learning extraction**: Background process, doesn't block session end

## Security Considerations

Hooks run with the same permissions as the Claude CLI. They can:
- Execute arbitrary commands
- Read/write files in the project
- Access environment variables
- Make network requests

**Recommendations:**
- Review hook source code before enabling
- Use `$CLAUDE_PROJECT_DIR` paths to scope to current project
- Set reasonable timeouts to prevent hanging
- Validate hook inputs (untrusted user prompts)
- Use readonly operations when possible (PreToolUse hooks)

## Troubleshooting

**Hook not running:**
- Check settings.json syntax (valid JSON)
- Verify hook script exists at specified path
- Check file permissions (executable)
- Look for stderr logs

**Hook timing out:**
- Increase timeout value
- Move slow operations to background spawn
- Use caching for expensive operations

**Hook output not appearing:**
- Verify JSON output format
- Check for stdout vs stderr confusion
- Ensure `message` field is set for user-visible output

**Type errors after hook runs:**
- typescript-preflight may be reporting legitimate errors
- Check hook output for error details
- Fix reported type errors before proceeding

## Examples from Production

**Token savings (actual metrics):**
- TLDR enforcement: 95% reduction (5000 → 250 tokens)
- Smart search routing: 90% reduction (2000 → 200 tokens)
- Signature injection: 85% reduction (1000 → 150 tokens)

**Coordination (actual use):**
- File claims prevented 12 conflicts across 3 concurrent sessions
- Session awareness showed 2 other active sessions on same project
- Learning recall surfaced 5 relevant past solutions

**Validation (actual catches):**
- typescript-preflight caught 47 type errors before commit
- import-validator fixed 23 import paths
- compiler-in-the-loop prevented 8 runtime errors

## See Also

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system design
- [QUICKSTART.md](../QUICKSTART.md) - Getting started
- `.claude/hooks/src/` - Hook source code
- `.claude/settings.json` - Hook configuration
