# Hook Developer — Examples & Patterns

---

## Shell Wrapper Patterns

### tsx (development)
```bash
#!/bin/bash
set -e
cd "$CLAUDE_PROJECT_DIR/.claude/hooks"
cat | npx tsx src/my-hook.ts
```

### Bundled ESM (production)
```bash
#!/bin/bash
set -e
cd "$HOME/.claude/hooks"
cat | node dist/my-hook.mjs
```

---

## TypeScript Handler Template

```typescript
import { readFileSync } from 'fs';

interface HookInput {
  session_id: string;
  hook_event_name: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
}

function readStdin(): string {
  return readFileSync(0, 'utf-8');
}

async function main() {
  const input: HookInput = JSON.parse(readStdin());

  // Process input

  const output = {
    decision: 'block',  // or undefined to allow
    reason: 'Why blocking'
  };

  console.log(JSON.stringify(output));
}

main().catch(console.error);
```

---

## Common Hook Patterns

### Block Dangerous Files (PreToolUse, Python)

```python
#!/usr/bin/env python3
import json, sys

data = json.load(sys.stdin)
path = data.get('tool_input', {}).get('file_path', '')

BLOCKED = ['.env', 'secrets.json', '.git/']
if any(b in path for b in BLOCKED):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"Blocked: {path} is protected"
        }
    }))
else:
    print('{}')
```

### Auto-Format Files (PostToolUse, Bash)

```bash
#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE" == *.ts ]] || [[ "$FILE" == *.tsx ]]; then
  npx prettier --write "$FILE" 2>/dev/null
fi

echo '{}'
```

### Inject Git Context (UserPromptSubmit, Bash)

```bash
#!/bin/bash
echo "Git status:"
git status --short 2>/dev/null || echo "(not a git repo)"
echo ""
echo "Recent commits:"
git log --oneline -5 2>/dev/null || echo "(no commits)"
```

### Force Test Verification (Stop, Python)

```python
#!/usr/bin/env python3
import json, sys, subprocess

data = json.load(sys.stdin)

# Prevent infinite loops
if data.get('stop_hook_active'):
    print('{}')
    sys.exit(0)

# Check if tests pass
result = subprocess.run(['npm', 'test'], capture_output=True)
if result.returncode != 0:
    print(json.dumps({
        "decision": "block",
        "reason": "Tests are failing. Please fix before stopping."
    }))
else:
    print('{}')
```

---

## Manual Testing Commands

```bash
# PostToolUse (Write)
echo '{"tool_name":"Write","tool_input":{"file_path":"test.md"},"tool_response":{"success":true},"session_id":"test"}' | \
  .claude/hooks/my-hook.sh

# PreToolUse (Bash)
echo '{"tool_name":"Bash","tool_input":{"command":"ls"},"session_id":"test"}' | \
  .claude/hooks/my-hook.sh

# SessionStart
echo '{"hook_event_name":"SessionStart","source":"startup","session_id":"test"}' | \
  .claude/hooks/session-start.sh

# SessionEnd
echo '{"hook_event_name":"SessionEnd","reason":"clear","session_id":"test"}' | \
  .claude/hooks/session-end.sh

# UserPromptSubmit
echo '{"prompt":"test prompt","session_id":"test"}' | \
  .claude/hooks/prompt-submit.sh
```

---

## Rebuild After TypeScript Edits

```bash
cd .claude/hooks
npx esbuild src/my-hook.ts \
  --bundle --platform=node --format=esm \
  --outfile=dist/my-hook.mjs
```
