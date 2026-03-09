# Hook Templates Reference

Complete TypeScript templates for all 5 Claude Code hook event types.
Each template includes proper stdin parsing, error handling, and fail-open JSON output.

---

## Common Patterns

All hooks share these patterns:

**Stdin reading:** Two approaches exist in the codebase. Use the async chunk approach for new hooks.

**Output contract:** Every code path MUST print valid JSON to stdout. Stderr is for logging only.

**Fail-open:** On any error, output `{}` (or `{ "result": "continue" }` for SessionStart/SessionEnd) so the hook never blocks Claude.

**No shebang needed:** esbuild bundles to `.mjs` -- the settings.json entry uses `node <path>.mjs` directly.

---

## Template 1: PreToolUse

Intercepts tool calls before execution. Can allow, deny, or pass through.

**Output contract:**
- `{}` or `undefined` = no opinion (pass through)
- `{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow" } }` = explicitly allow
- `{ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "..." } }` = block the tool call

```typescript
/**
 * {{HOOK_NAME}} - PreToolUse ({{TOOL_PATTERN}})
 *
 * {{DESCRIPTION}}
 *
 * Hook: PreToolUse ({{TOOL_PATTERN}})
 */

interface HookInput {
  tool?: string;
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    command?: string;
    [key: string]: unknown;
  };
  session_id?: string;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main(): Promise<void> {
  let input: HookInput = {};

  try {
    const rawInput = (await readStdin()).trim();
    if (rawInput) {
      input = JSON.parse(rawInput);
    }
  } catch {
    // Parse error -- fail open
    console.log('{}');
    return;
  }

  const tool = input.tool || input.tool_name;

  // ---- CUSTOMIZE: Add your tool check logic here ----
  // Example: only act on specific tools
  // if (tool !== 'Bash') {
  //   console.log('{}');
  //   return;
  // }

  // ---- CUSTOMIZE: Add your decision logic here ----
  const shouldBlock = false; // Replace with actual condition

  if (shouldBlock) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'BLOCKED: Explain why the tool call was blocked.',
      },
    }));
    return;
  }

  // No opinion -- pass through
  console.log('{}');
}

main().catch((err) => {
  console.error(`[{{HOOK_NAME}}] Error: ${err.message}`);
  console.log('{}');
});
```

---

## Template 2: PostToolUse

Runs after a tool call completes. Can inject context into the conversation.

**Output contract:**
- `{}` = no context to inject
- `{ hookSpecificOutput: { hookEventName: "PostToolUse", systemPromptSuffix: "..." } }` = inject text after tool output

```typescript
/**
 * {{HOOK_NAME}} - PostToolUse ({{TOOL_PATTERN}})
 *
 * {{DESCRIPTION}}
 *
 * Hook: PostToolUse ({{TOOL_PATTERN}})
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface PostToolUseInput {
  session_id: string;
  tool_name: string;
  tool_input: {
    file_path?: string;
    command?: string;
    [key: string]: unknown;
  };
  tool_output?: string;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main(): Promise<void> {
  const rawInput = await readStdin();
  if (!rawInput.trim()) {
    console.log(JSON.stringify({}));
    return;
  }

  let data: PostToolUseInput;
  try {
    data = JSON.parse(rawInput);
  } catch {
    console.log(JSON.stringify({}));
    return;
  }

  // ---- CUSTOMIZE: Filter by tool name ----
  // if (data.tool_name !== 'Edit' && data.tool_name !== 'Write') {
  //   console.log(JSON.stringify({}));
  //   return;
  // }

  // ---- CUSTOMIZE: Build your context injection ----
  const contextToInject = ''; // Replace with actual context

  if (!contextToInject) {
    console.log(JSON.stringify({}));
    return;
  }

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      systemPromptSuffix: contextToInject,
    },
  }));
}

main().catch((err) => {
  console.error(`[{{HOOK_NAME}}] Error: ${err.message}`);
  console.log(JSON.stringify({}));
});
```

---

## Template 3: SessionStart

Runs when a Claude Code session starts, resumes, or context clears/compacts.

**Output contract:**
- `{ "result": "continue" }` = minimum valid output
- `{ "result": "continue", "message": "..." }` = show a status message
- `{ "result": "continue", "hookSpecificOutput": { "hookEventName": "SessionStart", "additionalContext": "..." } }` = inject context

```typescript
/**
 * {{HOOK_NAME}} - SessionStart
 *
 * {{DESCRIPTION}}
 *
 * Hook: SessionStart
 */

import * as fs from 'fs';
import * as path from 'path';

interface SessionStartInput {
  source?: 'startup' | 'resume' | 'clear' | 'compact';
  type?: 'startup' | 'resume' | 'clear' | 'compact'; // Legacy field
  session_id: string;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main(): Promise<void> {
  let input: SessionStartInput;
  try {
    const stdin = await readStdin();
    input = stdin ? JSON.parse(stdin) : { session_id: 'unknown', source: 'cli' };
  } catch {
    input = { session_id: 'unknown', source: 'cli' };
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  // Support both 'source' (per docs) and 'type' (legacy) fields
  const sessionType = input.source || input.type;

  // ---- CUSTOMIZE: Add your startup logic here ----
  let message = '';
  let additionalContext = '';

  // Example: different behavior based on session type
  // if (sessionType === 'startup') {
  //   message = 'Fresh session started';
  // } else if (sessionType === 'clear' || sessionType === 'compact') {
  //   message = 'Context restored after clear/compact';
  //   additionalContext = 'Relevant state to re-inject...';
  // }

  // Build output
  const output: Record<string, unknown> = { result: 'continue' };

  if (message) {
    output.message = message;
  }

  if (additionalContext) {
    output.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext,
    };
  }

  console.log(JSON.stringify(output));
}

main().catch((err) => {
  console.error(`[{{HOOK_NAME}}] Error: ${err.message}`);
  console.log(JSON.stringify({ result: 'continue' }));
});
```

