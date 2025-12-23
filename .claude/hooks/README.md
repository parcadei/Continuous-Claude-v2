# Hooks

Claude Code hooks that enable skill auto-activation, file tracking, and validation.

**Zero runtime dependencies** - hooks are pre-bundled, just clone and go.

---

## Architecture

```
hooks/
├── src/              # TypeScript source (for development)
├── dist/             # Pre-bundled JS (committed, ready to run)
├── *.sh              # Shell wrappers (call node dist/*.mjs)
├── build.sh          # Rebuild dist/ after modifying src/
└── package.json      # Dev dependencies only (esbuild)
```

**For users:** Just clone the repo. Hooks work immediately.

**For developers:** Edit `src/*.ts`, then run `./build.sh` to rebuild.

---

## What Are Hooks?

Hooks are scripts that run at specific points in Claude's workflow:
- **UserPromptSubmit**: When user submits a prompt
- **PreToolUse**: Before a tool executes
- **PostToolUse**: After a tool completes
- **SessionStart**: When a session starts/resumes
- **SessionEnd**: When a session ends
- **PreCompact**: Before context compaction
- **SubagentStop**: When a subagent completes

**Key insight:** Hooks can modify prompts, block actions, and track state - enabling features Claude can't do alone.

---

## Essential Hooks (Start Here)

### skill-activation-prompt (UserPromptSubmit)

**Purpose:** Automatically suggests relevant skills based on user prompts and file context

**How it works:**
1. Reads `skill-rules.json`
2. Matches user prompt against trigger patterns
3. Checks which files user is working with
4. Injects skill suggestions into Claude's context

**Why it's essential:** This is THE hook that makes skills auto-activate.

**Integration:**
```bash
# Just copy - no npm install needed!
cp -r .claude/hooks your-project/.claude/

# Make shell scripts executable
chmod +x your-project/.claude/hooks/*.sh
```

**Add to settings.json:**
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/skill-activation-prompt.sh"
          }
        ]
      }
    ]
  }
}
```

---

### post-tool-use-tracker (PostToolUse)

**Purpose:** Tracks file changes and build attempts for context management

**How it works:**
1. Monitors Edit/Write/Bash tool calls
2. Records which files were modified
3. Captures build/test pass/fail for reasoning
4. Auto-detects project structure (frontend, backend, packages, etc.)

**Why it's essential:** Helps Claude understand what parts of your codebase are active.

**Add to settings.json:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-tool-use-tracker.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Continuity Hooks

### session-start-continuity (SessionStart)

**Purpose:** Loads continuity ledger on session start/resume/compact

### pre-compact-continuity (PreCompact)

**Purpose:** Auto-creates handoff document before context compaction

### session-end-cleanup (SessionEnd)

**Purpose:** Updates ledger timestamp, cleans old cache

### subagent-stop-continuity (SubagentStop)

**Purpose:** Logs agent output to ledger and cache for resumability

---

## Development

To modify hooks:

```bash
# Edit TypeScript source
vim src/skill-activation-prompt.ts

# Rebuild bundled JS
./build.sh

# Test
echo '{"prompt": "test"}' | ./skill-activation-prompt.sh
```

The `build.sh` script will install dev dependencies (esbuild) if needed.

---

## For Claude Code

**When setting up hooks for a user:**

1. **Copy the hooks directory** - no npm install needed
2. **Make shell scripts executable:** `chmod +x .claude/hooks/*.sh`
3. **Add to settings.json** as shown above
4. **Verify after setup:**
   ```bash
   ls -la .claude/hooks/*.sh | grep rwx
   ```