---

## Template 4: SessionEnd

Runs when a Claude Code session ends. Used for cleanup and state persistence.

**Output contract:**
- `{ "result": "continue" }` = minimum valid output (or `{}`)
- SessionEnd hooks typically do side effects (write files, update DB) rather than inject context.

```typescript
/**
 * {{HOOK_NAME}} - SessionEnd
 *
 * {{DESCRIPTION}}
 *
 * Hook: SessionEnd
 */

import * as fs from 'fs';
import * as path from 'path';

interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main(): Promise<void> {
  let input: SessionEndInput;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    console.log(JSON.stringify({ result: 'continue' }));
    return;
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // ---- CUSTOMIZE: Add your cleanup logic here ----
  // Example: save state, update database, clean temp files
  // try {
  //   const statePath = path.join(os.tmpdir(), `my-hook-${input.session_id}.json`);
  //   if (fs.existsSync(statePath)) {
  //     fs.unlinkSync(statePath);
  //   }
  // } catch (err) {
  //   console.error(`[{{HOOK_NAME}}] Cleanup error: ${err}`);
  // }

  console.log(JSON.stringify({ result: 'continue' }));
}

main().catch((err) => {
  console.error(`[{{HOOK_NAME}}] Error: ${err.message}`);
  console.log(JSON.stringify({ result: 'continue' }));
});
```

---

## Template 5: UserPromptSubmit

Runs when the user submits a prompt. Can inject context or modify behavior.

**Output contract:**
- `{}` = no context to inject
- `{ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "..." } }` = inject context before Claude responds

```typescript
/**
 * {{HOOK_NAME}} - UserPromptSubmit
 *
 * {{DESCRIPTION}}
 *
 * Hook: UserPromptSubmit
 */

import * as fs from 'fs';
import * as path from 'path';

interface UserPromptInput {
  session_id?: string;
  cwd?: string;
  prompt?: string;
  transcript_path?: string;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

async function main(): Promise<void> {
  let input: UserPromptInput = {};

  try {
    const rawInput = (await readStdin()).trim();
    if (rawInput) {
      input = JSON.parse(rawInput);
    }
  } catch {
    console.log('{}');
    return;
  }

  const prompt = input.prompt || '';

  // ---- CUSTOMIZE: Check prompt content and decide whether to inject context ----
  // Example: pattern matching on user's prompt
  // const triggers = /\b(keyword1|keyword2)\b/i;
  // if (!triggers.test(prompt)) {
  //   console.log('{}');
  //   return;
  // }

  // ---- CUSTOMIZE: Build context to inject ----
  const contextToInject = ''; // Replace with actual context

  if (!contextToInject) {
    console.log('{}');
    return;
  }

  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextToInject,
    },
  }));
}

main().catch((err) => {
  console.error(`[{{HOOK_NAME}}] Error: ${err.message}`);
  console.log('{}');
});
```

---

## Settings.json Registration Reference

Each event type has a different registration structure in `~/.claude/settings.json`:

### PreToolUse / PostToolUse (with matcher)

```json
{
  "matcher": "ToolName|OtherTool",
  "hooks": [
    {
      "type": "command",
      "command": "node C:/Users/david.hayes/.claude/hooks/dist/{{HOOK_NAME}}.mjs",
      "timeout": 5000
    }
  ]
}
```

### PreToolUse / PostToolUse (all tools, no matcher)

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node C:/Users/david.hayes/.claude/hooks/dist/{{HOOK_NAME}}.mjs",
      "timeout": 5000
    }
  ]
}
```

### SessionStart / SessionEnd / UserPromptSubmit (no matcher)

These event types do not use matchers. Add the hook entry directly to the hooks array:

```json
{
  "hooks": [
    {
      "type": "command",
      "command": "node C:/Users/david.hayes/.claude/hooks/dist/{{HOOK_NAME}}.mjs",
      "timeout": 5000
    }
  ]
}
```

### Timeout Guidelines

| Hook Type | Typical Timeout |
|-----------|----------------|
| PreToolUse (simple check) | 3000-5000ms |
| PreToolUse (with file I/O) | 5000-10000ms |
| PostToolUse (context inject) | 5000ms |
| PostToolUse (background spawn) | 10000-15000ms |
| SessionStart | 10000-15000ms |
| SessionEnd | 10000-15000ms |
| UserPromptSubmit | 5000-10000ms |

---

## Shared Modules Available

Hooks can import from `./shared/` modules in the hooks/src/ directory:

| Module | Exports | Use Case |
|--------|---------|----------|
| `output.js` | `outputContinue()`, `outputWithMessage()`, `outputBlock()` | Standard JSON output helpers |
| `session-id.js` | `getSessionId()` | Get or derive session ID |
| `db-utils-pg.js` | `registerSession()` | PostgreSQL session coordination |
| `state-schema.js` | `readRalphUnifiedState()` | Ralph state reading |
| `resource-reader.js` | `readResourceState()` | Phase 4 resource management |

Import with `.js` extension (esbuild resolves `.ts` -> `.js` at bundle time):
```typescript
import { outputContinue } from './shared/output.js';
```

---

## Placeholder Tokens

When generating from these templates, replace:
- `{{HOOK_NAME}}` -- kebab-case hook name (e.g., `my-new-hook`)
- `{{TOOL_PATTERN}}` -- tool matcher pattern (e.g., `Edit|Write`, `Bash`, `*`)
- `{{DESCRIPTION}}` -- brief description of what the hook does
